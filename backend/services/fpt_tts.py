import threading
import time
import os
import requests
import tempfile

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

    text = text.lower()
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

    text = text.lower()

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
