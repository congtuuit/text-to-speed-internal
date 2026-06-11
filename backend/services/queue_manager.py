import threading
import time
import os
from database import SessionLocal
from models import FileTask, BatchJob, Settings
from services.tts_provider import TTSProvider

# --- VieNeu Lazy Loading ---
_vieneu_tts_instance = None
_current_vieneu_mode = None
_current_vieneu_url = None

def get_vieneu_instance(mode="remote", api_base="http://localhost:23333/v1"):
    global _vieneu_tts_instance
    global _current_vieneu_mode
    global _current_vieneu_url
    
    if _vieneu_tts_instance is not None:
        if _current_vieneu_mode != mode or _current_vieneu_url != api_base:
            try:
                _vieneu_tts_instance.close()
            except:
                pass
            _vieneu_tts_instance = None
            
    if _vieneu_tts_instance is None:
        from vieneu import Vieneu
        if mode == "remote":
            _vieneu_tts_instance = Vieneu(mode="remote", api_base=api_base, model_name="pnnbao-ump/VieNeu-TTS-v2")
        else:
            import os
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            os.environ["HF_HOME"] = os.path.join(project_root, ".models_cache", "huggingface")
            os.environ["TORCH_HOME"] = os.path.join(project_root, ".models_cache", "torch")
            _vieneu_tts_instance = Vieneu()
            
        _current_vieneu_mode = mode
        _current_vieneu_url = api_base
        
    return _vieneu_tts_instance

def get_vieneu_voices():
    return [] # deprecated
# ---------------------------

import time
import requests

def process_fpt_tts(text: str, output_path: str, voice: str, speed: float, keys: list) -> bool:
    if not keys:
        print("No FPT API keys provided.")
        return False
        
    for key in keys:
        try:
            res = requests.post(
                "https://api.fpt.ai/hmi/tts/v5",
                headers={
                    "api-key": key,
                    "speed": str(speed),
                    "voice": voice
                },
                data=text.encode("utf-8"),
                timeout=30
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("error") == 0 and "async" in data:
                    async_url = data["async"]
                    # Polling
                    max_retries = 30
                    for _ in range(max_retries):
                        time.sleep(2)
                        audio_res = requests.get(async_url)
                        # FPT returns the audio file directly when ready, so status_code will be 200 and content will be audio.
                        # Wait, what if it returns JSON or 404 while processing? 
                        # We assume if it returns 200 and content-type is audio or we just check if it's not a small json.
                        if audio_res.status_code == 200 and 'json' not in audio_res.headers.get('content-type', '').lower():
                            with open(output_path, "wb") as f:
                                f.write(audio_res.content)
                            return True
            # If it failed or polling timed out, loop to the next key
        except Exception as e:
            print(f"FPT TTS Error with key {key}: {e}")
            continue
            
    return False

class QueueManager:
    def __init__(self):
        self.is_running = False
        self.is_paused = False
        self.thread = None

    def resume(self):
        self.is_paused = False
        print("QueueManager resumed.")

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._worker_loop, daemon=True)
            self.thread.start()
            print("QueueManager started.")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join()
            print("QueueManager stopped.")

    def _worker_loop(self):
        while self.is_running:
            if self.is_paused:
                time.sleep(2)
                continue

            db = SessionLocal()
            try:
                # Tìm 1 task đang pending
                task = db.query(FileTask).filter(FileTask.status == "Pending").first()
                if task:
                    job = task.job
                    
                    # Cập nhật trạng thái
                    task.status = "Processing"
                    db.commit()
                    
                    try:
                        # Đọc nội dung file
                        with open(task.file_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        
                        # Chuẩn bị tên file output
                        base_name = os.path.splitext(task.file_name)[0]
                        output_path = os.path.join(job.output_dir, f"{base_name}.mp3")
                        
                        # Lấy API Key từ setting
                        settings_api = db.query(Settings).filter(Settings.key == "api_key").first()
                        api_key = settings_api.value if settings_api else None
                        
                        # Lấy model_name từ job (cố định theo lúc tạo job)
                        model_name = job.model_name if job.model_name else "gemini-2.5-flash-preview-tts"
                        
                        # Lấy provider
                        job_provider = job.provider if job.provider else "gemini"
                        if job_provider == "gemini":
                            provider = TTSProvider(api_key=api_key)
                        else:
                            provider = None
                        max_retries = 3
                        for attempt in range(max_retries):
                            try:
                                if job_provider == "gemini":
                                    success = provider.process_text_to_speech(text, output_path, job.voice, model_name=model_name)
                                elif job_provider == "vieneu":
                                    setting_mode = db.query(Settings).filter(Settings.key == "vieneu_mode").first()
                                    setting_url = db.query(Settings).filter(Settings.key == "vieneu_url").first()
                                    v_mode = setting_mode.value if setting_mode else "remote"
                                    v_url = setting_url.value if setting_url else "http://localhost:23333/v1"
                                    
                                    vieneu_tts = get_vieneu_instance(mode=v_mode, api_base=v_url)
                                    voice_data = vieneu_tts.get_preset_voice(job.voice)
                                    audio_data = vieneu_tts.infer(text, voice=voice_data)
                                    vieneu_tts.save(audio_data, output_path)
                                    success = True
                                elif job_provider == "fpt":
                                    setting_keys = db.query(Settings).filter(Settings.key == "fpt_api_keys").first()
                                    setting_speed = db.query(Settings).filter(Settings.key == "fpt_speed").first()
                                    keys_str = setting_keys.value if setting_keys else ""
                                    speed_val = float(setting_speed.value) if setting_speed else 0.8
                                    
                                    keys = [k.split('|')[1].strip() if '|' in k else k.strip() for k in keys_str.split('\n') if k.strip()]
                                    success = process_fpt_tts(text, output_path, job.voice, speed_val, keys)
                                else:
                                    success = False
                                if success:
                                    task.status = "Done"
                                    task.output_path = output_path
                                    break
                                else:
                                    if attempt == max_retries - 1:
                                        task.status = "Error"
                                        task.error_message = "API Call failed after retries"
                            except Exception as e:
                                err_msg = str(e).lower()
                                # Check if it's a quota or invalid key error
                                if "quota" in err_msg or "invalid" in err_msg or "exhausted" in err_msg or "key" in err_msg:
                                    self.is_paused = True
                                    task.status = "Pending"
                                    task.error_message = "Paused due to API Key/Quota limit. Waiting for new key."
                                    break
                                else:
                                    if attempt == max_retries - 1:
                                        task.status = "Error"
                                        task.error_message = str(e)
                                    else:
                                        time.sleep(2) # Đợi trước khi retry
                    except Exception as e:
                        task.status = "Error"
                        task.error_message = str(e)
                    
                    db.commit()
                    
                    # Kiểm tra xem toàn bộ job đã xong chưa
                    pending_tasks = db.query(FileTask).filter(
                        FileTask.job_id == job.id, 
                        FileTask.status.in_(["Pending", "Processing"])
                    ).count()
                    if pending_tasks == 0:
                        job.status = "Completed"
                        db.commit()
                        
                        if job.is_docx_job == 1 and job.final_output_path:
                            import wave
                            import shutil
                            # Nối audio
                            all_tasks = db.query(FileTask).filter(FileTask.job_id == job.id).order_by(FileTask.file_name).all()
                            valid_audios = [t.output_path for t in all_tasks if t.output_path and os.path.exists(t.output_path)]
                            
                            if valid_audios:
                                try:
                                    data = []
                                    params = None
                                    for audio_file in valid_audios:
                                        with wave.open(audio_file, 'rb') as w:
                                            if not params:
                                                params = w.getparams()
                                            data.append(w.readframes(w.getnframes()))
                                            
                                    with wave.open(job.final_output_path, 'wb') as output_wav:
                                        output_wav.setparams(params)
                                        for d in data:
                                            output_wav.writeframes(d)
                                    print(f"Joined DOCX audio to: {job.final_output_path}")
                                    
                                    # Dọn dẹp folder chunks
                                    shutil.rmtree(job.output_dir, ignore_errors=True)
                                except Exception as e:
                                    print(f"Error joining audio: {e}")
                        
                else:
                    # Không có task nào, ngủ 1 chút
                    time.sleep(2)
            except Exception as e:
                print(f"QueueManager Error: {e}")
                time.sleep(2)
            finally:
                db.close()
                
# Singleton instance
queue_manager = QueueManager()
