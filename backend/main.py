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

# Táº¡o DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Batch TTS Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api"):
        response = await call_next(request)
        # Avoid logging the admin stats/request-stats queries themselves to prevent self-looping logs
        if not "/admin/system-stats" in path and not "/admin/request-stats" in path:
            from database import SessionLocal
            db = SessionLocal()
            try:
                log_entry = models.RequestLog(
                    path=path,
                    method=request.method,
                    status_code=response.status_code
                )
                db.add(log_entry)
                db.commit()
            except Exception as e:
                print(f"Error logging request: {e}")
            finally:
                db.close()
        return response
    return await call_next(request)

from services.queue_manager import queue_manager, start_session_cleaner

@app.on_event("startup")
def startup_event():
    queue_manager.start()
    start_session_cleaner()

@app.on_event("shutdown")
def shutdown_event():
    queue_manager.stop()

# Import routers
from routers import auth, tts, jobs, library, documents, admin

app.include_router(auth.router)
app.include_router(tts.router)
app.include_router(jobs.router)
app.include_router(library.router)
app.include_router(documents.router)
app.include_router(admin.router)
