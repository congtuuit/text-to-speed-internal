import os
import time
import shutil
import threading

# ---------------------------------------------------------------------------
# Session cache cleaner – runs every 60 minutes in a background thread.
# Removes session folders under cache/sessions/ that are older than 60 mins.
# Folders modified within the last 60 mins are left untouched.
# ---------------------------------------------------------------------------

CACHE_SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache", "sessions")
TEMP_BATCH_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "temp_batch")
CACHE_MAX_AGE_SECS = 60 * 60   # 60 minutes
CACHE_CHECK_INTERVAL_SECS = 60 * 60  # run cleanup every 60 minutes

def _cleanup_old_sessions():
    """Delete session folders and temp batch files older than CACHE_MAX_AGE_SECS."""
    now = time.time()
    removed = 0
    
    # 1. Clean CACHE_SESSIONS_DIR
    if os.path.isdir(CACHE_SESSIONS_DIR):
        for entry in os.scandir(CACHE_SESSIONS_DIR):
            if not entry.is_dir():
                continue
            try:
                age = now - entry.stat().st_mtime
                if age > CACHE_MAX_AGE_SECS:
                    shutil.rmtree(entry.path, ignore_errors=True)
                    removed += 1
                    print(f"[CacheClean] Removed old session: {entry.name} (age {int(age)}s)")
            except Exception as exc:
                print(f"[CacheClean] Error checking session {entry.name}: {exc}")
                
    # 2. Clean TEMP_BATCH_DIR
    if os.path.isdir(TEMP_BATCH_DIR):
        for entry in os.scandir(TEMP_BATCH_DIR):
            try:
                age = now - entry.stat().st_mtime
                if age > CACHE_MAX_AGE_SECS:
                    if entry.is_dir():
                        shutil.rmtree(entry.path, ignore_errors=True)
                    else:
                        os.remove(entry.path)
                    removed += 1
                    print(f"[CacheClean] Removed old temp batch item: {entry.name} (age {int(age)}s)")
            except Exception as exc:
                print(f"[CacheClean] Error checking temp batch item {entry.name}: {exc}")
                
    if removed:
        print(f"[CacheClean] Cleaned {removed} session/batch items.")
    else:
        print("[CacheClean] No expired session or batch items found.")

def _session_cleaner_loop():
    """Background loop: wait CACHE_CHECK_INTERVAL_SECS, then clean, repeat."""
    while True:
        time.sleep(CACHE_CHECK_INTERVAL_SECS)
        try:
            _cleanup_old_sessions()
        except Exception as exc:
            print(f"[CacheClean] Unexpected error: {exc}")

def start_session_cleaner():
    """Spawn the daemon cleaner thread (call once from app startup)."""
    t = threading.Thread(target=_session_cleaner_loop, daemon=True, name="SessionCacheCleaner")
    t.start()
    print(f"[CacheClean] Started – will clean sessions older than {CACHE_MAX_AGE_SECS//60} min every {CACHE_CHECK_INTERVAL_SECS//60} min.")
