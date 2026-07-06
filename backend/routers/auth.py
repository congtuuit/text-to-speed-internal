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

@router.post("/api/auth/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    from datetime import datetime
    user = models.User(
        email=email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="user",
        last_login_at=datetime.utcnow(),
        last_active_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _ts = int(time.time())
    workspace = models.Workspace(user_id=user.id, name=f"{req.full_name or email.split('@')[0]}-{_ts}", slug=f"ws-{user.id}-{_ts}")
    db.add(workspace)
    db.commit()
    token = create_jwt({"sub": str(user.id), "email": user.email, "role": user.role, "workspace_id": workspace.id})
    return {"token": token, "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "workspace_id": workspace.id, "workspace_name": workspace.name, "workspace_slug": workspace.slug}}



@router.post("/api/auth/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    from datetime import datetime
    user.last_login_at = datetime.utcnow()
    user.last_active_at = datetime.utcnow()
    db.commit()
    workspace = db.query(models.Workspace).filter(models.Workspace.user_id == user.id).first()
    if not workspace:
        _ts = int(time.time())
        workspace = models.Workspace(user_id=user.id, name=f"{user.full_name or email.split('@')[0]}-{_ts}", slug=f"ws-{user.id}-{_ts}")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    token = create_jwt({"sub": str(user.id), "email": user.email, "role": user.role, "workspace_id": workspace.id})
    return {"token": token, "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "workspace_id": workspace.id, "workspace_name": workspace.name, "workspace_slug": workspace.slug}}

@router.post("/api/auth/google")
def google_auth(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    import secrets
    credential = req.token
    if not credential:
        raise HTTPException(status_code=400, detail="Google credential token is required")
    
    # Verify Google token using tokeninfo API
    try:
        res = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}", timeout=5)
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")
        info = res.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify Google token: {str(e)}")
    
    # Validate payload details
    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google account")
        
    email = email.strip().lower()
    full_name = info.get("name") or email.split("@")[0]
    
    # Check if user already exists
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create a new user with Google login
        # Hash a secure random password since they won't use email/password login unless they reset it
        random_pwd = secrets.token_hex(16)
        user = models.User(
            email=email,
            password_hash=hash_password(random_pwd),
            full_name=full_name,
            role="user",
            is_active=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Get or create workspace
    from datetime import datetime
    user.last_login_at = datetime.utcnow()
    user.last_active_at = datetime.utcnow()
    db.commit()
    workspace = db.query(models.Workspace).filter(models.Workspace.user_id == user.id).first()
    if not workspace:
        _ts = int(time.time())
        workspace = models.Workspace(user_id=user.id, name=f"{user.full_name or email.split('@')[0]}-{_ts}", slug=f"ws-{user.id}-{_ts}")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
    # Create JWT session token
    token = create_jwt({"sub": str(user.id), "email": user.email, "role": user.role, "workspace_id": workspace.id})
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "workspace_id": workspace.id,
            "workspace_name": workspace.name,
            "workspace_slug": workspace.slug,
        }
    }



def _current_user_from_request(request: Request, db: Session):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        payload = decode_jwt(token)
    except Exception:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user:
        from datetime import datetime
        now = datetime.utcnow()
        if not user.last_active_at or (now - user.last_active_at).total_seconds() > 60:
            user.last_active_at = now
            try:
                db.commit()
            except Exception:
                db.rollback()
    return user

@router.get("/api/auth/me")
def me(request: Request, db: Session = Depends(get_db)):
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    workspace = db.query(models.Workspace).filter(models.Workspace.user_id == user.id).first()
    
    # Cấp lại token mới để gia hạn (Sliding Session)
    token = create_jwt({
        "sub": str(user.id), 
        "email": user.email, 
        "role": user.role, 
        "workspace_id": workspace.id if workspace else None
    })
    
    return {
        "user": {
            "id": user.id, 
            "email": user.email, 
            "full_name": user.full_name, 
            "role": user.role, 
            "workspace_id": workspace.id if workspace else None, 
            "workspace_name": workspace.name if workspace else None, 
            "workspace_slug": workspace.slug if workspace else None
        },
        "token": token
    }

