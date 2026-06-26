import sys
# Fix Windows encoding: force UTF-8 để print Unicode không lỗi charmap
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import threading
import time
import os
import shutil
import wave

from database import SessionLocal
from models import FileTask, BatchJob, Settings
from services.tts_provider import TTSProvider
from services.storage_service import register_audio_file

# Import split components so they are available to other modules
from services.audio_speed import adjust_audio_speed_ffmpeg
from services.fpt_tts import FPTKeyRotator, fpt_key_rotator, process_fpt_tts, _process_fpt_tts_with_rotator
from services.self_hosted_tts import process_self_hosted_tts
from services.session_cleaner import start_session_cleaner


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

