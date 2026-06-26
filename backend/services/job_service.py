import os
import shutil
import uuid
from typing import List
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

import models
from schemas import JobRequest
from services.queue_manager import queue_manager
from services.docx_helper import split_txt_to_chunks, split_docx_to_txt
from routers.billing import check_quota, check_batch_quota, record_usage

def create_batch_job(req: JobRequest, user: models.User, db: Session) -> dict:
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
    
    check_batch_quota(user, len(files), db)
    
    # Calculate total characters to check quota
    total_chars = 0
    for file_name in files:
        file_path = os.path.join(req.input_dir, file_name)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                total_chars += len(f.read())
        except:
            pass
            
    check_quota(user, total_chars, db)

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
            final_output_path=final_output_path,
            owner_id=user.id
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        for file_name in files:
            file_path = os.path.join(req.input_dir, file_name)
            task = models.FileTask(job_id=job.id, file_name=file_name, file_path=file_path, owner_id=user.id)
            db.add(task)
        
        db.commit()
        queue_manager.resume()
        queue_manager.ensure_workers()
        return {"job_id": job.id, "total_files": len(files)}
    else:
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
                final_output_path=final_output_path,
                owner_id=user.id
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            for chunk_file in chunk_files:
                chunk_path = os.path.join(chunks_dir, chunk_file)
                task = models.FileTask(job_id=job.id, file_name=chunk_file, file_path=chunk_path, owner_id=user.id)
                db.add(task)
                
            total_chunks_across_all += len(chunk_files)
            created_jobs.append(job.id)
            
        db.commit()
        record_usage(user.id, total_chars, "batch", db)
        queue_manager.resume()
        queue_manager.ensure_workers()
        
        return {
            "job_ids": created_jobs,
            "total_files": total_chunks_across_all,
            "is_batch": True
        }

def upload_and_run_batch_jobs(
    files: List[UploadFile],
    voice: str,
    model_name: str,
    provider: str,
    output_speed: float,
    user: models.User,
    db: Session
) -> dict:
    check_batch_quota(user, len(files), db)
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
        
    max_length = 200 if provider in ['fpt', 'self_hosted'] else 2800
    temp_root = os.path.join("backend", "storage", "temp_batch")
    os.makedirs(temp_root, exist_ok=True)
    
    # Phase 1: Process files locally, count total characters, and check quota
    temp_dirs_to_clean = []
    job_preps = []
    total_chars = 0
    
    try:
        for file in files:
            if not (file.filename.endswith('.txt') or file.filename.endswith('.docx')):
                continue
                
            job_uuid = str(uuid.uuid4())
            file_input_dir = os.path.join(temp_root, f"input_{job_uuid}")
            chunks_dir = os.path.join(temp_root, f"chunks_{job_uuid}")
            os.makedirs(file_input_dir, exist_ok=True)
            os.makedirs(chunks_dir, exist_ok=True)
            
            temp_dirs_to_clean.append(file_input_dir)
            temp_dirs_to_clean.append(chunks_dir)
            
            # Save the file
            file_path = os.path.join(file_input_dir, file.filename)
            with open(file_path, "wb") as f_out:
                shutil.copyfileobj(file.file, f_out)
                
            base_name = os.path.splitext(file.filename)[0]
            final_output_path = os.path.join(temp_root, f"output_{job_uuid}_{base_name}.wav")
            
            # Split
            if file.filename.endswith('.docx'):
                chunk_files = split_docx_to_txt(file_path, chunks_dir, max_chars=max_length)
                is_docx_job = 1
            else:
                chunk_files = split_txt_to_chunks(file_path, chunks_dir, max_chars=max_length)
                is_docx_job = 2
                
            if not chunk_files:
                continue
                
            # Count chars
            file_chars = 0
            for chunk_file in chunk_files:
                chunk_path = os.path.join(chunks_dir, chunk_file)
                if os.path.exists(chunk_path):
                    with open(chunk_path, "r", encoding="utf-8", errors="ignore") as f_in:
                        file_chars += len(f_in.read())
                        
            total_chars += file_chars
            
            # Keep configuration for phase 2
            job_preps.append({
                "chunks_dir": chunks_dir,
                "voice": voice,
                "model_name": model_name,
                "provider": provider,
                "is_docx_job": is_docx_job,
                "final_output_path": final_output_path,
                "chunk_files": chunk_files
            })
            
        # Check overall character quota
        check_quota(user, total_chars, db)
        
    except HTTPException as he:
        # Clean up temp directories immediately
        for d in temp_dirs_to_clean:
            if os.path.exists(d):
                try:
                    shutil.rmtree(d)
                except:
                    pass
        raise he
    except Exception as e:
        for d in temp_dirs_to_clean:
            if os.path.exists(d):
                try:
                    shutil.rmtree(d)
                except:
                    pass
        raise HTTPException(status_code=500, detail=f"Loi phan tich file: {str(e)}")
        
    # Phase 2: Save to database only if quota verification passed
    created_jobs = []
    total_chunks_across_all = 0
    
    try:
        for prep in job_preps:
            job = models.BatchJob(
                input_dir=prep["chunks_dir"],
                output_dir=prep["chunks_dir"],
                voice=prep["voice"],
                model_name=prep["model_name"],
                provider=prep["provider"],
                is_docx_job=prep["is_docx_job"],
                final_output_path=prep["final_output_path"],
                owner_id=user.id
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            for chunk_file in prep["chunk_files"]:
                chunk_path = os.path.join(prep["chunks_dir"], chunk_file)
                task = models.FileTask(job_id=job.id, file_name=chunk_file, file_path=chunk_path, owner_id=user.id)
                db.add(task)
                
            total_chunks_across_all += len(prep["chunk_files"])
            created_jobs.append(job.id)
            
        db.commit()
        record_usage(user.id, total_chars, "batch", db)
        queue_manager.resume()
        queue_manager.ensure_workers()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Loi ghi database: {str(e)}")
        
    return {
        "job_ids": created_jobs,
        "total_files": total_chunks_across_all,
        "is_batch": True
    }