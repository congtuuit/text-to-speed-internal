from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import requests

from database import engine, Base, get_db
import models
from services.queue_manager import queue_manager
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
    provider: str = "gemini"
    vieneu_mode: str = "remote"
    vieneu_url: str = "http://localhost:23333/v1"

class DocxJobRequest(BaseModel):
    docx_path: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "gemini"
    vieneu_mode: str = "remote"
    vieneu_url: str = "http://localhost:23333/v1"

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

    job = models.BatchJob(input_dir=req.input_dir, output_dir=req.output_dir, voice=req.voice, model_name=req.model_name)
    db.add(job)
    db.commit()
    db.refresh(job)

    for file_name in files:
        file_path = os.path.join(req.input_dir, file_name)
        task = models.FileTask(job_id=job.id, file_name=file_name, file_path=file_path)
        db.add(task)
    
    db.commit()
    return {"job_id": job.id, "total_files": len(files)}

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).filter(models.BatchJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.query(models.FileTask).filter(models.FileTask.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"status": "ok"}

class TestVoiceRequest(BaseModel):
    voice: str
    text: str = "Xin chào, đây là giọng đọc thử."
    api_key: str = ""
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "gemini"
    vieneu_mode: str = "remote"
    vieneu_url: str = "http://localhost:23333/v1"

@app.post("/api/test-voice")
def test_voice(req: TestVoiceRequest, background_tasks: BackgroundTasks):
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
        if req.provider == "vieneu":
            from services.queue_manager import get_vieneu_instance
            vieneu_tts = get_vieneu_instance(mode=req.vieneu_mode, api_base=req.vieneu_url)
            voice_data = vieneu_tts.get_preset_voice(req.voice)
            audio_data = vieneu_tts.infer(req.text, voice=voice_data)
            vieneu_tts.save(audio_data, temp_file)
            success = True
        else:
            provider = TTSProvider(api_key=req.api_key)
            success = provider.process_text_to_speech(req.text, temp_file, req.voice, req.model_name)
    except Exception as e:
        cleanup()
        raise HTTPException(status_code=500, detail=str(e))
    
    if not success or not os.path.exists(temp_file):
        cleanup()
        error_msg = "Failed to generate Gemini TTS audio. Check backend logs." if req.provider == "gemini" else "Lỗi tạo audio VieNeu-TTS. Vui lòng kiểm tra log backend."
        raise HTTPException(status_code=500, detail=error_msg)
        
    background_tasks.add_task(cleanup)
    return FileResponse(temp_file, media_type="audio/wav")

class SettingsRequest(BaseModel):
    api_key: str = ""
    model_name: str = ""
    provider: str = "gemini"
    vieneu_mode: str = "remote"
    vieneu_url: str = "http://localhost:23333/v1"

@app.post("/api/settings")
def update_settings(req: SettingsRequest, db: Session = Depends(get_db)):
    for k, v in [("api_key", req.api_key), ("model_name", req.model_name), ("provider", req.provider), ("vieneu_mode", req.vieneu_mode), ("vieneu_url", req.vieneu_url)]:
        setting = db.query(models.Settings).filter(models.Settings.key == k).first()
        if not setting:
            setting = models.Settings(key=k, value=v)
            db.add(setting)
        else:
            setting.value = v
    db.commit()
    
    # Resume queue in case it was paused due to quota/api key error
    queue_manager.resume()
    
    return {"status": "ok"}

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    api_key_setting = db.query(models.Settings).filter(models.Settings.key == "api_key").first()
    model_name_setting = db.query(models.Settings).filter(models.Settings.key == "model_name").first()
    provider_setting = db.query(models.Settings).filter(models.Settings.key == "provider").first()
    vieneu_mode_setting = db.query(models.Settings).filter(models.Settings.key == "vieneu_mode").first()
    vieneu_url_setting = db.query(models.Settings).filter(models.Settings.key == "vieneu_url").first()
    return {
        "api_key": api_key_setting.value if api_key_setting else "",
        "model_name": model_name_setting.value if model_name_setting else "gemini-2.5-flash-preview-tts",
        "provider": provider_setting.value if provider_setting else "gemini",
        "vieneu_mode": vieneu_mode_setting.value if vieneu_mode_setting else "remote",
        "vieneu_url": vieneu_url_setting.value if vieneu_url_setting else "http://localhost:23333/v1"
    }

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
def get_voices(provider: str = "gemini"):
    if provider == "vieneu":
        # Trả về danh sách tĩnh để tránh load model 3GB gây chậm API
        return [
            {"id": "Vinh", "name": "Vĩnh (nam miền Nam)"},
            {"id": "Binh", "name": "Bình (nam miền Bắc)"},
            {"id": "Tuyen", "name": "Tuyên (nam miền Bắc)"},
            {"id": "Doan", "name": "Đoan (nữ miền Nam)"},
            {"id": "Ly", "name": "Ly (nữ miền Bắc)"},
            {"id": "Ngoc", "name": "Ngọc (nữ miền Bắc)"}
        ]
            
    return [
        {"id": "Puck", "name": "Puck (Nam - Vui vẻ, năng động)"},
        {"id": "Charon", "name": "Charon (Nam - Trầm ấm, mạnh mẽ)"},
        {"id": "Kore", "name": "Kore (Nữ - Thanh thoát, dịu dàng)"},
        {"id": "Fenrir", "name": "Fenrir (Nam - Trầm, cá tính)"},
        {"id": "Aoede", "name": "Aoede (Nữ - Trầm ấm, nội lực)"}
    ]

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

@app.post("/api/jobs/docx")
def create_docx_job(req: DocxJobRequest, db: Session = Depends(get_db)):
    if not os.path.exists(req.docx_path) or not req.docx_path.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Invalid DOCX file")
        
    if not os.path.exists(req.output_dir):
        os.makedirs(req.output_dir)
        
    base_name = os.path.splitext(os.path.basename(req.docx_path))[0]
    chunks_dir = os.path.join(req.output_dir, f"{base_name}_chunks")
    final_audio_path = os.path.join(req.output_dir, f"{base_name}.wav")
    
    files = split_docx_to_txt(req.docx_path, chunks_dir)
    
    job = models.BatchJob(
        input_dir=chunks_dir, 
        output_dir=chunks_dir, 
        voice=req.voice, 
        model_name=req.model_name,
        provider=req.provider,
        is_docx_job=1,
        final_output_path=final_audio_path
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    for file_name in files:
        file_path = os.path.join(chunks_dir, file_name)
        task = models.FileTask(job_id=job.id, file_name=file_name, file_path=file_path)
        db.add(task)
    
    db.commit()
    return {"job_id": job.id, "total_files": len(files)}

@app.get("/api/jobs/latest/progress")
def get_latest_job_progress(db: Session = Depends(get_db)):
    job = db.query(models.BatchJob).order_by(models.BatchJob.id.desc()).first()
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
        "tasks": [{"file_name": t.file_name, "status": t.status} for t in tasks]
    }
