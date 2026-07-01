from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
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


def get_default_system_voices():
    voices = []
    dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "common_voices")
    if not os.path.exists(dir_path):
        dir_path = "backend/common_voices"
        if not os.path.exists(dir_path):
            return voices
            
    for file_name in os.listdir(dir_path):
        if file_name.endswith("-meta.txt"):
            meta_path = os.path.join(dir_path, file_name)
            audio_filename = file_name.replace("-meta.txt", ".wav")
            audio_path = os.path.join(dir_path, audio_filename)
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                if os.path.exists(audio_path):
                    voice_id = file_name.split("-meta.txt")[0]
                    voices.append({
                        "id": f"common_{voice_id}",
                        "name": data.get("name"),
                        "voice_type": data.get("voice"),
                        "seed": data.get("seed"),
                        "text": data.get("text"),
                        "tag": "TTS Studio",
                        "is_default": True,
                        "created_at": None
                    })
            except Exception as e:
                print(f"Error loading system voice {file_name}: {e}")
    return voices


def _current_user_from_request(request: Request, db: Session):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(models.User).filter(models.User.id == int(user_id)).first()


@router.get("/api/saved-voices")
def get_saved_voices(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    voices = db.query(models.SavedVoice).filter(models.SavedVoice.owner_id == user.id).order_by(models.SavedVoice.created_at.desc()).all()
    
    default_voices = get_default_system_voices()
    client_voices = [
        {
            "id": v.id, 
            "name": v.name, 
            "voice_type": v.voice_type, 
            "seed": v.seed, 
            "created_at": v.created_at,
            "tag": None
        } 
        for v in voices
    ]
    
    return {"saved_voices": default_voices + client_voices}


@router.post("/api/saved-voices")
def create_saved_voice(req: SavedVoiceRequest, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    voice = models.SavedVoice(name=req.name, voice_type=req.voice_type, seed=req.seed, owner_id=user.id)
    db.add(voice)
    db.commit()
    db.refresh(voice)
    return {"status": "ok", "id": voice.id}


@router.delete("/api/saved-voices/{voice_id}")
def delete_saved_voice(voice_id: str, request: Request, db: Session = Depends(get_db)):
    if voice_id.startswith("common_"):
        raise HTTPException(status_code=400, detail="Không thể xóa giọng mặc định của hệ thống")
        
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
        
    try:
        vid = int(voice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    voice = db.query(models.SavedVoice).filter(models.SavedVoice.id == vid, models.SavedVoice.owner_id == user.id).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Saved voice not found")
    db.delete(voice)
    db.commit()
    return {"status": "ok"}


def _iter_file_range(file_path: str, start: int = 0, end: int = None, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as file_handle:
        file_handle.seek(start)
        remaining = None if end is None else end - start + 1
        while True:
            read_size = chunk_size if remaining is None else min(chunk_size, remaining)
            if read_size <= 0:
                break
            data = file_handle.read(read_size)
            if not data:
                break
            yield data
            if remaining is not None:
                remaining -= len(data)
                if remaining <= 0:
                    break


@router.get("/api/library")
def get_audio_library(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    audios = db.query(models.GeneratedAudio).filter(models.GeneratedAudio.owner_id == user.id).order_by(models.GeneratedAudio.created_at.desc()).all()
    return {"items": [{"id": audio.id, "file_name": audio.file_name, "file_path": audio.file_path, "storage_provider": audio.storage_provider, "audio_url": audio.audio_url, "created_at": audio.created_at, "expires_at": audio.expires_at} for audio in audios]}

@router.get("/api/audio/{file_name}")
def stream_audio(file_name: str, request: Request, db: Session = Depends(get_db)):
    audio = db.query(models.GeneratedAudio).filter(models.GeneratedAudio.file_name == file_name).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio file not found")
    if (audio.storage_provider or get_storage_provider().name).lower() != "local":
        return RedirectResponse(url=audio.audio_url, status_code=307)
    file_path = audio.file_path
    if not os.path.exists(file_path):
        provider = get_storage_provider()
        if hasattr(provider, "base_dir"):
            user_subdir = f"user_{audio.owner_id}" if audio.owner_id else ""
            file_path = os.path.join(str(provider.base_dir), user_subdir, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file missing on disk")
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    if range_header:
        range_value = range_header.replace("bytes=", "").strip()
        start_str, end_str = range_value.split("-", 1)
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        headers = {"Content-Range": f"bytes {start}-{end}/{file_size}", "Accept-Ranges": "bytes", "Content-Length": str(end - start + 1)}
        return StreamingResponse(_iter_file_range(file_path, start, end), status_code=206, media_type="audio/wav", headers=headers)
    return StreamingResponse(_iter_file_range(file_path), media_type="audio/wav", headers={"Accept-Ranges": "bytes", "Content-Length": str(file_size)})


@router.delete("/api/library/{audio_id}")
def delete_audio_library_item(audio_id: int, request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    audio = db.query(models.GeneratedAudio).filter(models.GeneratedAudio.id == audio_id, models.GeneratedAudio.owner_id == user.id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio file not found")
    delete_audio_file(audio, db)
    return {"status": "ok"}