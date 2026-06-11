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
    status = Column(String, default="Pending") # Pending, Processing, Completed, Error
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("FileTask", back_populates="job")


class FileTask(Base):
    __tablename__ = "file_tasks"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("batch_jobs.id"))
    file_name = Column(String, index=True)
    file_path = Column(String)
    status = Column(String, default="Pending") # Pending, Processing, Done, Error
    error_message = Column(String, nullable=True)
    output_path = Column(String, nullable=True)

    job = relationship("BatchJob", back_populates="tasks")


class Settings(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
