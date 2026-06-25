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

@router.get("/api/saved-voices")
def get_saved_voices(db: Session = Depends(get_db)):
    voices = db.query(models.SavedVoice).order_by(models.SavedVoice.created_at.desc()).all()
    return {"saved_voices": [{"id": v.id, "name": v.name, "voice_type": v.voice_type, "seed": v.seed, "created_at": v.created_at} for v in voices]}


@router.post("/api/saved-voices")
def create_saved_voice(req: SavedVoiceRequest, db: Session = Depends(get_db)):
    voice = models.SavedVoice(name=req.name, voice_type=req.voice_type, seed=req.seed)
    db.add(voice)
    db.commit()
    db.refresh(voice)
    return {"status": "ok", "id": voice.id}


@router.delete("/api/saved-voices/{voice_id}")
def delete_saved_voice(voice_id: int, db: Session = Depends(get_db)):
    voice = db.query(models.SavedVoice).filter(models.SavedVoice.id == voice_id).first()
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
def get_audio_library(db: Session = Depends(get_db)):
    audios = db.query(models.GeneratedAudio).order_by(models.GeneratedAudio.created_at.desc()).all()
    return {"items": [{"id": audio.id, "file_name": audio.file_name, "file_path": audio.file_path, "storage_provider": audio.storage_provider, "audio_url": audio.audio_url, "created_at": audio.created_at} for audio in audios]}



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
            file_path = os.path.join(str(provider.base_dir), file_name)
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
def delete_audio_library_item(audio_id: int, db: Session = Depends(get_db)):
    audio = db.query(models.GeneratedAudio).filter(models.GeneratedAudio.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio file not found")
    delete_audio_file(audio, db)
    return {"status": "ok"}


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


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str

