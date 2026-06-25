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
from services.docx_helper import split_docx_to_txt

@router.post("/api/scan")
def scan_directory(req: ScanRequest):
    if not os.path.exists(req.directory) or not os.path.isdir(req.directory):
        raise HTTPException(status_code=400, detail="Directory not found")
    
    files = [f for f in os.listdir(req.directory) if f.endswith('.txt')]
    return {"total": len(files), "files": files}


@router.post("/api/jobs")
def create_job(req: JobRequest, db: Session = Depends(get_db)):
    if not os.path.exists(req.input_dir):
        raise HTTPException(status_code=400, detail="Input directory not found")
        
    if not os.path.exists(req.output_dir):
        try:
            os.makedirs(req.output_dir)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot create output directory: {e}")

    files = [f for f in os.listdir(req.input_dir) if f.endswith('.txt')]
    if not files:
        raise HTTPException(status_code=400, detail="No .txt files found in input directory")

    is_docx_job = 1 if req.input_dir.endswith('_chunks') else 0
    final_output_path = ""
    actual_output_dir = req.output_dir
    
    
    if is_docx_job:
        base_name = os.path.basename(req.input_dir).replace("_chunks", "")
        final_output_path = os.path.join(req.output_dir, f"{base_name}.wav")
        actual_output_dir = req.input_dir
        
        job = models.BatchJob(
            input_dir=req.input_dir, 
            output_dir=actual_output_dir, 
            voice=req.voice, 
            model_name=req.model_name, 
            provider=req.provider,
            is_docx_job=is_docx_job,
            final_output_path=final_output_path
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        for file_name in files:
            file_path = os.path.join(req.input_dir, file_name)
            task = models.FileTask(job_id=job.id, file_name=file_name, file_path=file_path)
            db.add(task)
        
        db.commit()
        queue_manager.resume()
        queue_manager.ensure_workers()
        return {"job_id": job.id, "total_files": len(files)}
    else:
        from services.docx_helper import split_txt_to_chunks
        created_jobs = []
        total_chunks_across_all = 0
        
        max_length = 200 if req.provider in ['fpt', 'self_hosted'] else 2800

        for file_name in files:
            txt_path = os.path.join(req.input_dir, file_name)
            base_name = os.path.splitext(file_name)[0]
            chunks_dir = os.path.join(req.output_dir, f"{base_name}_chunks")
            
            chunk_files = split_txt_to_chunks(txt_path, chunks_dir, max_chars=max_length)
            if not chunk_files:
                continue
                
            final_output_path = os.path.join(req.output_dir, f"{base_name}.wav")
            
            job = models.BatchJob(
                input_dir=chunks_dir,
                output_dir=chunks_dir,
                voice=req.voice,
                model_name=req.model_name,
                provider=req.provider,
                is_docx_job=2,
                final_output_path=final_output_path
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            for chunk_file in chunk_files:
                chunk_path = os.path.join(chunks_dir, chunk_file)
                task = models.FileTask(job_id=job.id, file_name=chunk_file, file_path=chunk_path)
                db.add(task)
                
            total_chunks_across_all += len(chunk_files)
            created_jobs.append(job.id)
            
        db.commit()
        queue_manager.resume()
        queue_manager.ensure_workers()
        
        return {
            "job_ids": created_jobs,
            "total_files": total_chunks_across_all,
            "is_batch": True
        }



class TestVoiceRequest(BaseModel):
    voice: str
    text: str = "Xin chào, đây là giọng đọc thử."
    api_key: str = ""
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    self_hosted_url: str = "http://localhost:7860"
    seed: str = ""
    keep_voice: str = "false"
    output_speed: float = 1.0
    is_sample: bool = False


@router.get("/api/jobs/latest/progress")
def get_latest_job_progress(db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).filter(models.BatchJob.status != "Cancelled").order_by(models.BatchJob.id.desc()).first()
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
def get_active_jobs_progress(db: Session = Depends(get_db)):
    jobs = db.query(models.BatchJob).order_by(models.BatchJob.id.desc()).all()
    if not jobs:
        return {"jobs": []}
        
    result = []
    for job in jobs:
        tasks = db.query(models.FileTask).filter(models.FileTask.job_id == job.id).all()
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "Done")
        error = sum(1 for t in tasks if t.status == "Error")
        processing = sum(1 for t in tasks if t.status == "Processing")
        
        # Láº¥y tÃªn file gá»‘c tá»« input_dir (náº¿u lÃ  docx, input_dir sáº½ cÃ³ tÃªn dáº¡ng filename_chunks)
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
            "is_paused": queue_manager.is_paused
        })
        
    return {"jobs": result}


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


@router.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    db.query(models.FileTask).filter(models.FileTask.job_id == job_id).delete()
    db.query(models.BatchJob).filter(models.BatchJob.id == job_id).delete()
    db.commit()
    return {"status": "ok"}


@router.post("/api/jobs/reset-stuck")
def reset_stuck_tasks(db: Session = Depends(get_db)):
    """Reset task káº¹t á»Ÿ 'Processing' vá» 'Pending' vÃ  Ä‘áº£m báº£o workers Ä‘ang cháº¡y."""
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

    # Giáº£i phÃ³ng táº¥t cáº£ FPT key Ä‘ang bá»‹ giá»¯ (worker Ä‘ang poll giá»¯a chá»«ng sáº½ bá» káº¿t quáº£ do ownership check)
    fpt_key_rotator.clear_in_use()

    queue_manager.resume()
    restarted = queue_manager.ensure_workers()  # Restart worker náº¿u thread Ä‘Ã£ cháº¿t
    return {"status": "ok", "reset_count": count, "workers_restarted": restarted}


@router.get("/api/debug/queue")
def debug_queue(db: Session = Depends(get_db)):
    """Debug: tráº¡ng thÃ¡i chi tiáº¿t cá»§a QueueManager vÃ  sá»‘ task theo status."""
    qs = queue_manager.status()

    # Äáº¿m tasks theo status (táº¥t cáº£ jobs)
    from sqlalchemy import func
    task_counts = db.query(models.FileTask.status, func.count(models.FileTask.id))\
        .group_by(models.FileTask.status).all()
    tasks_by_status = {s: c for s, c in task_counts}

    # Äáº¿m jobs theo status
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

class SavedVoiceRequest(BaseModel):
    name: str
    voice_type: str
    seed: str
