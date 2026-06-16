import sys
# Fix Windows encoding: force stdout/stderr sang UTF-8 để log Unicode không bị lỗi
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import requests


from database import engine, Base, get_db
import models
from services.queue_manager import queue_manager, fpt_key_rotator, adjust_audio_speed_ffmpeg
from services.tts_provider import TTSProvider
from fastapi.responses import FileResponse
import tempfile
import tkinter as tk
from tkinter import filedialog

# Tạo DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Batch TTS Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    queue_manager.start()

@app.on_event("shutdown")
def shutdown_event():
    queue_manager.stop()

class ScanRequest(BaseModel):
    directory: str

class JobRequest(BaseModel):
    input_dir: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

class DocxJobRequest(BaseModel):
    docx_path: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

class BatchDocxRequest(BaseModel):
    folder_path: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

from services.docx_helper import split_docx_to_txt

@app.post("/api/scan")
def scan_directory(req: ScanRequest):
    if not os.path.exists(req.directory) or not os.path.isdir(req.directory):
        raise HTTPException(status_code=400, detail="Directory not found")
    
    files = [f for f in os.listdir(req.directory) if f.endswith('.txt')]
    return {"total": len(files), "files": files}

@app.post("/api/jobs")
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
    
    for k, v in [("model_name", req.model_name), ("provider", req.provider), ("fpt_api_keys", req.fpt_api_keys), ("fpt_speed", str(req.fpt_speed)), ("max_workers", str(req.max_workers)), ("self_hosted_url", req.self_hosted_url), ("output_speed", str(req.output_speed))]:
        if not v:
            continue
        setting = db.query(models.Settings).filter(models.Settings.key == k).first()
        if not setting:
            setting = models.Settings(key=k, value=v)
            db.add(setting)
        else:
            setting.value = v
    db.commit()
    
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

@app.post("/api/test-voice")
def test_voice(req: TestVoiceRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
            
            ref_audio_path = None
            if cleaned_voice not in presets and not (cleaned_voice and cleaned_voice.startswith("voice_")):
                saved_voice_exists = db.query(models.SavedVoice).filter(models.SavedVoice.name == cleaned_voice).first()
                if not saved_voice_exists:
                    cleaned_voice = "female"
                elif saved_voice_exists.voice_type == "self_hosted_cloned":
                    ref_audio_path = saved_voice_exists.reference_audio_path

            url = f"{req.self_hosted_url.rstrip('/')}/api/tts"
            
            # Parse seed and keep_voice parameters
            seed_val = int(req.seed) if (req.seed and req.seed.strip()) else None
            keep_voice_val = (req.keep_voice == "true")
            
            success = process_self_hosted_tts(
                text=req.text,
                output_path=temp_file,
                voice=cleaned_voice,
                url=url,
                seed_val=seed_val,
                keep_voice_val=keep_voice_val,
                worker_name="TestVoice",
                ref_audio_path=ref_audio_path
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
        
    background_tasks.add_task(cleanup)
    return FileResponse(temp_file, media_type="audio/wav")

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

@app.post("/api/settings")
def update_settings(req: SettingsRequest, db: Session = Depends(get_db)):
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
        setting = db.query(models.Settings).filter(models.Settings.key == k).first()
        if not setting:
            setting = models.Settings(key=k, value=v)
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

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    api_key_setting = db.query(models.Settings).filter(models.Settings.key == "api_key").first()
    model_name_setting = db.query(models.Settings).filter(models.Settings.key == "model_name").first()
    provider_setting = db.query(models.Settings).filter(models.Settings.key == "provider").first()
    fpt_api_keys_setting = db.query(models.Settings).filter(models.Settings.key == "fpt_api_keys").first()
    fpt_speed_setting = db.query(models.Settings).filter(models.Settings.key == "fpt_speed").first()
    max_workers_setting = db.query(models.Settings).filter(models.Settings.key == "max_workers").first()
    self_hosted_url_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    self_hosted_voice_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_voice").first()
    self_hosted_seed_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_seed").first()
    self_hosted_keep_voice_setting = db.query(models.Settings).filter(models.Settings.key == "self_hosted_keep_voice").first()
    output_speed_setting = db.query(models.Settings).filter(models.Settings.key == "output_speed").first()
    
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
        "self_hosted_voice": self_hosted_voice_setting.value if self_hosted_voice_setting else "female",
        "self_hosted_seed": self_hosted_seed_setting.value if self_hosted_seed_setting else "",
        "self_hosted_keep_voice": self_hosted_keep_voice_setting.value if self_hosted_keep_voice_setting else "false",
        "output_speed": float(output_speed_setting.value) if output_speed_setting else 1.0
    }

@app.get("/api/self-hosted/config")
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

@app.post("/api/self-hosted/check-connection")
def check_self_hosted_connection(req: CheckConnectionRequest):
    url = f"{req.self_hosted_url.rstrip('/')}/api/health"
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return {"success": True, "data": res.json()}
        return {"success": False, "detail": f"HTTP {res.status_code}: {res.text}"}
    except Exception as e:
        return {"success": False, "detail": str(e)}

@app.get("/api/models")
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

@app.get("/api/voices")
def get_voices(provider: str = "self_hosted", self_hosted_url: str = "http://localhost:7860", db: Session = Depends(get_db)):
    if provider == "fpt":
        return [
            {"id": "banmai", "name": "Ban Mai (Nữ miền Bắc)"},
            {"id": "lannhi", "name": "Lan Nhi (Nữ miền Nam)"},
            {"id": "leminh", "name": "Lê Minh (Nam miền Bắc)"},
            {"id": "myan", "name": "My An (Nữ miền Trung)"},
            {"id": "thuminh", "name": "Thu Minh (Nữ miền Bắc)"},
            {"id": "giahuy", "name": "Gia Huy (Nam miền Trung)"},
            {"id": "ngoclam", "name": "Ngọc Lâm (Nữ miền Trung)"},
            {"id": "linhsan", "name": "Linh San (Nữ miền Nam)"},
            {"id": "minhquang", "name": "Minh Quang (Nam miền Nam)"}
        ]
    if provider == "gemini":
        return [
            {"id": "Puck", "name": "Puck"},
            {"id": "Charon", "name": "Charon"},
            {"id": "Kore", "name": "Kore"},
            {"id": "Fenrir", "name": "Fenrir"},
            {"id": "Aoede", "name": "Aoede"}
        ]
    if provider == "self_hosted":
        voices = [
            {"id": "female", "name": "Nữ, giọng mặc định"},
            {"id": "male", "name": "Nam, giọng mặc định"},
            {"id": "female, low pitch", "name": "Nữ, trầm"},
            {"id": "female, high pitch", "name": "Nữ, cao"},
            {"id": "male, low pitch", "name": "Nam, trầm"},
            {"id": "male, high pitch", "name": "Nam, cao"}
        ]
        try:
            cloned_voices = db.query(models.SavedVoice).filter(models.SavedVoice.voice_type == "self_hosted_cloned").all()
            for cv in cloned_voices:
                voices.append({"id": cv.name, "name": f"[Clone] {cv.name}"})
        except Exception as e:
            pass
        return voices
    return []

@app.get("/api/browse-folder")
def browse_folder():
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder_path = filedialog.askdirectory(parent=root, title="Select Directory")
        root.destroy()
        return {"path": folder_path}
    except Exception as e:
        return {"path": "", "error": str(e)}

@app.get("/api/browse-docx")
def browse_docx():
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        file_path = filedialog.askopenfilename(parent=root, title="Select Docx File", filetypes=[("Word Documents", "*.docx")])
        root.destroy()
        return {"path": file_path}
    except Exception as e:
        return {"path": "", "error": str(e)}

@app.post("/api/docx/split")
def split_docx_endpoint(req: DocxJobRequest, db: Session = Depends(get_db)):
    if not req.docx_path.endswith('.docx') and not req.docx_path.endswith('.doc'):
        raise HTTPException(status_code=400, detail="Invalid DOCX file")
        
    if not os.path.exists(req.output_dir):
        os.makedirs(req.output_dir)
        
    for k, v in [("model_name", req.model_name), ("provider", req.provider), ("fpt_api_keys", req.fpt_api_keys), ("fpt_speed", str(req.fpt_speed)), ("max_workers", str(req.max_workers)), ("self_hosted_url", req.self_hosted_url), ("output_speed", str(req.output_speed))]:
        if not v:
            continue
        setting = db.query(models.Settings).filter(models.Settings.key == k).first()
        if not setting:
            setting = models.Settings(key=k, value=v)
            db.add(setting)
        else:
            setting.value = v
    db.commit()
        
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

@app.post("/api/docx/batch-submit")
def batch_submit_docx(req: BatchDocxRequest, db: Session = Depends(get_db)):
    if not os.path.exists(req.folder_path) or not os.path.isdir(req.folder_path):
        raise HTTPException(status_code=400, detail="Directory not found")
        
    if not os.path.exists(req.output_dir):
        os.makedirs(req.output_dir)
        
    for k, v in [("model_name", req.model_name), ("provider", req.provider), ("fpt_api_keys", req.fpt_api_keys), ("fpt_speed", str(req.fpt_speed)), ("max_workers", str(req.max_workers)), ("self_hosted_url", req.self_hosted_url), ("output_speed", str(req.output_speed))]:
        if not v:
            continue
        setting = db.query(models.Settings).filter(models.Settings.key == k).first()
        if not setting:
            setting = models.Settings(key=k, value=v)
            db.add(setting)
        else:
            setting.value = v
    db.commit()

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

@app.get("/api/jobs/latest/progress")
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

@app.get("/api/jobs/active/progress")
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
        
        # Lấy tên file gốc từ input_dir (nếu là docx, input_dir sẽ có tên dạng filename_chunks)
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

@app.get("/api/jobs/{job_id}/tasks")
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

@app.post("/api/tasks/{task_id}/retry")
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

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    db.query(models.FileTask).filter(models.FileTask.job_id == job_id).delete()
    db.query(models.BatchJob).filter(models.BatchJob.id == job_id).delete()
    db.commit()
    return {"status": "ok"}

@app.post("/api/jobs/reset-stuck")
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

@app.get("/api/debug/queue")
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

class SavedVoiceRequest(BaseModel):
    name: str
    voice_type: str
    seed: str

@app.get("/api/saved-voices")
def get_saved_voices(db: Session = Depends(get_db)):
    voices = db.query(models.SavedVoice).order_by(models.SavedVoice.created_at.desc()).all()
    return {"saved_voices": [{"id": v.id, "name": v.name, "voice_type": v.voice_type, "seed": v.seed, "created_at": v.created_at} for v in voices]}

@app.post("/api/saved-voices")
def create_saved_voice(req: SavedVoiceRequest, db: Session = Depends(get_db)):
    voice = models.SavedVoice(name=req.name, voice_type=req.voice_type, seed=req.seed)
    db.add(voice)
    db.commit()
    db.refresh(voice)
    return {"status": "ok", "id": voice.id}

@app.delete("/api/saved-voices/{voice_id}")
def delete_saved_voice(voice_id: int, db: Session = Depends(get_db)):
    voice = db.query(models.SavedVoice).filter(models.SavedVoice.id == voice_id).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Saved voice not found")
    db.delete(voice)
    db.commit()
    return {"status": "ok"}

@app.post("/api/self-hosted/clone")
async def clone_voice(
    text: str = Form(...),
    ref_text: str = Form(None),
    ref_audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    setting_url = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    self_hosted_url = setting_url.value if setting_url else "http://localhost:7860"
    url = f"{self_hosted_url.rstrip('/')}/api/clone"
    
    files = {"ref_audio": (ref_audio.filename, await ref_audio.read(), ref_audio.content_type)}
    data = {"text": text}
    if ref_text:
        data["ref_text"] = ref_text
        
    try:
        res = requests.post(url, data=data, files=files, timeout=60)
        if res.status_code == 200:
            fd, temp_file = tempfile.mkstemp(suffix=".wav", prefix="cloned_")
            os.close(fd)
            with open(temp_file, "wb") as f:
                f.write(res.content)
            return FileResponse(temp_file, media_type="audio/wav")
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Self-hosted API Error: {res.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/self-hosted/voices/save")
async def save_self_hosted_voice(
    voice_name: str = Form(...),
    ref_text: str = Form(None),
    ref_audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    setting_url = db.query(models.Settings).filter(models.Settings.key == "self_hosted_url").first()
    self_hosted_url = setting_url.value if setting_url else "http://localhost:7860"
    url = f"{self_hosted_url.rstrip('/')}/api/voices/save"
    
    audio_bytes = await ref_audio.read()
    files = {"ref_audio": (ref_audio.filename, audio_bytes, ref_audio.content_type)}
    data = {"voice_name": voice_name}
    if ref_text:
        data["ref_text"] = ref_text
        
    try:
        res = requests.post(url, data=data, files=files, timeout=30)
        if res.status_code == 200:
            # Also save to our local DB
            # We don't strictly need to save the audio file in our backend, since OmniVoice saved it
            # But we can store it in SavedVoice so it appears in the list
            existing = db.query(models.SavedVoice).filter(models.SavedVoice.name == voice_name).first()
            if not existing:
                # We can save a copy of the audio file locally just in case
                local_dir = os.path.join(os.getcwd(), "backend", "reference_audios")
                os.makedirs(local_dir, exist_ok=True)
                local_path = os.path.join(local_dir, ref_audio.filename)
                with open(local_path, "wb") as f:
                    f.write(audio_bytes)
                
                new_voice = models.SavedVoice(name=voice_name, voice_type="self_hosted_cloned", seed="", reference_audio_path=local_path)
                db.add(new_voice)
                db.commit()
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Self-hosted API Error: {res.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
