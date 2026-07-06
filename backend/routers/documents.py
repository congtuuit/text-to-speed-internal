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



@router.post("/api/docx/split")
def split_docx_endpoint(req: DocxJobRequest):
    if not req.docx_path.endswith('.docx') and not req.docx_path.endswith('.doc'):
        raise HTTPException(status_code=400, detail="Invalid DOCX file")
        
    if not os.path.exists(req.output_dir):
        os.makedirs(req.output_dir)
        
        
    base_name = os.path.splitext(os.path.basename(req.docx_path))[0]
    chunks_dir = os.path.join(req.output_dir, f"{base_name}_chunks")
    
    if req.provider == 'fpt':
        max_length = 200
    elif req.provider == 'self_hosted':
        max_length = 200
    else:
        max_length = 2800
    files = split_docx_to_txt(req.docx_path, chunks_dir, max_chars=max_length)
    
    return {"chunks_dir": chunks_dir, "total_files": len(files)}


@router.post("/api/docx/batch-submit")
def batch_submit_docx(req: BatchDocxRequest, db: Session = Depends(get_db)):
    if not os.path.exists(req.folder_path) or not os.path.isdir(req.folder_path):
        raise HTTPException(status_code=400, detail="Directory not found")
        
    if not os.path.exists(req.output_dir):
        os.makedirs(req.output_dir)
        

    docx_files = [f for f in os.listdir(req.folder_path) if f.endswith('.docx') or f.endswith('.doc')]
    if not docx_files:
        raise HTTPException(status_code=400, detail="No DOCX files found in directory")
        
    if req.provider == 'fpt':
        max_length = 200
    elif req.provider == 'self_hosted':
        max_length = 150
    else:
        max_length = 2800
    created_jobs = []
    total_files_across_all = 0
    
    for docx_file in docx_files:
        docx_path = os.path.join(req.folder_path, docx_file)
        base_name = os.path.splitext(docx_file)[0]
        chunks_dir = os.path.join(req.output_dir, f"{base_name}_chunks")
        
        # Split DOCX to TXT chunks
        txt_files = split_docx_to_txt(docx_path, chunks_dir, max_chars=max_length)
        if not txt_files:
            continue
            
        final_output_path = os.path.join(req.output_dir, f"{base_name}.wav")
        
        # Create BatchJob
        job = models.BatchJob(
            input_dir=chunks_dir, 
            output_dir=chunks_dir, 
            voice=req.voice, 
            model_name=req.model_name, 
            provider=req.provider,
            is_docx_job=1,
            final_output_path=final_output_path
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        created_jobs.append(job.id)
        
        # Create FileTasks
        for file_name in txt_files:
            file_path = os.path.join(chunks_dir, file_name)
            task = models.FileTask(job_id=job.id, file_name=file_name, file_path=file_path)
            db.add(task)
            total_files_across_all += 1
            
    db.commit()
    queue_manager.resume()
    queue_manager.ensure_workers()
    
    return {
        "job_ids": created_jobs,
        "total_jobs": len(created_jobs),
        "total_files": total_files_across_all
    }
