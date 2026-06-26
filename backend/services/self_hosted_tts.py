import threading
import time
import os
import requests
import tempfile
import wave
from services.fpt_tts import _chunk_text_fpt

self_hosted_semaphore = threading.Semaphore(20)

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

