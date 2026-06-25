import sys

# Fix Windows encoding: force stdout/stderr sang UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

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

from services.queue_manager import queue_manager

@app.on_event("startup")
def startup_event():
    queue_manager.start()

@app.on_event("shutdown")
def shutdown_event():
    queue_manager.stop()

# Import routers
from routers import auth, tts, jobs, library, documents

app.include_router(auth.router)
app.include_router(tts.router)
app.include_router(jobs.router)
app.include_router(library.router)
app.include_router(documents.router)
