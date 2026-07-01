import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import boto3
from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models import GeneratedAudio


@dataclass
class StorageResult:
    file_name: str
    file_path: str
    storage_provider: str
    audio_url: str


class StorageProvider:
    name = 'base'

    def save(self, source_path: str, file_name: Optional[str] = None, owner_id: Optional[int] = None) -> StorageResult:
        raise NotImplementedError

    def get_url(self, file_name: str) -> str:
        raise NotImplementedError

    def delete(self, file_name: str, owner_id: Optional[int] = None) -> None:
        raise NotImplementedError


class LocalStorageProvider(StorageProvider):
    name = 'local'

    def __init__(self, base_dir: Optional[str] = None, public_base_url: Optional[str] = None):
        self.base_dir = Path(base_dir or os.getenv('STORAGE_LOCAL_DIR') or Path(__file__).resolve().parents[1] / 'storage' / 'audio_library')
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url or os.getenv('STORAGE_PUBLIC_BASE_URL', '').rstrip('/')

    def save(self, source_path: str, file_name: Optional[str] = None, owner_id: Optional[int] = None) -> StorageResult:
        file_name = file_name or Path(source_path).name
        user_subdir = f"user_{owner_id}" if owner_id else ""
        destination_dir = self.base_dir / user_subdir
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = destination_dir / file_name
        shutil.copy2(source_path, destination)
        return StorageResult(file_name=file_name, file_path=str(destination), storage_provider=self.name, audio_url=self.get_url(file_name))

    def get_url(self, file_name: str) -> str:
        if self.public_base_url:
            return f'{self.public_base_url}/api/audio/{quote(file_name)}'
        return f'/api/audio/{quote(file_name)}'

    def delete(self, file_name: str, owner_id: Optional[int] = None) -> None:
        user_subdir = f"user_{owner_id}" if owner_id else ""
        destination = self.base_dir / user_subdir / file_name
        if destination.exists():
            try:
                destination.unlink()
            except Exception as e:
                print(f"Warning: Could not delete physical file {destination}: {e}")


class R2AwsStorageProvider(StorageProvider):
    name = 'r2'

    def __init__(self):
        self.bucket_name = os.getenv('R2_BUCKET_NAME', '')
        self.endpoint_url = os.getenv('R2_ENDPOINT_URL', '')
        self.access_key_id = os.getenv('R2_ACCESS_KEY_ID', '')
        self.secret_access_key = os.getenv('R2_SECRET_ACCESS_KEY', '')
        self.public_base_url = os.getenv('R2_PUBLIC_BASE_URL', '').rstrip('/')
        if not all([self.bucket_name, self.endpoint_url, self.access_key_id, self.secret_access_key]):
            raise RuntimeError('Missing R2/S3 storage configuration')
        self.client = boto3.client('s3', endpoint_url=self.endpoint_url, aws_access_key_id=self.access_key_id, aws_secret_access_key=self.secret_access_key)

    def save(self, source_path: str, file_name: Optional[str] = None, owner_id: Optional[int] = None) -> StorageResult:
        file_name = file_name or Path(source_path).name
        key = f"user_{owner_id}/{file_name}" if owner_id else file_name
        self.client.upload_file(source_path, self.bucket_name, key)
        return StorageResult(file_name=file_name, file_path=key, storage_provider=self.name, audio_url=self.get_url(key))

    def get_url(self, file_name: str) -> str:
        if self.public_base_url:
            return f'{self.public_base_url}/{quote(file_name)}'
        return self.client.generate_presigned_url('get_object', Params={'Bucket': self.bucket_name, 'Key': file_name}, ExpiresIn=86400)

    def delete(self, file_name: str, owner_id: Optional[int] = None) -> None:
        self.client.delete_object(Bucket=self.bucket_name, Key=file_name)


_storage_provider: StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    global _storage_provider
    provider_name = os.getenv('STORAGE_PROVIDER', 'local').strip().lower()
    if _storage_provider is not None and _storage_provider.name == provider_name:
        return _storage_provider
    _storage_provider = R2AwsStorageProvider() if provider_name == 'r2' else LocalStorageProvider()
    return _storage_provider


def register_audio_file(source_path: str, file_name: Optional[str] = None, db: Session | None = None, owner_id: Optional[int] = None, expires_at: Optional[datetime] = None) -> GeneratedAudio:
    provider = get_storage_provider()
    saved = provider.save(source_path, file_name=file_name, owner_id=owner_id)
    session = db or SessionLocal()
    if expires_at is None:
        expires_at = datetime.utcnow() + timedelta(days=30)
    try:
        existing = session.query(GeneratedAudio).filter(GeneratedAudio.file_name == saved.file_name).first()
        if existing:
            existing.file_path = saved.file_path
            existing.storage_provider = saved.storage_provider
            existing.audio_url = saved.audio_url
            existing.created_at = datetime.utcnow()
            existing.expires_at = expires_at
            if owner_id is not None:
                existing.owner_id = owner_id
            audio = existing
        else:
            audio = GeneratedAudio(file_name=saved.file_name, file_path=saved.file_path, storage_provider=saved.storage_provider, audio_url=saved.audio_url, owner_id=owner_id, expires_at=expires_at)
            session.add(audio)
        session.commit()
        session.refresh(audio)
        return audio
    finally:
        if db is None:
            session.close()


def delete_audio_file(audio: GeneratedAudio, session: Session) -> None:
    provider_name = (audio.storage_provider or 'local').lower()
    provider = R2AwsStorageProvider() if provider_name == 'r2' else LocalStorageProvider()
    if provider_name == 'r2':
        provider.delete(audio.file_path)
    else:
        provider.delete(audio.file_name, owner_id=audio.owner_id)
    session.delete(audio)
    session.commit()
