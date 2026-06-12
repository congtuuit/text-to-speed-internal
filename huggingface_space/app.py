import sys
import os

# Fix Windows encoding: force stdout/stderr sang UTF-8 để log Unicode không bị lỗi
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import re
import time
import numpy as np
import soundfile as sf
import tempfile
from vieneu import Vieneu

# FastAPI & Gradio Imports
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import gradio as gr
import uvicorn

# Load model globally (cached)
print("Loading VieNeu-TTS model... Please wait.")
tts = Vieneu()
print("VieNeu-TTS model loaded successfully!")

# Initialize FastAPI App
app = FastAPI(title="VieNeu-TTS API Server")

# Ensure static files directory exists and mount it
temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
os.makedirs(temp_dir, exist_ok=True)
app.mount("/files", StaticFiles(directory=temp_dir), name="files")

def cleanup_temp_audio(directory: str, max_age_seconds: int = 600):
    """
    Quét thư mục chứa file âm thanh tạm và xóa các file đã cũ hơn max_age_seconds (mặc định 10 phút).
    """
    try:
        now = time.time()
        cleaned_count = 0
        for filename in os.listdir(directory):
            if filename.startswith("tts_result_") and filename.endswith(".wav"):
                file_path = os.path.join(directory, filename)
                file_age = now - os.path.getmtime(file_path)
                if file_age > max_age_seconds:
                    try:
                        os.remove(file_path)
                        cleaned_count += 1
                    except Exception as ex:
                        print(f"Failed to delete temp file {filename}: {ex}")
        if cleaned_count > 0:
            print(f"Cleanup: Auto-deleted {cleaned_count} old audio file(s) from cache.")
    except Exception as e:
        print(f"Error during temp audio cleanup: {e}")

def split_text_by_punctuation(text: str, max_len: int = 200) -> list[str]:
    """
    Tách văn bản tiếng Việt thành các đoạn nhỏ hơn max_len ký tự,
    ưu tiên ngắt ở các dấu câu (chấm, phẩy, hỏi, chấm than, xuống dòng)
    để giọng đọc tự nhiên và tránh lỗi mô hình.
    """
    sentences = re.split(r'(?<=[.?!;,\n])\s+', text.strip())
    
    chunks = []
    current_chunk = []
    current_len = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        # Nếu một câu đơn dài hơn max_len, cắt nhỏ theo từ
        if len(sentence) > max_len:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
            
            words = sentence.split()
            temp_words = []
            temp_len = 0
            for word in words:
                if temp_len + len(word) + 1 > max_len:
                    if temp_words:
                        chunks.append(" ".join(temp_words))
                    temp_words = [word]
                    temp_len = len(word)
                else:
                    temp_words.append(word)
                    temp_len += len(word) + 1
            if temp_words:
                chunks.append(" ".join(temp_words))
        else:
            if current_len + len(sentence) + 1 > max_len:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_len = len(sentence)
            else:
                current_chunk.append(sentence)
                current_len += len(sentence) + 1
                
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

def generate_speech(text: str) -> str:
    """
    Nhận văn bản tiếng Việt, tự động cắt thành các câu ngắn dưới 200 ký tự,
    gọi mô hình VieNeu-TTS sinh âm thanh cho từng câu, ghép nối lại
    và trả về đường dẫn file WAV kết quả.
    """
    if not text or not text.strip():
        raise ValueError("Văn bản đầu vào không được để trống.")
        
    if len(text) > 5000:
        raise ValueError(f"Văn bản quá dài ({len(text)} ký tự). Giới hạn tối đa là 5000 ký tự.")
        
    # Dọn dẹp file tạm cũ trước khi sinh file mới
    cleanup_temp_audio(temp_dir, max_age_seconds=600)
        
    # Cắt văn bản thành các câu dưới 200 ký tự
    chunks = split_text_by_punctuation(text, max_len=200)
    print(f"Split input text into {len(chunks)} chunk(s). Processing...")
    
    audio_segments = []
    
    for i, chunk in enumerate(chunks):
        print(f"Generating audio for chunk {i+1}/{len(chunks)}: '{chunk[:30]}...'")
        # Sinh âm thanh từ model
        audio = tts.infer(text=chunk)
        if audio is not None:
            audio_segments.append(audio)
            
    if not audio_segments:
        raise Exception("Không thể sinh âm thanh từ mô hình VieNeu-TTS.")
        
    # Ghép nối các mảng numpy âm thanh lại với nhau
    combined_audio = np.concatenate(audio_segments)
    
    # Tạo file wav kết quả duy nhất
    fd, output_path = tempfile.mkstemp(suffix=".wav", prefix="tts_result_", dir=temp_dir)
    os.close(fd)
    
    # Lấy sample rate mặc định của model hoặc fallback về 24000 Hz
    sample_rate = getattr(tts, "sample_rate", getattr(tts, "samplerate", 24000))
    sf.write(output_path, combined_audio, sample_rate)
    
    print(f"Speech generation completed! Saved to: {output_path}")
    return output_path

# REST API Schema
class TTSRequest(BaseModel):
    text: str

# REST API Endpoint
@app.post("/api/tts")
async def api_tts(req: TTSRequest, request: Request):
    """
    REST API endpoint to generate Vietnamese speech.
    Accepts: JSON { "text": "văn bản" }
    Returns: JSON { "success": true, "audio_url": "url" }
    """
    try:
        output_path = generate_speech(req.text)
        filename = os.path.basename(output_path)
        base_url = str(request.base_url)
        audio_url = f"{base_url}files/{filename}"
        return {"success": True, "audio_url": audio_url}
    except ValueError as ve:
        return {"success": False, "error": str(ve)}
    except Exception as e:
        print(f"REST API Exception: {e}")
        return {"success": False, "error": "Lỗi hệ thống khi sinh giọng nói. Vui lòng thử lại sau."}

# Gradio wrapper function to handle user-friendly error display
def generate_speech_gradio(text: str) -> str:
    try:
        return generate_speech(text)
    except ValueError as ve:
        raise gr.Error(str(ve))
    except Exception as e:
        print(f"Gradio Exception: {e}")
        raise gr.Error(f"Đã xảy ra lỗi hệ thống: {str(e)}")

# Gradio Interface UI
demo = gr.Interface(
    fn=generate_speech_gradio,
    inputs=gr.Textbox(
        lines=5, 
        placeholder="Nhập văn bản tiếng Việt ở đây...", 
        label="Văn bản tiếng Việt"
    ),
    outputs=[
        gr.Audio(label="Nghe trực tiếp", type="filepath"), 
        gr.File(label="Tải file WAV")
    ],
    title="VieNeu-TTS Vietnamese Text To Speech",
    description="Chuyển văn bản tiếng Việt thành giọng nói bằng VieNeu-TTS (Giới hạn tối đa 5000 ký tự)"
)

# Mount Gradio app to FastAPI at a subpath "/gui" to avoid root conflicts
app = gr.mount_gradio_app(app, demo, path="/gui")

@app.get("/")
def redirect_to_gui():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/gui")

if __name__ == "__main__":
    # In Hugging Face Spaces, the environment already handles starting the server.
    # We only manually start uvicorn if we are running locally.
    if not os.environ.get("SPACE_ID"):
        port = int(os.environ.get("PORT", 7860))
        print(f"Starting server on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
