import threading
import time
import os
from database import SessionLocal
from models import FileTask, BatchJob, Settings
from services.tts_provider import TTSProvider

class QueueManager:
    def __init__(self):
        self.is_running = False
        self.thread = None

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
                        
                        # Lấy API Key và Model Name từ setting
                        settings_api = db.query(Settings).filter(Settings.key == "api_key").first()
                        api_key = settings_api.value if settings_api else None
                        
                        settings_model = db.query(Settings).filter(Settings.key == "model_name").first()
                        model_name = settings_model.value if settings_model else "gemini-2.5-flash-preview-tts"
                        
                        # Gọi TTS Provider
                        provider = TTSProvider(api_key=api_key)
                        success = provider.process_text_to_speech(text, output_path, job.voice, model_name=model_name)
                        
                        if success:
                            task.status = "Done"
                            task.output_path = output_path
                        else:
                            task.status = "Error"
                            task.error_message = "API Call failed"
                            
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
