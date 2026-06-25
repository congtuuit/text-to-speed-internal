import sys
# Fix Windows encoding: force UTF-8 Ã„â€˜Ã¡Â»Æ’ print Unicode khÃƒÂ´ng lÃ¡Â»â€”i charmap
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import threading
import time
import os
from database import SessionLocal
from models import FileTask, BatchJob, Settings
from services.tts_provider import TTSProvider
from services.storage_service import register_audio_file

import requests
import subprocess
import shutil

def adjust_audio_speed_ffmpeg(input_path: str, output_path: str, speed: float) -> bool:
    """SÃ¡Â»Â­ dÃ¡Â»Â¥ng FFmpeg Ã„â€˜Ã¡Â»Æ’ thay Ã„â€˜Ã¡Â»â€¢i tÃ¡Â»â€˜c Ã„â€˜Ã¡Â»â„¢ audio. TrÃ¡ÂºÂ£ vÃ¡Â»Â True nÃ¡ÂºÂ¿u thÃƒÂ nh cÃƒÂ´ng."""
    if speed == 1.0:
        if input_path != output_path:
            shutil.copy2(input_path, output_path)
        return True
    
    try:
        # filter atempo limits: 0.5 to 100.0. For <0.5, we would need to chain it.
        # But we only support 0.5 to 2.0 anyway.
        cmd = [
            "ffmpeg", "-y", 
            "-i", input_path, 
            "-filter:a", f"atempo={speed}", 
            output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return True
        else:
            print(f"FFmpeg Error: {res.stderr.decode('utf-8', errors='replace')}")
            return False
    except Exception as e:
        print(f"FFmpeg Exception: {e}")
        return False



# ---------------------------------------------------------------------------
# Thread-safe round-robin key rotator (chÃ¡Â»â€° dÃƒÂ¹ng cho FPT)
# ---------------------------------------------------------------------------

class FPTKeyRotator:
    """
    PhÃƒÂ¢n phÃ¡Â»â€˜i API key theo round-robin, Ã„â€˜Ã¡ÂºÂ£m bÃ¡ÂºÂ£o mÃ¡Â»â€”i thÃ¡Â»Âi Ã„â€˜iÃ¡Â»Æ’m
    khÃƒÂ´ng cÃƒÂ³ 2 worker nÃƒÂ o Ã„â€˜ang dÃƒÂ¹ng cÃƒÂ¹ng 1 key.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._keys: list[str] = []
        self._index: int = 0             # con trÃ¡Â»Â round-robin toÃƒÂ n cÃ¡Â»Â¥c
        self._in_use: set[str] = set()   # key Ã„â€˜ang bÃ¡Â»â€¹ 1 worker giÃ¡Â»Â¯

    def load(self, keys: list[str]):
        """CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t danh sÃƒÂ¡ch key (gÃ¡Â»Âi mÃ¡Â»â€”i khi settings thay Ã„â€˜Ã¡Â»â€¢i)."""
        with self._lock:
            self._keys = list(keys)
            self._index = 0
            # XÃƒÂ³a nhÃ¡Â»Â¯ng key Ã„â€˜ÃƒÂ£ bÃ¡Â»â€¹ gÃ¡Â»Â¡ khÃ¡Â»Âi danh sÃƒÂ¡ch in_use
            self._in_use = {k for k in self._in_use if k in self._keys}

    def acquire(self) -> str | None:
        """
        LÃ¡ÂºÂ¥y key tiÃ¡ÂºÂ¿p theo theo round-robin mÃƒÂ  chÃ†Â°a bÃ¡Â»â€¹ worker nÃƒÂ o giÃ¡Â»Â¯.
        TrÃ¡ÂºÂ£ vÃ¡Â»Â None nÃ¡ÂºÂ¿u khÃƒÂ´ng cÃƒÂ³ key khÃ¡ÂºÂ£ dÃ¡Â»Â¥ng.
        """
        with self._lock:
            n = len(self._keys)
            if n == 0:
                return None
            for _ in range(n):
                key = self._keys[self._index % n]
                self._index = (self._index + 1) % n
                if key not in self._in_use:
                    self._in_use.add(key)
                    return key
            # TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ key Ã„â€˜ang bÃ¡Â»â€¹ giÃ¡Â»Â¯ Ã¢â‚¬â€ fallback: trÃ¡ÂºÂ£ vÃ¡Â»Â key round-robin bÃ¡ÂºÂ¥t kÃ¡Â»Â³
            key = self._keys[self._index % n]
            self._index = (self._index + 1) % n
            return key

    def release(self, key: str):
        """GiÃ¡ÂºÂ£i phÃƒÂ³ng key sau khi worker hoÃƒÂ n thÃƒÂ nh task."""
        with self._lock:
            self._in_use.discard(key)

    def clear_in_use(self):
        """GiÃ¡ÂºÂ£i phÃƒÂ³ng TÃ¡ÂºÂ¤T CÃ¡ÂºÂ¢ key Ã„â€˜ang bÃ¡Â»â€¹ giÃ¡Â»Â¯ (gÃ¡Â»Âi khi reset-stuck)."""
        with self._lock:
            released = set(self._in_use)
            self._in_use.clear()
            if released:
                print(f"FPTKeyRotator: force-released {len(released)} key(s): {[k[-6:] for k in released]}")

    def all_keys(self) -> list[str]:
        with self._lock:
            return list(self._keys)

    def in_use_count(self) -> int:
        with self._lock:
            return len(self._in_use)


# Singleton rotator Ã¢â‚¬â€œ Ã„â€˜Ã†Â°Ã¡Â»Â£c chia sÃ¡ÂºÂ» bÃ¡Â»Å¸i tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ workers
fpt_key_rotator = FPTKeyRotator()

# Semaphore giÃ¡Â»â€ºi hÃ¡ÂºÂ¡n sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng request Ã„â€˜Ã¡Â»â€œng thÃ¡Â»Âi Ã„â€˜Ã¡ÂºÂ¿n Self-hosted provider
self_hosted_semaphore = threading.Semaphore(2)


# ---------------------------------------------------------------------------
# FPT TTS helper
# ---------------------------------------------------------------------------

def _chunk_text_fpt(text: str, max_len: int = 200) -> list:
    words = text.split()
    chunks = []
    current_chunk = []
    current_len = 0
    for w in words:
        if current_len + len(w) + 1 > max_len and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [w]
            current_len = len(w)
        else:
            current_chunk.append(w)
            current_len += len(w) + 1
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks


def process_fpt_tts(text: str, output_path: str, voice: str, speed: float, keys: list) -> bool:
    """
    XÃ¡Â»Â­ lÃƒÂ½ TTS vÃ¡Â»â€ºi FPT AI. ThÃ¡Â»Â­ tÃ¡Â»Â«ng key theo thÃ¡Â»Â© tÃ¡Â»Â± keys Ã„â€˜Ã†Â°Ã¡Â»Â£c truyÃ¡Â»Ân vÃƒÂ o.
    HÃƒÂ m nÃƒÂ y dÃƒÂ¹ng cho test-voice (khÃƒÂ´ng cÃ¡ÂºÂ§n rotator).
    """
    if not keys:
        print("No FPT API keys provided.")
        return False

    chunks = _chunk_text_fpt(text, 200)

    import tempfile

    chunk_files = []
    success_all = True

    for i, chunk in enumerate(chunks):
        chunk_success = False
        for key in keys:
            try:
                res = requests.post(
                    "https://api.fpt.ai/hmi/tts/v5",
                    headers={
                        "accept": "application/json, text/plain, */*",
                        "api-key": key,
                        "content-type": "application/x-www-form-urlencoded",
                        "speed": str(speed),
                        "voice": voice
                    },
                    data=chunk.encode("utf-8"),
                    timeout=30
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("error") == 0 and "async" in data:
                        async_url = data["async"]
                        max_retries = 30
                        for _ in range(max_retries):
                            time.sleep(2)
                            audio_res = requests.get(async_url)
                            if audio_res.status_code == 200 and 'json' not in audio_res.headers.get('content-type', '').lower():
                                fd, temp_file = tempfile.mkstemp(suffix=".mp3")
                                os.close(fd)
                                with open(temp_file, "wb") as f:
                                    f.write(audio_res.content)
                                chunk_files.append(temp_file)
                                chunk_success = True
                                break
                if chunk_success:
                    break
            except Exception as e:
                print(f"FPT TTS Error with key {key}: {e}")
                continue

        if not chunk_success:
            success_all = False
            break

    if success_all and len(chunk_files) == len(chunks) and len(chunks) > 0:
        try:
            with open(output_path, "wb") as f_out:
                for temp_file in chunk_files:
                    with open(temp_file, "rb") as f_in:
                        f_out.write(f_in.read())
        except Exception as e:
            print("Error merging FPT audio chunks:", e)
            success_all = False
    else:
        success_all = False

    for temp_file in chunk_files:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass

    return success_all


def _process_fpt_tts_with_rotator(
    text: str,
    output_path: str,
    voice: str,
    speed: float,
    rotator: "FPTKeyRotator",
    worker_name: str = "Worker"
) -> bool:
    """
    PhiÃƒÂªn bÃ¡ÂºÂ£n dÃƒÂ¹ng cho worker Ã¢â‚¬â€ lÃ¡ÂºÂ¥y key qua rotator, tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng fallback sang key khÃƒÂ¡c nÃ¡ÂºÂ¿u lÃ¡Â»â€”i.
    Log chi tiÃ¡ÂºÂ¿t tÃ¡Â»Â«ng bÃ†Â°Ã¡Â»â€ºc: key, HTTP status, async polling, kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£.
    """
    import tempfile

    all_keys = rotator.all_keys()
    if not all_keys:
        print(f"[{worker_name}] FPT: No API keys in rotator.")
        return False

    # LÃ¡ÂºÂ¥y key Ã†Â°u tiÃƒÂªn (round-robin, khÃƒÂ´ng trÃƒÂ¹ng worker khÃƒÂ¡c nÃ¡ÂºÂ¿u cÃƒÂ³ thÃ¡Â»Æ’)
    primary_key = rotator.acquire()
    if not primary_key:
        print(f"[{worker_name}] FPT: Could not acquire key from rotator.")
        return False

    key_label = f"...{primary_key[-6:]}"  # chÃ¡Â»â€° hiÃ¡Â»â€¡n 6 kÃƒÂ½ tÃ¡Â»Â± cuÃ¡Â»â€˜i Ã„â€˜Ã¡Â»Æ’ bÃ¡ÂºÂ£o mÃ¡ÂºÂ­t
    print(f"[{worker_name}] FPT: acquired key {key_label} (pool={len(all_keys)} keys)")

    # ThÃ¡Â»Â© tÃ¡Â»Â± thÃ¡Â»Â­: primary_key trÃ†Â°Ã¡Â»â€ºc, rÃ¡Â»â€œi cÃƒÂ¡c key cÃƒÂ²n lÃ¡ÂºÂ¡i
    keys_to_try = [primary_key] + [k for k in all_keys if k != primary_key]

    chunks = _chunk_text_fpt(text, 200)
    total_chunks = len(chunks)
    chunk_files = []
    success_all = True

    print(f"[{worker_name}] FPT: {total_chunks} chunk(s) to process, voice={voice}, speed={speed}")

    try:
        for i, chunk in enumerate(chunks):
            chunk_label = f"chunk[{i+1}/{total_chunks}]"
            chunk_success = False

            for key in keys_to_try:
                key_tag = f"...{key[-6:]}"
                try:
                    print(f"[{worker_name}] FPT {chunk_label}: POST Ã¢â€ â€™ key={key_tag}")
                    res = requests.post(
                        "https://api.fpt.ai/hmi/tts/v5",
                        headers={
                            "accept": "application/json, text/plain, */*",
                            "api-key": key,
                            "content-type": "application/x-www-form-urlencoded",
                            "speed": str(speed),
                            "voice": voice
                        },
                        data=chunk.encode("utf-8"),
                        timeout=30
                    )
                    print(f"[{worker_name}] FPT {chunk_label}: HTTP {res.status_code}")

                    if res.status_code == 200:
                        data = res.json()
                        fpt_error = data.get("error")
                        async_url = data.get("async", "")
                        print(f"[{worker_name}] FPT {chunk_label}: error={fpt_error}, async_url={'yes' if async_url else 'no'}")

                        if fpt_error == 0 and async_url:
                            for poll_attempt in range(30):
                                time.sleep(2)
                                audio_res = requests.get(async_url, timeout=15)
                                content_type = audio_res.headers.get('content-type', '')
                                print(f"[{worker_name}] FPT {chunk_label}: poll #{poll_attempt+1} Ã¢â€ â€™ HTTP {audio_res.status_code}, content-type={content_type[:40]}")

                                if audio_res.status_code == 404:
                                    print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€” HTTP 404 (Job expired/lost). Retrying with next key...")
                                    break

                                if audio_res.status_code == 200 and 'json' not in content_type.lower():
                                    fd, temp_file = tempfile.mkstemp(suffix=".mp3")
                                    os.close(fd)
                                    with open(temp_file, "wb") as f:
                                        f.write(audio_res.content)
                                    chunk_files.append(temp_file)
                                    chunk_success = True
                                    print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€œ audio ready ({len(audio_res.content)} bytes)")
                                    break
                            else:
                                print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€” polling timeout (30 attempts)")
                        else:
                            print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€” bad response body: {str(data)[:120]}")
                    else:
                        print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€” HTTP error body: {res.text[:120]}")

                    if chunk_success:
                        break

                except Exception as e:
                    print(f"[{worker_name}] FPT {chunk_label}: Ã¢Å“â€” exception key={key_tag}: {e}")
                    continue

            if not chunk_success:
                print(f"[{worker_name}] FPT {chunk_label}: FAILED all keys, aborting.")
                success_all = False
                break

        if success_all and len(chunk_files) == len(chunks) and len(chunks) > 0:
            try:
                with open(output_path, "wb") as f_out:
                    for temp_file in chunk_files:
                        with open(temp_file, "rb") as f_in:
                            f_out.write(f_in.read())
                print(f"[{worker_name}] FPT: all {total_chunks} chunk(s) merged Ã¢â€ â€™ {output_path}")
            except Exception as e:
                print(f"[{worker_name}] FPT: merge error: {e}")
                success_all = False
        else:
            success_all = False

    finally:
        rotator.release(primary_key)
        print(f"[{worker_name}] FPT: released key {key_label}")
        for temp_file in chunk_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass

    return success_all


LAST_SELF_HOSTED_SEED = None

def process_self_hosted_tts(text: str, output_path: str, voice: str, url: str, seed_val: int = None, keep_voice_val: bool = False, worker_name: str = "Backend") -> bool:
    """XÃ¡Â»Â­ lÃƒÂ½ TTS vÃ¡Â»â€ºi Self-hosted OmniVoice, cÃƒÂ³ chia nhÃ¡Â»  vÃ„Æ’n bÃ¡ÂºÂ£n Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh timeout."""
    global LAST_SELF_HOSTED_SEED
    if seed_val is None:
        import random
        seed_val = random.randint(1, 1000000000)
        
    chunks = _chunk_text_fpt(text, 200)
    import tempfile
    import wave
    
    chunk_files = []
    success_all = True
    total_chunks = len(chunks)
    
    for i, chunk in enumerate(chunks):
        payload = {
            "text": chunk,
            "voice": voice
        }
        if seed_val is not None:
            payload["seed"] = seed_val
        if keep_voice_val:
            payload["keep_voice"] = keep_voice_val
            
        max_chunk_retries = 3
        for attempt in range(max_chunk_retries):
            try:
                with self_hosted_semaphore:
                    res = requests.post(url, json=payload, timeout=120)
                if res.status_code == 200:
                    fd, temp_file_path = tempfile.mkstemp(suffix=".wav")
                    os.close(fd)
                    with open(temp_file_path, "wb") as f:
                        f.write(res.content)
                    chunk_files.append(temp_file_path)
                    break  # ThÃƒÂ nh cÃƒÂ´ng, thoÃƒÂ¡t vÃƒÂ²ng lÃ¡ÂºÂ·p retry
                else:
                    if attempt == max_chunk_retries - 1:
                        success_all = False
                        print(f"[{worker_name}] Self-hosted API Error on chunk {i+1}/{total_chunks}: {res.text}")
                        break
                    print(f"[{worker_name}] Retry {attempt+1}/{max_chunk_retries} for chunk {i+1} due to status {res.status_code}")
                    time.sleep(2)
            except Exception as e:
                if attempt == max_chunk_retries - 1:
                    success_all = False
                    print(f"[{worker_name}] Self-hosted exception on chunk {i+1}/{total_chunks}: {e}")
                    break
                print(f"[{worker_name}] Retry {attempt+1}/{max_chunk_retries} for chunk {i+1} due to exception: {e}")
                time.sleep(2)
                
        if not success_all:
            break
            
    if success_all and len(chunk_files) == total_chunks and total_chunks > 0:
        try:
            data = []
            params = None
            for audio_file in chunk_files:
                with wave.open(audio_file, 'rb') as w:
                    if not params:
                        params = w.getparams()
                    data.append(w.readframes(w.getnframes()))
            with wave.open(output_path, 'wb') as output_wav:
                output_wav.setparams(params)
                for d in data:
                    output_wav.writeframes(d)
        except Exception as e:
            print(f"[{worker_name}] Error merging self-hosted audio chunks: {e}")
            success_all = False
    else:
        success_all = False
        
    for temp_file_path in chunk_files:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass
                
    return success_all


# ---------------------------------------------------------------------------

# QueueManager
# ---------------------------------------------------------------------------

class QueueManager:
    def __init__(self):
        self.is_running = False
        self.is_paused = False
        self.threads = []
        self.max_workers = 3
        self.db_lock = threading.Lock()

    def set_workers(self, num: int):
        self.max_workers = max(1, min(10, num))
        if self.is_running:
            while len(self.threads) < self.max_workers:
                t = threading.Thread(target=self._worker_loop, daemon=True)
                t.start()
                self.threads.append(t)
            print(f"QueueManager adjusted to {self.max_workers} workers.")

    def resume(self):
        self.is_paused = False
        print("QueueManager resumed.")

    def start(self):
        if not self.is_running:
            # Load max_workers tÃ¡Â»Â« DB (nÃ¡ÂºÂ¿u cÃƒÂ³) Ã¢â‚¬â€ trÃƒÂ¡nh reset vÃ¡Â»Â default khi restart
            try:
                db = SessionLocal()
                setting = db.query(Settings).filter(Settings.key == "max_workers").first()
                if setting and setting.value:
                    self.max_workers = max(1, min(10, int(setting.value)))
                    print(f"QueueManager loaded max_workers={self.max_workers} from DB.")
                db.close()
            except Exception as e:
                print(f"QueueManager: Could not load max_workers from DB: {e}")

            # Load FPT keys vÃƒÂ o rotator
            try:
                db = SessionLocal()
                keys_setting = db.query(Settings).filter(Settings.key == "fpt_api_keys").first()
                if keys_setting and keys_setting.value:
                    keys = [
                        k.split('|')[1].strip() if '|' in k else k.strip()
                        for k in keys_setting.value.split('\n')
                        if k.strip()
                    ]
                    fpt_key_rotator.load(keys)
                    print(f"QueueManager loaded {len(keys)} FPT key(s) into rotator.")
                db.close()
            except Exception as e:
                print(f"QueueManager: Could not load FPT keys: {e}")

            # Reset task bÃ¡Â»â€¹ kÃ¡ÂºÂ¹t Ã¡Â»Å¸ "Processing" (do server restart giÃ¡Â»Â¯a chÃ¡Â»Â«ng)
            try:
                db = SessionLocal()
                stuck = db.query(FileTask).filter(FileTask.status == "Processing").all()
                if stuck:
                    for t in stuck:
                        t.status = "Pending"
                    db.commit()
                    print(f"QueueManager: reset {len(stuck)} stuck 'Processing' task(s) Ã¢â€ â€™ 'Pending'.")
                db.close()
            except Exception as e:
                print(f"QueueManager: Could not reset stuck tasks: {e}")

            self.is_running = True
            for i in range(self.max_workers):
                t = threading.Thread(target=self._worker_loop, daemon=True, name=f"Worker-{i}")
                t.start()
                self.threads.append(t)
            print(f"QueueManager started with {self.max_workers} workers.")

    def stop(self):
        self.is_running = False
        for t in self.threads:
            if t.is_alive():
                t.join(timeout=1.0)
        self.threads.clear()
        print("QueueManager stopped.")

    def ensure_workers(self):
        """Ã„ÂÃ¡ÂºÂ£m bÃ¡ÂºÂ£o Ã„â€˜Ã¡Â»Â§ sÃ¡Â»â€˜ worker Ã„â€˜ang chÃ¡ÂºÂ¡y. TÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng restart nÃ¡ÂºÂ¿u thread chÃ¡ÂºÂ¿t."""
        with self.db_lock:
            alive = [t for t in self.threads if t.is_alive()]
            self.threads = alive
            needed = self.max_workers - len(alive)
            for i in range(needed):
                t = threading.Thread(target=self._worker_loop, daemon=True, name=f"Worker-restart-{i}")
                t.start()
                self.threads.append(t)
            if needed > 0:
                print(f"QueueManager: restarted {needed} dead worker(s). Total alive: {len(self.threads)}")
        return needed

    def status(self):
        """TrÃ¡ÂºÂ£ vÃ¡Â»Â trÃ¡ÂºÂ¡ng thÃƒÂ¡i hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i cÃ¡Â»Â§a queue manager."""
        alive = [t for t in self.threads if t.is_alive()]
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "max_workers": self.max_workers,
            "total_threads": len(self.threads),
            "alive_threads": len(alive),
            "workers": [
                {"name": t.name, "alive": t.is_alive(), "daemon": t.daemon}
                for t in self.threads
            ]
        }


    def _worker_loop(self):
        worker_name = threading.current_thread().name
        print(f"[{worker_name}] started.")
        while self.is_running:
            # --- BÃ†Â°Ã¡Â»â€ºc 1: dÃ¡Â»Ân dead threads, kiÃ¡Â»Æ’m tra xem mÃƒÂ¬nh cÃƒÂ³ thÃ¡Â»Â«a khÃƒÂ´ng ---
            with self.db_lock:
                self.threads = [t for t in self.threads if t.is_alive()]
                if len(self.threads) > self.max_workers:
                    if threading.current_thread() in self.threads:
                        self.threads.remove(threading.current_thread())
                    print(f"[{worker_name}] exiting (excess worker).")
                    break

            if self.is_paused:
                time.sleep(2)
                continue

            db = SessionLocal()
            try:
                # --- BÃ†Â°Ã¡Â»â€ºc 2: lÃ¡ÂºÂ¥y 1 task (critical section ngÃ¡ÂºÂ¯n gÃ¡Â»Ân) ---
                task = None
                task_id = None
                task_file_name = None
                task_file_path = None
                task_job_id = None

                with self.db_lock:
                    from sqlalchemy import func
                    # 1. Count active jobs per user
                    active_job_counts = db.query(
                        BatchJob.owner_id,
                        func.count(BatchJob.id).label("count")
                    ).filter(
                        BatchJob.status == "Processing"
                    ).group_by(
                        BatchJob.owner_id
                    ).all()

                    # Find users who have reached the limit of 2 concurrent jobs
                    MAX_CONCURRENT_JOBS = 2
                    overlimit_users = [
                        row.owner_id for row in active_job_counts
                        if row.owner_id is not None and row.count >= MAX_CONCURRENT_JOBS
                    ]

                    # 2. Query pending tasks where the job owner is not overlimit
                    query = db.query(FileTask).join(BatchJob)
                    if overlimit_users:
                        query = query.filter(BatchJob.owner_id.not_in(overlimit_users))

                    task = query.filter(FileTask.status == "Pending").first()

                    if task:
                        task.status = "Processing"
                        # Set job status to Processing if it's still Pending
                        job_obj = db.query(BatchJob).filter(BatchJob.id == task.job_id).first()
                        if job_obj and job_obj.status == "Pending":
                            job_obj.status = "Processing"

                        db.commit()
                        task_id = task.id
                        task_file_name = task.file_name
                        task_file_path = task.file_path
                        task_job_id = task.job_id

                if not task:
                    time.sleep(2)
                    continue

                print(f"[{worker_name}] processing task {task_id}: {task_file_name}")

                # Fresh query Ã„â€˜Ã¡Â»Æ’ lÃ¡ÂºÂ¥y job data (trÃƒÂ¡nh lazy-load session expire)
                job = db.query(BatchJob).filter(BatchJob.id == task_job_id).first()
                if not job:
                    print(f"[{worker_name}] job not found for task {task_id}, skip.")
                    t_obj = db.query(FileTask).filter(FileTask.id == task_id).first()
                    if t_obj:
                        t_obj.status = "Error"
                        t_obj.error_message = "Job not found"
                        db.commit()
                    continue

                final_status = "Error"
                final_error = "Unknown error"
                final_output = None

                try:
                    try:
                        with open(task_file_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                    except UnicodeDecodeError:
                        try:
                            with open(task_file_path, 'r', encoding='utf-16') as f:
                                text = f.read()
                        except UnicodeDecodeError:
                            with open(task_file_path, 'r', encoding='cp1258', errors='ignore') as f:
                                text = f.read()

                    base_name = os.path.splitext(task_file_name)[0]
                    job_provider = job.provider or "gemini"
                    ext = ".wav" if job_provider == "self_hosted" else ".mp3"
                    output_path = os.path.join(job.output_dir, f"{base_name}{ext}")

                    settings_api = db.query(Settings).filter(Settings.key == "api_key").first()
                    api_key = settings_api.value if settings_api else None
                    model_name = job.model_name or "gemini-2.5-flash-preview-tts"

                    if job_provider == "gemini":
                        tts_provider_obj = TTSProvider(api_key=api_key)
                    else:
                        tts_provider_obj = None

                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            if job_provider == "gemini":
                                success = tts_provider_obj.process_text_to_speech(
                                    text, output_path, job.voice, model_name=model_name
                                )
                            elif job_provider == "fpt":
                                # Reload keys vÃƒÂ o rotator nÃ¡ÂºÂ¿u cÃ¡ÂºÂ§n
                                if len(fpt_key_rotator.all_keys()) == 0:
                                    setting_keys = db.query(Settings).filter(Settings.key == "fpt_api_keys").first()
                                    if setting_keys and setting_keys.value:
                                        keys = [
                                            k.split('|')[1].strip() if '|' in k else k.strip()
                                            for k in setting_keys.value.split('\n')
                                            if k.strip()
                                        ]
                                        fpt_key_rotator.load(keys)

                                setting_speed = db.query(Settings).filter(Settings.key == "fpt_speed").first()
                                speed_val = float(setting_speed.value) if setting_speed else 0.8
                                success = _process_fpt_tts_with_rotator(
                                    text, output_path, job.voice, speed_val, fpt_key_rotator,
                                    worker_name=worker_name
                                )
                            elif job_provider == "self_hosted":
                                setting_url = db.query(Settings).filter(Settings.key == "self_hosted_url").first()
                                self_hosted_url = setting_url.value if setting_url else "http://localhost:7860"
                                url = f"{self_hosted_url.rstrip('/')}/api/tts"
                                
                                # Use voice directly from job configuration
                                cleaned_voice = job.voice
                                presets = {"female", "male", "female, low pitch", "female, high pitch", "male, low pitch", "male, high pitch"}
                                if cleaned_voice not in presets and not (cleaned_voice and cleaned_voice.startswith("voice_")):
                                    # Fallback to saved self_hosted_voice or default
                                    setting_voice = None
                                    if job.owner_id:
                                        setting_voice = db.query(Settings).filter(Settings.key == f"{job.owner_id}_self_hosted_voice").first()
                                    if not setting_voice:
                                        setting_voice = db.query(Settings).filter(Settings.key == "self_hosted_voice").first()
                                    cleaned_voice = setting_voice.value if (setting_voice and setting_voice.value) else "female"

                                # Read seed and keep_voice parameters from Settings DB
                                setting_seed = None
                                if job.owner_id:
                                    setting_seed = db.query(Settings).filter(Settings.key == f"{job.owner_id}_self_hosted_seed").first()
                                if not setting_seed:
                                    setting_seed = db.query(Settings).filter(Settings.key == "self_hosted_seed").first()
                                seed_val = int(setting_seed.value) if (setting_seed and setting_seed.value and setting_seed.value.strip()) else None
                                if seed_val is None:
                                    import hashlib
                                    seed_val = int(hashlib.md5(f"job_seed_{job.id}".encode()).hexdigest(), 16) % 1000000000
                                
                                setting_keep = db.query(Settings).filter(Settings.key == "self_hosted_keep_voice").first()
                                keep_voice_val = (setting_keep.value == "true") if setting_keep else False
                                
                                success = process_self_hosted_tts(
                                    text=text,
                                    output_path=output_path,
                                    voice=cleaned_voice,
                                    url=url,
                                    seed_val=seed_val,
                                    keep_voice_val=keep_voice_val,
                                    worker_name=worker_name
                                )
                            else:
                                success = False

                            if success:
                                final_status = "Done"
                                final_output = output_path
                                final_error = None
                                print(f"[{worker_name}] task {task_id} DONE.")
                                break
                            else:
                                if attempt == max_retries - 1:
                                    final_status = "Error"
                                    final_error = "API Call failed after retries"
                                    print(f"[{worker_name}] task {task_id} FAILED after {max_retries} retries.")

                        except Exception as e:
                            err_msg = str(e).lower()
                            if "quota" in err_msg or "exhausted" in err_msg or ("invalid" in err_msg and "key" in err_msg):
                                self.is_paused = True
                                final_status = "Pending"
                                final_error = "Paused due to API Key/Quota limit."
                                print(f"[{worker_name}] API quota/key error Ã¢â€ â€™ queue paused: {e}")
                                break
                            else:
                                if attempt == max_retries - 1:
                                    final_status = "Error"
                                    final_error = str(e)
                                    print(f"[{worker_name}] task {task_id} error: {e}")
                                else:
                                    print(f"[{worker_name}] task {task_id} retry {attempt+1}/{max_retries}: {e}")
                                    time.sleep(2)

                except Exception as e:
                    final_status = "Error"
                    final_error = str(e)
                    print(f"[{worker_name}] task {task_id} outer error: {e}")

                # --- BÃ†Â°Ã¡Â»â€ºc 4: lÃ†Â°u kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£ ---
                # OWNERSHIP CHECK: kiÃ¡Â»Æ’m tra task cÃƒÂ³ cÃƒÂ²n thuÃ¡Â»â„¢c vÃ¡Â»Â worker nÃƒÂ y khÃƒÂ´ng
                # (reset-stuck cÃƒÂ³ thÃ¡Â»Æ’ Ã„â€˜ÃƒÂ£ set lÃ¡ÂºÂ¡i task Ã¢â€ â€™ Pending trong khi worker Ã„â€˜ang poll FPT)
                try:
                    task_obj = db.query(FileTask).filter(FileTask.id == task_id).first()
                    if not task_obj:
                        print(f"[{worker_name}] task {task_id} not found, discarding result.")
                    elif task_obj.status == "Pending":
                        # Task Ã„â€˜ÃƒÂ£ bÃ¡Â»â€¹ reset bÃ¡Â»Å¸i reset-stuck Ã¢â‚¬â€ KHÃƒâ€NG ghi Ã„â€˜ÃƒÂ¨, Ã„â€˜Ã¡Â»Æ’ worker khÃƒÂ¡c pickup
                        print(f"[{worker_name}] task {task_id} was reset to Pending by reset-stuck, discarding result.")
                    else:
                        # task vÃ¡ÂºÂ«n Ã¡Â»Å¸ Processing Ã¢â€ â€™ Ã„â€˜ÃƒÂ¢y vÃ¡ÂºÂ«n lÃƒÂ  cÃ¡Â»Â§a mÃƒÂ¬nh, lÃ†Â°u bÃƒÂ¬nh thÃ†Â°Ã¡Â»Âng
                        task_obj.status = final_status
                        task_obj.error_message = final_error
                        if final_output:
                            task_obj.output_path = final_output
                        db.commit()
                        print(f"[{worker_name}] task {task_id} saved Ã¢â€ â€™ {final_status}")
                except Exception as e:
                    print(f"[{worker_name}] DB commit error for task {task_id}: {e}")


                # --- BÃ†Â°Ã¡Â»â€ºc 5: kiÃ¡Â»Æ’m tra job hoÃƒÂ n thÃƒÂ nh ---
                try:
                    pending_count = db.query(FileTask).filter(
                        FileTask.job_id == task_job_id,
                        FileTask.status.in_(["Pending", "Processing"])
                    ).count()
                    if pending_count == 0:
                        job_obj = db.query(BatchJob).filter(BatchJob.id == task_job_id).first()
                        if job_obj and job_obj.status != "Completed":
                            job_obj.status = "Completed"
                            db.commit()
                            print(f"[{worker_name}] job {task_job_id} COMPLETED.")

                            if job_obj.is_docx_job in (1, 2) and job_obj.final_output_path:
                                import wave
                                import shutil
                                all_tasks = db.query(FileTask).filter(
                                    FileTask.job_id == task_job_id
                                ).order_by(FileTask.file_name).all()
                                valid_audios = [
                                    t.output_path for t in all_tasks
                                    if t.output_path and os.path.exists(t.output_path)
                                ]
                                if valid_audios:
                                    try:
                                        data = []
                                        params = None
                                        for audio_file in valid_audios:
                                            with wave.open(audio_file, 'rb') as w:
                                                if not params:
                                                    params = w.getparams()
                                                data.append(w.readframes(w.getnframes()))
                                        with wave.open(job_obj.final_output_path, 'wb') as output_wav:
                                            output_wav.setparams(params)
                                            for d in data:
                                                output_wav.writeframes(d)
                                        print(f"[{worker_name}] joined DOCX audio Ã¢â€ â€™ {job_obj.final_output_path}")
                                        try:
                                            register_audio_file(job_obj.final_output_path, file_name=os.path.basename(job_obj.final_output_path), db=db)
                                        except Exception as upload_error:
                                            print(f"[{worker_name}] storage register error for DOCX output: {upload_error}")

                                        # Äiá»u chá»‰nh tá»‘c Ä‘á»™ audio náº¿u cáº§n
                                        setting_speed = None
                                        if job_obj.owner_id:
                                            setting_speed = db.query(Settings).filter(Settings.key == f"{job_obj.owner_id}_output_speed").first()
                                        if not setting_speed:
                                            setting_speed = db.query(Settings).filter(Settings.key == "output_speed").first()
                                        output_speed = float(setting_speed.value) if setting_speed else 1.0
                                        if output_speed != 1.0:
                                            print(f"[{worker_name}] Adjusting speed to {output_speed}x using FFmpeg...")
                                            temp_speed_path = job_obj.final_output_path + ".temp.wav"
                                            if adjust_audio_speed_ffmpeg(job_obj.final_output_path, temp_speed_path, output_speed):
                                                shutil.move(temp_speed_path, job_obj.final_output_path)
                                                print(f"[{worker_name}] Speed adjusted successfully.")
                                            else:
                                                print(f"[{worker_name}] Speed adjustment failed. Using original file.")
                                                if os.path.exists(temp_speed_path):
                                                    os.remove(temp_speed_path)

                                        shutil.rmtree(job_obj.output_dir, ignore_errors=True)
                                    except Exception as e:
                                        print(f"[{worker_name}] error joining audio: {e}")
                except Exception as e:
                    print(f"[{worker_name}] job-completion check error: {e}")

            except Exception as e:
                print(f"[{worker_name}] loop error: {e}")
                time.sleep(2)
            finally:
                db.close()

        print(f"[{worker_name}] exited.")


# Singleton instance
queue_manager = QueueManager()


# ---------------------------------------------------------------------------
# Session cache cleaner – runs every 60 minutes in a background thread.
# Removes session folders under cache/sessions/ that are older than 60 mins.
# Folders modified within the last 60 mins are left untouched.
# ---------------------------------------------------------------------------

CACHE_SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache", "sessions")
CACHE_MAX_AGE_SECS = 60 * 60   # 60 minutes
CACHE_CHECK_INTERVAL_SECS = 60 * 60  # run cleanup every 60 minutes

def _cleanup_old_sessions():
    """Delete session folders older than CACHE_MAX_AGE_SECS."""
    if not os.path.isdir(CACHE_SESSIONS_DIR):
        return
    now = time.time()
    removed = 0
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
            print(f"[CacheClean] Error checking {entry.name}: {exc}")
    if removed:
        print(f"[CacheClean] Cleaned {removed} session(s).")
    else:
        print("[CacheClean] No expired sessions found.")

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
