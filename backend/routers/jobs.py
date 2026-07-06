from routers.auth import _current_user_from_request
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, File, Form, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import *
import models
from schemas import *
import os
import tempfile
import time
from typing import List

router = APIRouter()

from services.queue_manager import queue_manager, fpt_key_rotator, adjust_audio_speed_ffmpeg
from services.storage_service import get_storage_provider, delete_audio_file

@router.post("/api/scan")
def scan_directory(req: ScanRequest):
    if not os.path.exists(req.directory) or not os.path.isdir(req.directory):
        raise HTTPException(status_code=400, detail="Directory not found")
    
    files = [f for f in os.listdir(req.directory) if f.endswith('.txt')]
    return {"total": len(files), "files": files}


@router.post("/api/jobs")
def create_job(req: JobRequest, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    
    from services.job_service import create_batch_job
    return create_batch_job(req, user, db)


@router.get("/api/jobs/latest/progress")
def get_latest_job_progress(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    job = db.query(models.BatchJob).filter(models.BatchJob.owner_id == user.id, models.BatchJob.status != "Cancelled").order_by(models.BatchJob.id.desc()).first()
    if not job:
        return {"status": "No jobs found"}
        
    tasks = db.query(models.FileTask).filter(models.FileTask.job_id == job.id).all()
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "Done")
    error = sum(1 for t in tasks if t.status == "Error")
    processing = sum(1 for t in tasks if t.status == "Processing")
    
    return {
        "job_id": job.id,
        "status": job.status,
        "total": total,
        "done": done,
        "error": error,
        "processing": processing,
        "is_paused": queue_manager.is_paused,
        "tasks": [{"id": t.id, "file_name": t.file_name, "status": t.status} for t in tasks]
    }


@router.get("/api/jobs/active/progress")
def get_active_jobs_progress(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    worker_stats = queue_manager.get_worker_stats(user.id, db)
    jobs = db.query(models.BatchJob).filter(models.BatchJob.owner_id == user.id).order_by(models.BatchJob.id.desc()).all()
    if not jobs:
        return {"jobs": [], "worker_stats": worker_stats}
        
    result = []
    for job in jobs:
        tasks = db.query(models.FileTask).filter(models.FileTask.job_id == job.id).all()
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "Done")
        error = sum(1 for t in tasks if t.status == "Error")
        processing = sum(1 for t in tasks if t.status == "Processing")
        
        # Lấy tên file từ final_output_path để đồng bộ định dạng slugify + timestamp với file audio kết quả
        if job.final_output_path:
            job_name = os.path.basename(job.final_output_path)
        else:
            job_name = os.path.basename(job.input_dir) if job.input_dir else "unknown_job"
            if job.is_docx_job == 1 and job_name.endswith("_chunks"):
                job_name = job_name.replace("_chunks", ".docx")
            elif job.is_docx_job == 2 and job_name.endswith("_chunks"):
                job_name = job_name.replace("_chunks", ".txt")
            
        temp_files_exist = os.path.exists(job.input_dir) if job.input_dir else False
            
        result.append({
            "job_id": job.id,
            "job_name": job_name,
            "status": job.status,
            "is_docx_job": job.is_docx_job,
            "total": total,
            "done": done,
            "error": error,
            "processing": processing,
            "is_paused": queue_manager.is_paused,
            "temp_files_exist": temp_files_exist
        })
        
    return {"jobs": result, "worker_stats": worker_stats}


@router.get("/api/jobs/{job_id}/tasks")
def get_job_tasks(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).filter(models.BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    tasks = db.query(models.FileTask).filter(models.FileTask.job_id == job_id).order_by(models.FileTask.file_name).all()
    return {
        "job_id": job_id,
        "tasks": [
            {
                "id": t.id,
                "file_name": t.file_name,
                "status": t.status,
                "error_message": t.error_message,
                "output_path": t.output_path
            }
            for t in tasks
        ]
    }


@router.post("/api/tasks/{task_id}/retry")
def retry_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.FileTask).filter(models.FileTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "Pending"
    
    # Update job status if needed
    job = db.query(models.BatchJob).filter(models.BatchJob.id == task.job_id).first()
    if job and job.status in ["Completed", "Error", "Paused"]:
        job.status = "Processing"
        
    db.commit()
    queue_manager.resume()
    return {"status": "ok"}


@router.post("/api/jobs/{job_id}/retry")
def retry_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).filter(models.BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if not job.input_dir or not os.path.exists(job.input_dir):
        raise HTTPException(status_code=400, detail="Thư mục tạm đã bị dọn dẹp sau 60 phút (hết hạn session)")
        
    failed_tasks = db.query(models.FileTask).filter(models.FileTask.job_id == job_id, models.FileTask.status == "Error").all()
    if not failed_tasks:
        return {"status": "ok", "message": "Không có task lỗi nào để chạy lại"}
        
    for task in failed_tasks:
        task.status = "Pending"
        task.error_message = None
        
    if job.status in ["Completed", "Error", "Cancelled", "Paused"]:
        job.status = "Processing"
        
    db.commit()
    queue_manager.resume()
    queue_manager.ensure_workers()
    return {"status": "ok", "retried_count": len(failed_tasks)}


@router.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    db.query(models.FileTask).filter(models.FileTask.job_id == job_id).delete()
    db.query(models.BatchJob).filter(models.BatchJob.id == job_id).delete()
    db.commit()
    return {"status": "ok"}


@router.post("/api/jobs/reset-stuck")
def reset_stuck_tasks(db: Session = Depends(get_db)):
    """Reset task kẹt ở 'Processing' về 'Pending' và đảm bảo workers đang chạy."""
    stuck = db.query(models.FileTask).filter(models.FileTask.status == "Processing").all()
    count = len(stuck)
    for t in stuck:
        t.status = "Pending"

    if stuck:
        job_ids = set(t.job_id for t in stuck)
        for job_id in job_ids:
            job = db.query(models.BatchJob).filter(models.BatchJob.id == job_id).first()
            if job and job.status in ["Completed"]:
                job.status = "Processing"

    db.commit()

    # Giải phóng tất cả FPT key đang bị giữ (worker đang poll giữa chừng sẽ bỏ kết quả do ownership check)
    fpt_key_rotator.clear_in_use()

    queue_manager.resume()
    restarted = queue_manager.ensure_workers()  # Restart worker nếu thread đã chết
    return {"status": "ok", "reset_count": count, "workers_restarted": restarted}


@router.get("/api/debug/queue")
def debug_queue(db: Session = Depends(get_db)):
    """Debug: trạng thái chi tiết của QueueManager và số task theo status."""
    qs = queue_manager.status()

    # Đếm tasks theo status (tất cả jobs)
    from sqlalchemy import func
    task_counts = db.query(models.FileTask.status, func.count(models.FileTask.id))\
        .group_by(models.FileTask.status).all()
    tasks_by_status = {s: c for s, c in task_counts}

    # Đếm jobs theo status
    job_counts = db.query(models.BatchJob.status, func.count(models.BatchJob.id))\
        .group_by(models.BatchJob.status).all()
    jobs_by_status = {s: c for s, c in job_counts}

    # FPT key rotator info
    fpt_keys = fpt_key_rotator.all_keys()

    return {
        "queue_manager": qs,
        "fpt_keys_loaded": len(fpt_keys),
        "fpt_keys_in_use": fpt_key_rotator.in_use_count(),
        "tasks": tasks_by_status,
        "jobs": jobs_by_status
    }


@router.post("/api/jobs/upload-run")
def upload_and_run_jobs(
    files: List[UploadFile] = File(...),
    voice: str = Form(...),
    model_name: str = Form("gemini-2.5-flash-preview-tts"),
    provider: str = Form("self_hosted"),
    output_speed: float = Form(1.0),
    request: Request = None,
    db: Session = Depends(get_db)
):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
        
    from services.job_service import upload_and_run_batch_jobs
    return upload_and_run_batch_jobs(
        files=files,
        voice=voice,
        model_name=model_name,
        provider=provider,
        output_speed=output_speed,
        user=user,
        db=db
    )


@router.get("/api/jobs/{job_id}/download-result")
def download_job_result(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).filter(models.BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.final_output_path or not os.path.exists(job.final_output_path):
        raise HTTPException(status_code=404, detail="Result file not found or not finished yet")
    return FileResponse(job.final_output_path, media_type="audio/wav", filename=os.path.basename(job.final_output_path))


class SavedVoiceRequest(BaseModel):
    name: str
    voice_type: str
    seed: str