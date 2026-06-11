import threading
import time
import os
from database import SessionLocal
from models import FileTask, BatchJob, Settings
from services.tts_provider import TTSProvider

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
                        
                        # Gọi TTS Provider với Auto-Retry
                        provider = TTSProvider(api_key=api_key)
                        max_retries = 3
                        for attempt in range(max_retries):
                            try:
                                success = provider.process_text_to_speech(text, output_path, job.voice, model_name=model_name)
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
