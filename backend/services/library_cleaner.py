import os
import time
import threading
from datetime import datetime, timedelta
from database import SessionLocal
from models import GeneratedAudio
from services.storage_service import delete_audio_file

# ---------------------------------------------------------------------------
# Library cleaner – runs every 24 hours in a background thread.
# Removes GeneratedAudio records and their physical files that are older than 30 days.
# ---------------------------------------------------------------------------

LIBRARY_MAX_AGE_DAYS = 30
LIBRARY_CHECK_INTERVAL_SECS = 24 * 60 * 60  # run cleanup every 24 hours

def _cleanup_old_library_audios():
    """Delete audio files and database records older than LIBRARY_MAX_AGE_DAYS."""
    removed = 0
    cutoff_date = datetime.utcnow() - timedelta(days=LIBRARY_MAX_AGE_DAYS)
    
    db = SessionLocal()
    try:
        old_audios = db.query(GeneratedAudio).filter(GeneratedAudio.created_at < cutoff_date).all()
        for audio in old_audios:
            try:
                # delete_audio_file handles both physical file deletion and DB record removal
                delete_audio_file(audio, db)
                removed += 1
                print(f"[LibraryClean] Removed old audio: {audio.file_name} (created at {audio.created_at})")
            except Exception as exc:
                print(f"[LibraryClean] Error deleting audio {audio.id}: {exc}")
    except Exception as exc:
        print(f"[LibraryClean] Database query error: {exc}")
    finally:
        db.close()
        
    if removed:
        print(f"[LibraryClean] Cleaned {removed} expired library items.")
    else:
        print("[LibraryClean] No expired library items found.")

def _library_cleaner_loop():
    """Background loop: wait LIBRARY_CHECK_INTERVAL_SECS, then clean, repeat."""
    # Run the first cleanup a few seconds after startup
    time.sleep(10)
    
    while True:
        try:
            _cleanup_old_library_audios()
        except Exception as exc:
            print(f"[LibraryClean] Unexpected error: {exc}")
            
        time.sleep(LIBRARY_CHECK_INTERVAL_SECS)

def start_library_cleaner():
    """Spawn the daemon cleaner thread (call once from app startup)."""
    t = threading.Thread(target=_library_cleaner_loop, daemon=True, name="LibraryCleaner")
    t.start()
    print(f"[LibraryClean] Started – will clean audios older than {LIBRARY_MAX_AGE_DAYS} days every {LIBRARY_CHECK_INTERVAL_SECS//3600} hours.")
