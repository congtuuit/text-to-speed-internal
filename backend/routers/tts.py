from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import *
import models
from schemas import *
import os
import tempfile
import time


router = APIRouter()

import json
import requests
import asyncio
from services.queue_manager import queue_manager, fpt_key_rotator, adjust_audio_speed_ffmpeg
from services.tts_provider import TTSProvider
from services.storage_service import get_storage_provider, delete_audio_file
from auth import create_jwt, decode_jwt, hash_password, verify_password
from routers.auth import _current_user_from_request
from services.docx_helper import split_docx_to_txt
import hashlib

def generate_customer_voice_params(seed_input: str, keep_voice_input: str, customer_prefix: str):
    """
    Đảm bảo tính nhất quán của giọng đọc (voice cache) cho từng khách hàng khi gọi Self-hosted TTS.
    Sinh ra seed cố định dựa trên customer_prefix và bật keep_voice=True để request sau gọi lại đúng giọng đó.
    """
    seed_val = int(seed_input) if (seed_input and str(seed_input).strip()) else None
    
    if seed_val is None:
        # Sinh seed duy nhất nhưng cố định theo khách hàng để gọi lại đúng cache voice cũ
        seed_val = int(hashlib.md5(f"customer_{customer_prefix}".encode()).hexdigest(), 16) % 1000000000
        keep_voice_val = True
    else:
        keep_voice_val = str(keep_voice_input).lower() == "true"
        
    return seed_val, keep_voice_val

@router.post("/api/test-voice")
def test_voice(req: TestVoiceRequest, background_tasks: BackgroundTasks):
    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Văn bản vượt quá giới hạn 2000 ký tự.")
        
    import hashlib
    import shutil
    
    # Kiểm tra Cache (Chỉ cache nếu là sample từ thư viện)
    cache_file = None
    if req.is_sample:
        cache_dir = "cache/test_voice"
        os.makedirs(cache_dir, exist_ok=True)
        raw_key = f"{req.provider}_{req.voice}_{req.output_speed}_{req.seed}_{req.text}"
        cache_key = hashlib.md5(raw_key.encode('utf-8')).hexdigest()
        cache_file = os.path.join(cache_dir, f"{cache_key}.wav")
        
        if os.path.exists(cache_file):
            return FileResponse(cache_file, media_type="audio/wav")
        
    # Tạo file tạm thời duy nhất để tránh xung đột khi gọi liên tục
    fd, temp_file = tempfile.mkstemp(suffix=".wav", prefix="tts_")
    os.close(fd)
    
    def cleanup():
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except:
            pass
            
    try:
        if req.provider == "fpt":
            from services.queue_manager import process_fpt_tts
            keys = [k.split('|')[1].strip() if '|' in k else k.strip() for k in req.fpt_api_keys.split('\n') if k.strip()]
            success = process_fpt_tts(req.text, temp_file, req.voice, req.fpt_speed, keys)
        elif req.provider == "self_hosted":
            from services.queue_manager import process_self_hosted_tts
            cleaned_voice = req.voice
            presets = {"female", "male", "female, low pitch", "female, high pitch", "male, low pitch", "male, high pitch"}
            if cleaned_voice not in presets and not (cleaned_voice and cleaned_voice.startswith("voice_")):
                cleaned_voice = "female"
            url = f"{req.self_hosted_url.rstrip('/')}/api/tts"
            
            # Parse seed and keep_voice parameters
            seed_val, keep_voice_val = generate_customer_voice_params(req.seed, req.keep_voice, customer_prefix="test_voice")
            
            success = process_self_hosted_tts(
                text=req.text,
                output_path=temp_file,
                voice=cleaned_voice,
                url=url,
                seed_val=seed_val,
                keep_voice_val=keep_voice_val,
                worker_name="TestVoice"
            )
        else:
            provider = TTSProvider(api_key=req.api_key)
            success = provider.process_text_to_speech(req.text, temp_file, req.voice, req.model_name)
    except Exception as e:
        cleanup()
        raise HTTPException(status_code=500, detail=str(e))
    
    if not success or not os.path.exists(temp_file):
        cleanup()
        if req.provider == "gemini":
            error_msg = "Failed to generate Gemini TTS audio. Check backend logs."
        elif req.provider == "self_hosted":
            error_msg = "Failed to generate Self-hosted TTS audio. Make sure the model server is running."
        else:
            error_msg = "Lỗi tạo audio. Vui lòng kiểm tra log backend."
        raise HTTPException(status_code=500, detail=error_msg)
        
    if req.output_speed != 1.0:
        temp_speed_file = temp_file + ".speed.wav"
        if adjust_audio_speed_ffmpeg(temp_file, temp_speed_file, req.output_speed):
            import shutil
            shutil.move(temp_speed_file, temp_file)
        else:
            if os.path.exists(temp_speed_file):
                os.remove(temp_speed_file)
                
    # Lưu vào cache
    if cache_file and os.path.exists(temp_file):
        try:
            shutil.copy2(temp_file, cache_file)
        except Exception as e:
            print(f"Cache save error: {e}")
        
    background_tasks.add_task(cleanup)
    return FileResponse(temp_file, media_type="audio/wav")


class ChunkSessionRequest(TestVoiceRequest):
    session_id: str
    chunk_index: int

class MergeSessionRequest(BaseModel):
    session_id: str


@router.post("/api/tts/chunk")
def tts_chunk(req: ChunkSessionRequest, background_tasks: BackgroundTasks):
    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Chunk vượt quá giới hạn.")
        
    import os
    import tempfile
    
    session_dir = os.path.join("cache", "sessions", req.session_id)
    os.makedirs(session_dir, exist_ok=True)
    temp_file = os.path.join(session_dir, f"{req.chunk_index}.wav")
    
    # Generate TTS
    try:
        if req.provider == "fpt":
            from services.queue_manager import process_fpt_tts
            keys = [k.split('|')[1].strip() if '|' in k else k.strip() for k in req.fpt_api_keys.split('\n') if k.strip()]
            success = process_fpt_tts(req.text, temp_file, req.voice, req.fpt_speed, keys)
        elif req.provider == "self_hosted":
            from services.queue_manager import process_self_hosted_tts
            cleaned_voice = req.voice
            presets = {"female", "male", "female, low pitch", "female, high pitch", "male, low pitch", "male, high pitch"}
            if cleaned_voice not in presets and not (cleaned_voice and cleaned_voice.startswith("voice_")):
                cleaned_voice = "female"
            url = f"{req.self_hosted_url.rstrip('/')}/api/tts"
            
            seed_val, keep_voice_val = generate_customer_voice_params(req.seed, req.keep_voice, customer_prefix=req.session_id)

            
            success = process_self_hosted_tts(
                text=req.text,
                output_path=temp_file,
                voice=cleaned_voice,
                url=url,
                seed_val=seed_val,
                keep_voice_val=keep_voice_val,
                worker_name=f"TTSChunk-{req.chunk_index}"
            )
        else:
            provider = TTSProvider(api_key=req.api_key)
            success = provider.process_text_to_speech(req.text, temp_file, req.voice, req.model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    if not success or not os.path.exists(temp_file):
        raise HTTPException(status_code=500, detail="Failed to generate chunk.")
        
    if req.output_speed != 1.0:
        temp_speed_file = temp_file + ".speed.wav"
        if adjust_audio_speed_ffmpeg(temp_file, temp_speed_file, req.output_speed):
            import shutil
            shutil.move(temp_speed_file, temp_file)
        else:
            if os.path.exists(temp_speed_file):
                os.remove(temp_speed_file)
                
    return {"status": "ok"}


@router.post("/api/tts/merge")
def tts_merge(req: MergeSessionRequest):
    import os
    import wave
    
    session_dir = os.path.join("cache", "sessions", req.session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get all chunk files sorted
    files = [f for f in os.listdir(session_dir) if f.endswith(".wav")]
    files.sort(key=lambda x: int(x.split('.')[0]))
    
    if not files:
        raise HTTPException(status_code=400, detail="No audio chunks found")
        
    output_path = os.path.join(session_dir, "merged.wav")
    
    try:
        data = []
        params = None
        for f in files:
            audio_file = os.path.join(session_dir, f)
            with wave.open(audio_file, 'rb') as w:
                if not params:
                    params = w.getparams()
                data.append(w.readframes(w.getnframes()))
        with wave.open(output_path, 'wb') as output_wav:
            output_wav.setparams(params)
            for d in data:
                output_wav.writeframes(d)
                
        # Dọn dẹp thư mục sau 60 phút
        import threading
        import time

        import shutil
        def cleanup_session():
            time.sleep(3600)  # 60 phút
            try:
                shutil.rmtree(session_dir)
            except:
                pass
        t = threading.Thread(target=cleanup_session)
        t.daemon = True
        t.start()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Merge error: {e}")
        
    return FileResponse(output_path, media_type="audio/wav")
class CheckConnectionRequest(BaseModel):
    self_hosted_url: str

class SettingsRequest(BaseModel):
    api_key: str = ""
    model_name: str = ""
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    self_hosted_voice: str = "female"
    self_hosted_seed: str = ""
    self_hosted_keep_voice: str = "false"
    output_speed: float = 1.0


@router.post("/api/settings")
def update_settings(req: SettingsRequest, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    user_id = user.id if user else None

    user_specific_keys = {"output_speed", "self_hosted_voice", "self_hosted_seed"}

    for k, v in [
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
        ("output_speed", str(req.output_speed))
    ]:
        db_key = f"{user_id}_{k}" if (k in user_specific_keys and user_id) else k
        setting = db.query(models.Settings).filter(models.Settings.key == db_key).first()
        if not setting:
            setting = models.Settings(key=db_key, value=v, owner_id=user_id if k in user_specific_keys else None)
            db.add(setting)
        else:
            setting.value = v
    db.commit()
    queue_manager.set_workers(req.max_workers)

    # Reload FPT key rotator khi settings thay đổi
    if req.fpt_api_keys:
        keys = [
            k.split('|')[1].strip() if '|' in k else k.strip()
            for k in req.fpt_api_keys.split('\n')
            if k.strip()
        ]
        fpt_key_rotator.load(keys)

    # Resume queue in case it was paused due to quota/api key error
    queue_manager.resume()

    return {"status": "ok"}


@router.get("/api/settings")
def get_settings(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    user_id = user.id if user else None

    api_key_setting = db.query(models.Settings).filter(models.Settings.key == "api_key").first()
    model_name_setting = db.query(models.Settings).filter(models.Settings.key == "model_name").first()
    provider_setting = db.query(models.Settings).filter(models.Settings.key == "provider").first()
    fpt_api_keys_setting = db.query(models.Settings).filter(models.Settings.key == "fpt_api_keys").first()
    fpt_speed_setting = db.query(models.Settings).filter(models.Settings.key == "fpt_speed").first()
    max_workers_setting = db.query(models.Settings).filter(models.Settings.key == "max_workers").first()
    self_hosted_url_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    self_hosted_keep_voice_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_keep_voice").first()
    
    # Query user-specific settings first
    def get_user_setting(key, fallback_val=""):
        res = None
        if user_id:
            res = db.query(models.Settings).filter(models.Settings.key == f"{user_id}_{key}").first()
        if not res:
            res = db.query(models.Settings).filter(models.Settings.key == key).first()
        return res.value if res else fallback_val
    
    self_hosted_voice_val = get_user_setting("self_hosted_voice", "female")
    self_hosted_seed_val = get_user_setting("self_hosted_seed", "")
    output_speed_val = float(get_user_setting("output_speed", "1.0"))
    
    provider_val = provider_setting.value if provider_setting else "self_hosted"
    if provider_val == "vieneu":
        provider_val = "self_hosted"
                
    return {
        "api_key": api_key_setting.value if api_key_setting else "",
        "model_name": model_name_setting.value if model_name_setting else "gemini-2.5-flash-preview-tts",
        "provider": provider_val,
        "fpt_api_keys": fpt_api_keys_setting.value if fpt_api_keys_setting else "",
        "fpt_speed": float(fpt_speed_setting.value) if fpt_speed_setting else 0.8,
        "max_workers": int(max_workers_setting.value) if max_workers_setting else 3,
        "self_hosted_url": self_hosted_url_setting.value if self_hosted_url_setting else "http://localhost:7860",
        "self_hosted_voice": self_hosted_voice_val,
        "self_hosted_seed": self_hosted_seed_val,
        "self_hosted_keep_voice": self_hosted_keep_voice_setting.value if self_hosted_keep_voice_setting else "false",
        "output_speed": output_speed_val
    }
@router.get("/api/self-hosted/config")
def get_self_hosted_config(db: Session = Depends(get_db)):
    url_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    voice_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_voice").first()
    seed_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_seed").first()
    keep_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_keep_voice").first()

    return {
        "url": url_setting.value if url_setting else "http://localhost:7860",
        "voice": voice_setting.value if voice_setting else "female",
        "seed": seed_setting.value if seed_setting else "",
        "keep_voice": keep_setting.value if keep_setting else "false"
    }


@router.post("/api/self-hosted/warmup")
def warmup_self_hosted_voice(req: WarmupRequest, background_tasks: BackgroundTasks):
    def do_warmup():
        try:
            from services.queue_manager import process_self_hosted_tts
            import tempfile
            import os
            cleaned_voice = req.voice
            presets = {"female", "male", "female, low pitch", "female, high pitch", "male, low pitch", "male, high pitch"}
            if cleaned_voice not in presets and not (cleaned_voice and cleaned_voice.startswith("voice_")):
                cleaned_voice = "female"
            url = f"{req.self_hosted_url.rstrip('/')}/api/tts"
            
            seed_val, keep_voice_val = generate_customer_voice_params(req.seed, req.keep_voice, customer_prefix="test_voice")
            
            fd, tmp = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            try:
                process_self_hosted_tts(
                    text=req.text,
                    output_path=tmp,
                    voice=cleaned_voice,
                    url=url,
                    seed_val=seed_val,
                    keep_voice_val=keep_voice_val,
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


@router.get("/api/models")
def get_models(api_key: str = None, db: Session = Depends(get_db)):
    key_to_use = api_key
    if not key_to_use:
        setting = db.query(models.Settings).filter(models.Settings.key == "api_key").first()
        if setting:
            key_to_use = setting.value
    
    if not key_to_use:
        return {"models": []}
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key_to_use}"
        res = requests.get(url)
        if res.status_code == 200:
            data = res.json()
            tts_models = [
                m for m in data.get("models", []) 
                if 'tts' in m.get("name", "").lower() or 'generateAudio' in m.get("supportedGenerationMethods", [])
            ]
            return {"models": tts_models}
        return {"models": []}
    except Exception as e:
        return {"models": []}


@router.get("/api/voices")
def get_voices(provider: str = "fpt", self_hosted_url: str = None, db: Session = Depends(get_db)):
    if provider == "fpt":
        return [
            {"id": "banmai", "name": "Ban Mai (Nữ miền Bắc)"},
            {"id": "leminh", "name": "Lê Minh (Nam miền Bắc)"},
            {"id": "thuminh", "name": "Thu Minh (Nữ miền Bắc)"},
            {"id": "minhquang", "name": "Minh Quang (Nam miền Nam)"},
            {"id": "myan", "name": "Mỹ An (Nữ miền Trung)"},
            {"id": "linhsan", "name": "Linh San (Nữ miền Nam)"},
            {"id": "giahuy", "name": "Gia Huy (Nam miền Trung)"},
            {"id": "lannhi", "name": "Lan Nhi (Nữ miền Nam)"},
            {"id": "ngoclam", "name": "Ngọc Lam (Nữ miền Trung)"}
        ]

    if provider == "self_hosted":
        return [
            {"id": "female", "name": "Nữ, giọng mặc định"},
            {"id": "male", "name": "Nam, giọng mặc định"},
            {"id": "female, low pitch", "name": "Nữ, giọng trầm"},
            {"id": "female, high pitch", "name": "Nữ, giọng cao"},
            {"id": "male, low pitch", "name": "Nam, giọng trầm"},
            {"id": "male, high pitch", "name": "Nam, giọng cao"}
        ]

    return [
        {"id": "Puck", "name": "Puck (Nam - Vui vẻ, năng động)"},
        {"id": "Charon", "name": "Charon (Nam - Trầm ấm, mạnh mẽ)"},
        {"id": "Kore", "name": "Kore (Nữ - Thanh thoát, dịu dàng)"},
        {"id": "Fenrir", "name": "Fenrir (Nam - Trầm, cá tính)"},
        {"id": "Aoede", "name": "Aoede (Nữ - Trầm ấm, nội lực)"}
    ]
