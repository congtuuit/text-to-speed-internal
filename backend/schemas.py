from pydantic import BaseModel
from typing import List, Optional

class ScanRequest(BaseModel):
    directory: str

class JobRequest(BaseModel):
    input_dir: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

class DocxJobRequest(BaseModel):
    docx_path: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

class BatchDocxRequest(BaseModel):
    folder_path: str
    output_dir: str
    voice: str
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    output_speed: float = 1.0

from services.docx_helper import split_docx_to_txt

class TestVoiceRequest(BaseModel):
    voice: str
    text: str = "Xin chào, đây là giọng đọc thử."
    api_key: str = ""
    model_name: str = "gemini-2.5-flash-preview-tts"
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    self_hosted_url: str = "http://localhost:7860"
    seed: str = ""
    keep_voice: str = "false"
    output_speed: float = 1.0
    is_sample: bool = False

class ChunkSessionRequest(TestVoiceRequest):
    session_id: str
    chunk_index: int

class MergeSessionRequest(BaseModel):
    session_id: str

class CheckConnectionRequest(BaseModel):
    self_hosted_url: str

class WarmupRequest(BaseModel):
    voice: str
    text: str = "Xin chào, đây là giọng đọc thử."
    seed: str = ""
    self_hosted_url: str = "http://localhost:7860"
    keep_voice: str = "true"

class SettingsRequest(BaseModel):
    api_key: str = ""
    model_name: str = ""
    provider: str = "self_hosted"
    fpt_api_keys: str = ""
    fpt_speed: float = 0.8
    max_workers: int = 3
    self_hosted_url: str = "http://localhost:7860"
    self_hosted_voice: str = "female"
    self_hosted_seed: str = ""
    self_hosted_keep_voice: str = "false"
    output_speed: float = 1.0

class SavedVoiceRequest(BaseModel):
    name: str
    voice_type: str
    seed: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str