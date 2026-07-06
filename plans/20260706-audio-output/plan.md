# Plan: Audio Output - Slugify + MP3 Convert

## Phase 01: Thiet ke kien truc & Nghien cuu hien trang
Status: COMPLETED

## Tasks Completed

### 1. Khao sat queue_manager.py - DONE
- Worker pool: 3 workers mac dinh (configurable 1-10 tu DB)
- Job completion flow: khi tat ca FileTasks cua 1 BatchJob Done -> merge WAV -> register library
- is_docx_job: 1 = tu DOCX upload, 2 = tu TXT batch (ca 2 deu can merge)
- Speed adjustment: dung FFmpeg, ap dung sau merge truoc convert

### 2. Phuong an ten file: slugify + timestamp - DONE
- text_utils.py: ham slugify() - strip dau, lowercase, replace ky tu dac biet -> '-'
- job_service.py: da ap dung slugified_name-{timestamp}.mp3 cho ca 3 nhanh
- BUG FIXED: thut le sai dong 94-96 trong vong for file_name in files

### 3. Phuong an convert WAV -> MP3 - DONE
- audio_utils.py: ham convert_wav_to_mp3_ffmpeg() - dung FFmpeg libmp3lame qscale 2
- queue_manager.py: tich hop vao completion flow:
  * Merge chunks -> *_merged_temp.wav
  * Adjust speed (neu != 1.0) -> overwrite temp WAV
  * Convert WAV -> MP3 (final path) -> xoa temp WAV
  * Fallback: neu FFmpeg fail -> rename WAV thanh .mp3

## Phase 02: Remaining Work - PENDING

### Chua xu ly:
- [ ] Self-hosted: chunk la .wav -> wave.open() OK
- [ ] Gemini/FPT: chunk la .mp3 -> wave.open() se FAIL! Can tach luong merge rieng cho mp3 chunks
- [ ] Kiem tra thuc te tren server
