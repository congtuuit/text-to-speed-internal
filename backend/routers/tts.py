from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import *
import models
from schemas import (
    TestVoiceRequest, ChunkSessionRequest, MergeSessionRequest,
    WarmupRequest, CheckConnectionRequest, SettingsRequest
)
import os
import shutil
import tempfile
import time
import threading
import json
import requests
import hashlib
from datetime import datetime, timedelta

from services.queue_manager import queue_manager, fpt_key_rotator, adjust_audio_speed_ffmpeg
from services.queue_manager import process_fpt_tts, process_self_hosted_tts
from services.tts_provider import TTSProvider
from services.storage_service import get_storage_provider, delete_audio_file, register_audio_file
from services.audio_merge import merge_wav_files_with_crossfade
from utils.audio_utils import convert_wav_to_mp3_ffmpeg
from auth import create_jwt, decode_jwt, hash_password, verify_password
from routers.auth import _current_user_from_request
from routers.billing import check_quota, record_usage, _get_or_create_subscription, get_monthly_usage

router = APIRouter()


# ---------------------------------------------------------------------------
# Constants & Helpers
# ---------------------------------------------------------------------------

SELF_HOSTED_PRESETS = {
    "female", "male",
    "female, low pitch", "female, high pitch",
    "male, low pitch", "male, high pitch",
}


def _get_self_hosted_url(db) -> str:
    """Lấy URL self-hosted TTS endpoint từ DB settings."""
    s = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    base = s.value if s else "http://localhost:7860"
    return f"{base.rstrip('/')}/api/tts"


def _clean_self_hosted_voice(voice: str) -> str:
    """Chuẩn hoá voice cho self-hosted, fallback về 'female' nếu không hợp lệ."""
    if voice in SELF_HOSTED_PRESETS or (voice and voice.startswith("voice_")):
        return voice
    return "female"


def generate_customer_voice_params(seed_input: str, keep_voice_input: str, customer_prefix: str):
    """
    Đảm bảo tính nhất quán của giọng đọc (voice cache) cho từng khách hàng khi gọi Self-hosted TTS.
    Sinh ra seed cố định dựa trên customer_prefix và bật keep_voice=True để request sau gọi lại đúng giọng đó.
    """
    seed_val = int(seed_input) if (seed_input and str(seed_input).strip()) else None

    if seed_val is None:
        seed_val = int(hashlib.md5(f"customer_{customer_prefix}".encode()).hexdigest(), 16) % 1000000000
        keep_voice_val = True
    else:
        keep_voice_val = str(keep_voice_input).lower() == "true"

    return seed_val, keep_voice_val


def _dispatch_tts(req: TestVoiceRequest, output_path: str, db, worker_name: str) -> bool:
    """
    Gọi TTS engine dựa trên req.provider.
    Dùng chung cho test-voice, create-audio và tts/chunk.
    """
    if req.provider == "fpt":
        keys = [
            k.split('|')[1].strip() if '|' in k else k.strip()
            for k in req.fpt_api_keys.split('\n') if k.strip()
        ]
        return process_fpt_tts(req.text, output_path, req.voice, req.fpt_speed, keys)

    if req.provider == "self_hosted":
        url = _get_self_hosted_url(db)
        voice = _clean_self_hosted_voice(req.voice)
        seed_val, keep_voice_val = generate_customer_voice_params(
            req.seed, req.keep_voice,
            customer_prefix=getattr(req, "session_id", worker_name)
        )
        return process_self_hosted_tts(
            text=req.text,
            output_path=output_path,
            voice=voice,
            url=url,
            seed_val=seed_val,
            keep_voice_val=keep_voice_val,
            worker_name=worker_name,
        )

    # Gemini (default)
    provider = TTSProvider(api_key=req.api_key)
    return provider.process_text_to_speech(req.text, output_path, req.voice, req.model_name)


def _apply_speed(wav_path: str, speed: float) -> None:
    """Điều chỉnh tốc độ audio in-place nếu speed != 1.0."""
    if speed == 1.0:
        return
    tmp = wav_path + ".speed.wav"
    if adjust_audio_speed_ffmpeg(wav_path, tmp, speed):
        shutil.move(tmp, wav_path)
    elif os.path.exists(tmp):
        os.remove(tmp)


def _wav_to_mp3(wav_path: str) -> str:
    """Convert WAV sang MP3, trả về path của file kết quả."""
    mp3_path = wav_path.replace(".wav", ".mp3")
    if convert_wav_to_mp3_ffmpeg(wav_path, mp3_path):
        try:
            os.remove(wav_path)
        except Exception:
            pass
        return mp3_path
    return wav_path


def _tts_error_msg(provider: str) -> str:
    if provider == "gemini":
        return "Failed to generate Gemini TTS audio. Check backend logs."
    if provider == "self_hosted":
        return "Failed to generate Self-hosted TTS audio. Make sure the model server is running."
    return "Lỗi tạo audio. Vui lòng kiểm tra log backend."


def find_matching_system_voice(text: str, voice: str, seed: str):
    """Tìm file audio đã cache trong common_voices, tránh generate lại."""
    dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "common_voices")
    if not os.path.exists(dir_path):
        dir_path = "backend/common_voices"
        if not os.path.exists(dir_path):
            return None

    text_norm = "".join(text.split()).lower()
    for file_name in os.listdir(dir_path):
        if not file_name.endswith("-meta.txt"):
            continue
        try:
            with open(os.path.join(dir_path, file_name), "r", encoding="utf-8") as f:
                data = json.load(f)
            meta_norm = "".join(data.get("text", "").split()).lower()
            if (data.get("voice") == voice
                    and str(data.get("seed")) == str(seed)
                    and text_norm == meta_norm):
                audio_path = os.path.join(dir_path, file_name.replace("-meta.txt", ".wav"))
                if os.path.exists(audio_path):
                    return audio_path
        except Exception:
            pass
    return None


def _upsert_setting(db, key: str, value: str, owner_id=None):
    """Tạo hoặc cập nhật một Settings record."""
    s = db.query(models.Settings).filter(models.Settings.key == key).first()
    if s:
        s.value = value
    else:
        db.add(models.Settings(key=key, value=value, owner_id=owner_id))


def _get_setting(db, key: str, fallback: str = "") -> str:
    s = db.query(models.Settings).filter(models.Settings.key == key).first()
    return s.value if s else fallback


def _get_user_setting(db, user_id, key: str, fallback: str = "") -> str:
    """Ưu tiên setting theo user_id, fallback về global."""
    if user_id:
        s = db.query(models.Settings).filter(models.Settings.key == f"{user_id}_{key}").first()
        if s:
            return s.value
    return _get_setting(db, key, fallback)


# ---------------------------------------------------------------------------
# Endpoints: Audio Generation
# ---------------------------------------------------------------------------

@router.post("/api/test-voice")
def test_voice(req: TestVoiceRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    # Cache hit: common_voices
    matching_audio = find_matching_system_voice(req.text, req.voice, req.seed)
    if matching_audio:
        return FileResponse(matching_audio, media_type="audio/wav")

    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Văn bản vượt quá giới hạn 2000 ký tự.")

    # Cache hit: test_voice cache
    cache_file_base = None
    if req.is_sample:
        cache_dir = "cache/test_voice"
        os.makedirs(cache_dir, exist_ok=True)
        raw_key = f"{req.provider}_{req.voice}_{req.output_speed}_{req.seed}_{req.text}"
        cache_key = hashlib.md5(raw_key.encode("utf-8")).hexdigest()
        cache_file_base = os.path.join(cache_dir, cache_key)
        for ext, mime in [(".mp3", "audio/mpeg"), (".wav", "audio/wav")]:
            if os.path.exists(f"{cache_file_base}{ext}"):
                return FileResponse(f"{cache_file_base}{ext}", media_type=mime)

    fd, temp_file = tempfile.mkstemp(suffix=".wav", prefix="tts_")
    os.close(fd)

    def cleanup():
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except Exception:
            pass

    try:
        success = _dispatch_tts(req, temp_file, db, worker_name="TestVoice")
    except Exception as e:
        cleanup()
        raise HTTPException(status_code=500, detail=str(e))

    if not success or not os.path.exists(temp_file):
        cleanup()
        raise HTTPException(status_code=500, detail=_tts_error_msg(req.provider))

    _apply_speed(temp_file, req.output_speed)
    final_serve_file = _wav_to_mp3(temp_file)
    wav_deleted = final_serve_file != temp_file

    if cache_file_base and os.path.exists(final_serve_file):
        ext = ".mp3" if final_serve_file.endswith(".mp3") else ".wav"
        try:
            shutil.copy2(final_serve_file, f"{cache_file_base}{ext}")
        except Exception as e:
            print(f"Cache save error: {e}")

    if not wav_deleted:
        background_tasks.add_task(cleanup)
    if final_serve_file.endswith(".mp3"):
        mp3_tmp = final_serve_file
        def _cleanup_mp3():
            try:
                if os.path.exists(mp3_tmp):
                    os.remove(mp3_tmp)
            except Exception:
                pass
        background_tasks.add_task(_cleanup_mp3)

    media_type = "audio/mpeg" if final_serve_file.endswith(".mp3") else "audio/wav"
    return FileResponse(final_serve_file, media_type=media_type)


@router.post("/api/create-audio")
def create_audio(req: TestVoiceRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    sub = _get_or_create_subscription(user, db)
    max_chars = 5000
    if sub.plan_id != "free":
        if sub.chars_limit == -1:
            # Unlimited plan, but still limit to 20000 chars per request to prevent abuse
            max_chars = 20000
        else:
            used = get_monthly_usage(user.id, db)
            remaining = sub.chars_limit - used
            # Limit max_chars to 20000 even if remaining is higher, to prevent abuse
            max_chars = min(max(remaining, 0), 20000)

    if len(req.text) > max_chars:
        raise HTTPException(status_code=400, detail=f"Văn bản vượt quá giới hạn {max_chars} ký tự cho phép của gói hiện tại.")

    check_quota(user, len(req.text), db)

    fd, temp_file = tempfile.mkstemp(suffix=".wav", prefix="tts_")
    os.close(fd)

    def cleanup():
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except Exception:
            pass

    try:
        success = _dispatch_tts(req, temp_file, db, worker_name="CreateAudio")
    except Exception as e:
        cleanup()
        raise HTTPException(status_code=500, detail=str(e))

    if not success or not os.path.exists(temp_file):
        cleanup()
        raise HTTPException(status_code=500, detail=_tts_error_msg(req.provider))

    _apply_speed(temp_file, req.output_speed)
    print(f"[CreateAudio] Converting to MP3...")
    final_serve_file = _wav_to_mp3(temp_file)
    wav_deleted = final_serve_file != temp_file

    audio = None
    try:
        audio = register_audio_file(
            source_path=final_serve_file,
            file_name=f"create_{os.path.basename(final_serve_file)}",
            db=db,
            owner_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
    except Exception as reg_err:
        print(f"[CreateAudio] Warning: Failed to register audio in library: {reg_err}")

    record_usage(user.id, len(req.text), "create-audio", db)

    if not wav_deleted:
        background_tasks.add_task(cleanup)
    if audio and final_serve_file.endswith(".mp3"):
        mp3_tmp = final_serve_file
        def _cleanup_mp3():
            try:
                if os.path.exists(mp3_tmp):
                    os.remove(mp3_tmp)
            except Exception:
                pass
        background_tasks.add_task(_cleanup_mp3)

    serve_path = audio.file_path if audio else final_serve_file
    media_type = "audio/mpeg" if serve_path.endswith(".mp3") else "audio/wav"
    return FileResponse(serve_path, media_type=media_type)


@router.post("/api/tts/chunk")
def tts_chunk(req: ChunkSessionRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")
    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Chunk vượt quá giới hạn.")

    check_quota(user, len(req.text), db)

    session_dir = os.path.join("cache", "sessions", req.session_id)
    os.makedirs(session_dir, exist_ok=True)
    temp_file = os.path.join(session_dir, f"{req.chunk_index}.wav")

    try:
        success = _dispatch_tts(req, temp_file, db, worker_name=f"TTSChunk-{req.chunk_index}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not success or not os.path.exists(temp_file):
        raise HTTPException(status_code=500, detail="Failed to generate chunk.")

    _apply_speed(temp_file, req.output_speed)
    record_usage(user.id, len(req.text), "generate", db)
    return {"status": "ok"}


@router.post("/api/tts/merge")
def tts_merge(req: MergeSessionRequest, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    session_dir = os.path.join("cache", "sessions", req.session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Session not found")

    files = sorted(
        [f for f in os.listdir(session_dir) if f.endswith(".wav") and f != "merged.wav"],
        key=lambda x: int(x.split('.')[0])
    )
    if not files:
        raise HTTPException(status_code=400, detail="No audio chunks found")

    output_path = os.path.join(session_dir, "merged.wav")
    try:
        merge_wav_files_with_crossfade([os.path.join(session_dir, f) for f in files], output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Merge error: {e}")

    final_serve_file = _wav_to_mp3(output_path)

    serve_path = final_serve_file
    try:
        ext = ".mp3" if final_serve_file.endswith(".mp3") else ".wav"
        audio = register_audio_file(
            source_path=final_serve_file,
            file_name=f"merge_{req.session_id}{ext}",
            db=db,
            owner_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        serve_path = audio.file_path
    except Exception as reg_err:
        print(f"[TTSMerge] Warning: Failed to register audio in library: {reg_err}")

    # Dọn dẹp session sau 60 phút
    def _cleanup_session():
        time.sleep(3600)
        try:
            shutil.rmtree(session_dir)
        except Exception:
            pass
    t = threading.Thread(target=_cleanup_session, daemon=True)
    t.start()

    media_type = "audio/mpeg" if serve_path.endswith(".mp3") else "audio/wav"
    return FileResponse(serve_path, media_type=media_type)


# ---------------------------------------------------------------------------
# Endpoints: Settings
# ---------------------------------------------------------------------------

@router.post("/api/settings")
def update_settings(req: SettingsRequest, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    user_id = user.id if user else None

    user_specific_keys = {"output_speed", "self_hosted_voice", "self_hosted_seed", "auto_retry"}
    fields = [
        ("api_key", req.api_key),
        ("model_name", req.model_name),
        ("provider", req.provider),
        ("fpt_api_keys", req.fpt_api_keys),
        ("fpt_speed", str(req.fpt_speed)),
        ("max_workers", str(req.max_workers)),
        ("self_hosted_url", req.self_hosted_url),
        ("self_hosted_voice", req.self_hosted_voice),
        ("self_hosted_seed", req.self_hosted_seed),
        ("self_hosted_keep_voice", req.self_hosted_keep_voice),
        ("output_speed", str(req.output_speed)),
        ("auto_retry", req.auto_retry),
    ]
    for k, v in fields:
        db_key = f"{user_id}_{k}" if (k in user_specific_keys and user_id) else k
        owner = user_id if k in user_specific_keys else None
        _upsert_setting(db, db_key, v, owner_id=owner)
    db.commit()

    queue_manager.set_workers(req.max_workers)
    if req.fpt_api_keys:
        keys = [
            k.split('|')[1].strip() if '|' in k else k.strip()
            for k in req.fpt_api_keys.split('\n') if k.strip()
        ]
        fpt_key_rotator.load(keys)
    queue_manager.resume()
    return {"status": "ok"}


@router.get("/api/settings")
def get_settings(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    user_id = user.id if user else None

    provider_val = _get_setting(db, "provider", "self_hosted")
    if provider_val == "vieneu":
        provider_val = "self_hosted"

    return {
        "api_key":              _get_setting(db, "api_key"),
        "model_name":           _get_setting(db, "model_name", "gemini-2.5-flash-preview-tts"),
        "provider":             provider_val,
        "fpt_api_keys":         _get_setting(db, "fpt_api_keys"),
        "fpt_speed":            float(_get_setting(db, "fpt_speed", "0.8")),
        "max_workers":          int(_get_setting(db, "max_workers", "3")),
        "self_hosted_url":      _get_setting(db, "self_hosted_url", "http://localhost:7860"),
        "self_hosted_voice":    _get_user_setting(db, user_id, "self_hosted_voice", "female"),
        "self_hosted_seed":     _get_user_setting(db, user_id, "self_hosted_seed"),
        "self_hosted_keep_voice": _get_setting(db, "self_hosted_keep_voice", "false"),
        "output_speed":         float(_get_user_setting(db, user_id, "output_speed", "1.0")),
        "auto_retry":           _get_user_setting(db, user_id, "auto_retry", "false"),
    }


@router.get("/api/self-hosted/config")
def get_self_hosted_config(db: Session = Depends(get_db)):
    return {
        "url":        _get_setting(db, "self_hosted_url", "http://localhost:7860"),
        "voice":      _get_setting(db, "self_hosted_voice", "female"),
        "seed":       _get_setting(db, "self_hosted_seed"),
        "keep_voice": _get_setting(db, "self_hosted_keep_voice", "false"),
    }


# ---------------------------------------------------------------------------
# Endpoints: Self-hosted Utilities
# ---------------------------------------------------------------------------

@router.post("/api/self-hosted/warmup")
def warmup_self_hosted_voice(req: WarmupRequest, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    user_id = user.id if user else None

    if user_id:
        for k, v in [
            ("self_hosted_voice", req.voice),
            ("self_hosted_seed", req.seed),
            ("output_speed", str(req.speed)),
        ]:
            _upsert_setting(db, f"{user_id}_{k}", v, owner_id=user_id)
        db.commit()

    def do_warmup():
        try:
            voice = _clean_self_hosted_voice(req.voice)
            _db = SessionLocal()
            url = _get_self_hosted_url(_db)
            _db.close()
            seed_val, keep_voice_val = generate_customer_voice_params(req.seed, req.keep_voice, customer_prefix="test_voice")
            fd, tmp = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            try:
                process_self_hosted_tts(
                    text=req.text, output_path=tmp, voice=voice,
                    url=url, seed_val=seed_val, keep_voice_val=keep_voice_val,
                    worker_name="WarmupVoice"
                )
            finally:
                if os.path.exists(tmp):
                    os.remove(tmp)
        except Exception as e:
            print(f"Warmup voice error: {e}")

    background_tasks.add_task(do_warmup)
    return {"status": "ok"}


@router.post("/api/self-hosted/check-connection")
def check_self_hosted_connection(req: CheckConnectionRequest):
    url = f"{req.self_hosted_url.rstrip('/')}/api/health"
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return {"success": True, "data": res.json()}
        return {"success": False, "detail": f"HTTP {res.status_code}: {res.text}"}
    except Exception as e:
        return {"success": False, "detail": str(e)}


# ---------------------------------------------------------------------------
# Endpoints: Voice & Model Lists
# ---------------------------------------------------------------------------

@router.get("/api/models")
def get_models(api_key: str = None, db: Session = Depends(get_db)):
    key_to_use = api_key or _get_setting(db, "api_key")
    if not key_to_use:
        return {"models": []}
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key_to_use}"
        res = requests.get(url)
        if res.status_code == 200:
            tts_models = [
                m for m in res.json().get("models", [])
                if 'tts' in m.get("name", "").lower()
                or 'generateAudio' in m.get("supportedGenerationMethods", [])
            ]
            return {"models": tts_models}
    except Exception:
        pass
    return {"models": []}


@router.get("/api/voices")
def get_voices(provider: str = "fpt", self_hosted_url: str = None, db: Session = Depends(get_db)):
    if provider == "fpt":
        return [
            {"id": "banmai",    "name": "Ban Mai (Nữ miền Bắc)"},
            {"id": "leminh",    "name": "Lê Minh (Nam miền Bắc)"},
            {"id": "thuminh",   "name": "Thu Minh (Nữ miền Bắc)"},
            {"id": "minhquang", "name": "Minh Quang (Nam miền Nam)"},
            {"id": "myan",      "name": "Mỹ An (Nữ miền Trung)"},
            {"id": "linhsan",   "name": "Linh San (Nữ miền Nam)"},
            {"id": "giahuy",    "name": "Gia Huy (Nam miền Trung)"},
            {"id": "lannhi",    "name": "Lan Nhi (Nữ miền Nam)"},
            {"id": "ngoclam",   "name": "Ngọc Lam (Nữ miền Trung)"},
        ]
    if provider == "self_hosted":
        return [
            {"id": "female",           "name": "Nữ, giọng mặc định"},
            {"id": "male",             "name": "Nam, giọng mặc định"},
            {"id": "female, low pitch","name": "Nữ, giọng trầm"},
            {"id": "female, high pitch","name": "Nữ, giọng cao"},
            {"id": "male, low pitch",  "name": "Nam, giọng trầm"},
            {"id": "male, high pitch", "name": "Nam, giọng cao"},
        ]
    return [
        {"id": "Puck",   "name": "Puck (Nam - Vui vẻ, năng động)"},
        {"id": "Charon", "name": "Charon (Nam - Trầm ấm, mạnh mẽ)"},
        {"id": "Kore",   "name": "Kore (Nữ - Thanh thoát, dịu dàng)"},
        {"id": "Fenrir", "name": "Fenrir (Nam - Trầm, cá tính)"},
        {"id": "Aoede",  "name": "Aoede (Nữ - Trầm ấm, nội lực)"},
    ]
