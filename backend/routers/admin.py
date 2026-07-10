from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, BatchJob, FileTask, Settings, GeneratedAudio
import models
from routers.auth import _current_user_from_request
from services.queue_manager import queue_manager
import psutil
import requests
import os
import shutil

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(request: Request, db: Session):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập quản trị")
    return user

@router.get("/users")
def list_users(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    users = db.query(User).all()
    
    result = []
    for u in users:
        # Count stats for each user
        jobs_count = db.query(BatchJob).filter(models.BatchJob.owner_id == u.id).count()
        audios_count = db.query(GeneratedAudio).filter(GeneratedAudio.owner_id == u.id).count()
        from datetime import datetime
        is_online = False
        if u.last_active_at:
            is_online = (datetime.utcnow() - u.last_active_at).total_seconds() < 300 # 5 minutes

        # Get subscription
        sub = db.query(models.UserSubscription).filter(models.UserSubscription.user_id == u.id).first()
        plan_id = sub.plan_id if sub else "free"

        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "plan_id": plan_id,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "last_active_at": u.last_active_at.isoformat() if u.last_active_at else None,
            "is_online": is_online,
            "jobs_count": jobs_count,
            "audios_count": audios_count
        })
    return {"users": result}

@router.get("/jobs")
def list_all_jobs(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    jobs = db.query(BatchJob).order_by(models.BatchJob.id.desc()).all()
    
    result = []
    for job in jobs:
        tasks = db.query(FileTask).filter(models.FileTask.job_id == job.id).all()
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "Done")
        error = sum(1 for t in tasks if t.status == "Error")
        processing = sum(1 for t in tasks if t.status == "Processing")
        
        # Get owner email
        owner_email = "Hệ thống"
        if job.owner_id:
            owner = db.query(User).filter(User.id == job.owner_id).first()
            if owner:
                owner_email = owner.email
                
        job_name = os.path.basename(job.input_dir)
        if job.is_docx_job == 1 and job_name.endswith("_chunks"):
            job_name = job_name.replace("_chunks", ".docx")
        elif job.is_docx_job == 2 and job_name.endswith("_chunks"):
            job_name = job_name.replace("_chunks", ".txt")
            
        result.append({
            "job_id": job.id,
            "job_name": job_name,
            "status": job.status,
            "is_docx_job": job.is_docx_job,
            "total": total,
            "done": done,
            "error": error,
            "processing": processing,
            "owner_email": owner_email,
            "created_at": job.created_at.isoformat() if job.created_at else None
        })
    return {"jobs": result}

@router.get("/system-stats")
def get_system_stats(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    
    # 1. Local backend resources
    cpu_usage = psutil.cpu_percent(interval=0.1)
    virtual_mem = psutil.virtual_memory()
    ram_used = round(virtual_mem.used / (1024**3), 2)
    ram_total = round(virtual_mem.total / (1024**3), 2)
    ram_percent = virtual_mem.percent
    
    disk = psutil.disk_usage('.')
    disk_percent = disk.percent
    disk_free_gb = round(disk.free / (1024**3), 2)
    disk_total_gb = round(disk.total / (1024**3), 2)
    
    # 2. Database statistics
    total_users = db.query(User).count()
    total_jobs = db.query(BatchJob).count()
    total_tasks = db.query(FileTask).count()
    total_audios = db.query(GeneratedAudio).count()
    
    stats = queue_manager.get_worker_stats(db=db)
    active_workers = len([t for t in queue_manager.threads if t.is_alive()])
    max_workers = stats["system_max"]
    
    # 3. Query Self-Hosted TTS Server Health if configured
    self_hosted_health = None
    url_setting = db.query(Settings).filter(Settings.key == "self_hosted_url").first()
    if url_setting and url_setting.value:
        self_hosted_url = url_setting.value.rstrip('/')
        try:
            res = requests.get(f"{self_hosted_url}/api/health", timeout=2)
            if res.status_code == 200:
                self_hosted_health = res.json()
        except Exception:
            pass
            
    return {
        "backend": {
            "cpu_percent": cpu_usage,
            "ram_percent": ram_percent,
            "ram_used_gb": ram_used,
            "ram_total_gb": ram_total,
            "disk_percent": disk_percent,
            "disk_free_gb": disk_free_gb,
            "disk_total_gb": disk_total_gb
        },
        "database": {
            "total_users": total_users,
            "total_jobs": total_jobs,
            "total_tasks": total_tasks,
            "total_audios": total_audios
        },
        "queue": {
            "active_workers": active_workers,
            "busy_workers": stats["system_active"],
            "max_workers": max_workers,
            "is_paused": queue_manager.is_paused
        },
        "self_hosted": self_hosted_health
    }

from datetime import datetime, timedelta
from sqlalchemy import func

@router.get("/request-stats")
def get_request_stats(request: Request, group_by: str = "hour", db: Session = Depends(get_db)):
    require_admin(request, db)
    
    now = datetime.utcnow()
    
    if group_by == "minute":
        date_format = "%Y-%m-%d %H:%M"
        time_limit = now - timedelta(minutes=60)
    elif group_by == "day":
        date_format = "%Y-%m-%d"
        time_limit = now - timedelta(days=30)
    else: # hour
        date_format = "%Y-%m-%d %H:00"
        time_limit = now - timedelta(hours=24)
        
    stats = db.query(
        func.strftime(date_format, models.RequestLog.created_at).label("time_bucket"),
        func.count(models.RequestLog.id).label("count")
    ).filter(
        models.RequestLog.created_at >= time_limit
    ).group_by(
        "time_bucket"
    ).order_by(
        "time_bucket"
    ).all()
    
    return [{"time": row.time_bucket, "count": row.count} for row in stats]



from pydantic import BaseModel
import hashlib
import json

class CommonVoiceCreateRequest(BaseModel):
    name: str
    voice: str
    seed: str
    provider: str = "self_hosted"
    text: str = "Xin chào, đây là giọng đọc thử tiếng Việt."
    output_speed: float = 1.0
    is_sample: bool = True
    keep_voice: str = "true"


@router.post("/common-voices/upload")
async def upload_common_voice(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    text: str = Form(...),
    voice: str = Form(...),
    seed: str = Form(None),
    provider: str = Form("self_hosted"),
    output_speed: float = Form(1.0),
    keep_voice: str = Form("true"),
    db: Session = Depends(get_db)
):
    """Upload file âm thanh (.wav/.mp3) từ máy khách lên common_voices."""
    require_admin(request, db)

    if not file.filename.endswith((".wav", ".mp3")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ upload file .wav hoặc .mp3")

    # Tạo voice_key
    if seed:
        raw_str = f"{provider}_{voice}_{seed}"
    else:
        raw_str = f"{provider}_{voice}"
        
    voice_key = hashlib.md5(raw_str.encode('utf-8')).hexdigest()

    dir_path = _get_common_voices_dir()
    os.makedirs(dir_path, exist_ok=True)

    dest_audio_path = os.path.join(dir_path, f"{voice_key}.wav")
    meta_path = os.path.join(dir_path, f"{voice_key}-meta.txt")

    # Lưu file
    try:
        with open(dest_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file: {e}")

    # Tạo meta
    meta_data = {
        "name": name.strip(),
        "text": text,
        "voice": voice,
        "provider": provider,
        "output_speed": output_speed,
        "seed": seed,
        "is_sample": True,
        "keep_voice": keep_voice
    }
    
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        if os.path.exists(dest_audio_path):
            os.remove(dest_audio_path)
        raise HTTPException(status_code=500, detail=f"Lỗi tạo file meta: {e}")

    return {"status": "ok", "voice_id": voice_key, "name": name.strip()}


@router.post("/common-voices")
def create_common_voice(req: CommonVoiceCreateRequest, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    
    # 1. Generate unique file name key
    # Use MD5 hash of voice and seed to make it consistent and unique
    raw_str = f"{req.provider}_{req.voice}_{req.seed}"
    voice_key = hashlib.md5(raw_str.encode('utf-8')).hexdigest()
    
    dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "common_voices")
    os.makedirs(dir_path, exist_ok=True)
    
    audio_path = os.path.join(dir_path, f"{voice_key}.wav")
    meta_path = os.path.join(dir_path, f"{voice_key}-meta.txt")
    
    # 2. Get Self-hosted URL from settings
    url_setting = db.query(Settings).filter(Settings.key == "self_hosted_url").first()
    self_hosted_url = url_setting.value if url_setting else "http://localhost:7860"
    url = f"{self_hosted_url.rstrip('/')}/api/tts"
    
    # 3. Call self-hosted TTS synthesis
    from services.queue_manager import process_self_hosted_tts
    
    try:
        success = process_self_hosted_tts(
            text=req.text,
            output_path=audio_path,
            voice=req.voice,
            url=url,
            seed_val=int(req.seed) if req.seed else None,
            keep_voice_val=(req.keep_voice.lower() == "true"),
            worker_name="AdminCommonVoice"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")
        
    if not success or not os.path.exists(audio_path):
        raise HTTPException(status_code=500, detail="Failed to synthesize voice from provider.")
        
    # 4. Save metadata json
    meta_data = {
        "name": req.name,
        "text": req.text,
        "voice": req.voice,
        "provider": req.provider,
        "output_speed": req.output_speed,
        "seed": req.seed,
        "is_sample": req.is_sample,
        "keep_voice": req.keep_voice
    }
    
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        if os.path.exists(audio_path):
            os.remove(audio_path)
        raise HTTPException(status_code=500, detail=f"Failed to write metadata: {e}")
        
    return {"status": "ok", "id": voice_key}


@router.get("/cache-files")
def list_cache_files(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    audios = db.query(GeneratedAudio).order_by(GeneratedAudio.id.desc()).all()
    
    result = []
    for a in audios:
        creator = "Hệ thống / Vô danh"
        if a.owner_id:
            user = db.query(User).filter(User.id == a.owner_id).first()
            if user:
                creator = user.email
        
        size_bytes = 0
        if a.storage_provider == "local" and a.file_path and os.path.exists(a.file_path):
            try:
                size_bytes = os.path.getsize(a.file_path)
            except Exception:
                pass
                
        result.append({
            "id": a.id,
            "file_name": a.file_name,
            "audio_url": a.audio_url,
            "storage_provider": a.storage_provider,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "creator": creator,
            "size_bytes": size_bytes
        })
    return {"files": result}


@router.delete("/cache-files/{file_id}")
def delete_cache_file(file_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    audio = db.query(GeneratedAudio).filter(GeneratedAudio.id == file_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp cache")
        
    try:
        from services.storage_service import delete_audio_file
        delete_audio_file(audio, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa tệp: {str(e)}")
        
    return {"status": "ok", "message": "Xóa tệp cache thành công"}


# ── Common Voices Management ───────────────────────────────────────────────────

class CommonVoiceUpdateRequest(BaseModel):
    name: str


def _get_common_voices_dir() -> str:
    """Trả về đường dẫn thư mục common_voices."""
    dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "common_voices")
    if not os.path.exists(dir_path):
        dir_path = "backend/common_voices"
    return dir_path


@router.put("/common-voices/{voice_id}")
def update_common_voice_name(voice_id: str, req: CommonVoiceUpdateRequest, request: Request, db: Session = Depends(get_db)):
    """Cập nhật tên hiển thị của một giọng đọc hệ thống (common voice). Chỉ cập nhật trường 'name' trong file meta, không ảnh hưởng đến voice/seed/logic sinh audio."""
    require_admin(request, db)

    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Tên giọng đọc không được để trống")

    dir_path = _get_common_voices_dir()
    meta_path = os.path.join(dir_path, f"{voice_id}-meta.txt")

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy giọng đọc hệ thống")

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            meta_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc file meta: {e}")

    meta_data["name"] = req.name.strip()

    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi ghi file meta: {e}")

    return {"status": "ok", "voice_id": voice_id, "name": meta_data["name"]}


@router.delete("/common-voices/{voice_id}")
def delete_common_voice(voice_id: str, request: Request, db: Session = Depends(get_db)):
    """Xóa một giọng đọc hệ thống (common voice) - xóa cả file .wav và file -meta.txt."""
    require_admin(request, db)

    dir_path = _get_common_voices_dir()
    meta_path = os.path.join(dir_path, f"{voice_id}-meta.txt")
    audio_path = os.path.join(dir_path, f"{voice_id}.wav")

    if not os.path.exists(meta_path) and not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy giọng đọc hệ thống")

    errors = []
    for path in [meta_path, audio_path]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                errors.append(str(e))

    if errors:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa file: {'; '.join(errors)}")

    return {"status": "ok", "voice_id": voice_id, "message": "Đã xóa giọng đọc hệ thống thành công"}

