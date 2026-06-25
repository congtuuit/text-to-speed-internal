from fastapi import APIRouter, Depends, HTTPException, Request
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
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
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
    
    active_workers = len([t for t in queue_manager.threads if t.is_alive()])
    max_workers_setting = db.query(Settings).filter(Settings.key == "max_workers").first()
    max_workers = int(max_workers_setting.value) if max_workers_setting else 3
    
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

