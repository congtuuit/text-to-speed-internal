from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id = Column(Integer, primary_key=True, index=True)
    input_dir = Column(String, index=True)
    output_dir = Column(String)
    voice = Column(String)
    model_name = Column(String, default="gemini-2.5-flash-preview-tts")
    provider = Column(String, default="gemini")
    is_docx_job = Column(Integer, default=0)
    final_output_path = Column(String, nullable=True)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)

    tasks = relationship("FileTask", back_populates="job")


class FileTask(Base):
    __tablename__ = "file_tasks"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("batch_jobs.id"))
    file_name = Column(String, index=True)
    file_path = Column(String)
    status = Column(String, default="Pending")
    error_message = Column(String, nullable=True)
    output_path = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    job = relationship("BatchJob", back_populates="tasks")


class Settings(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class SavedVoice(Base):
    __tablename__ = "saved_voices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    voice_type = Column(String)
    seed = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GeneratedAudio(Base):
    __tablename__ = "generated_audios"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    storage_provider = Column(String, default="local")
    audio_url = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User")


class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, index=True)
    method = Column(String)
    status_code = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
