import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

AUTH_BEARER = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')
JWT_ISSUER = os.getenv('JWT_ISSUER', 'text-to-speed')
JWT_EXP_MINUTES = int(os.getenv('JWT_EXP_MINUTES', '10080'))
PBKDF2_ITERATIONS = int(os.getenv('PASSWORD_HASH_ITERATIONS', '210000'))


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _b64url_decode(value: str) -> bytes:
    padding = '=' * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)
    return 'pbkdf2_sha256${}${}${}'.format(PBKDF2_ITERATIONS, _b64url_encode(salt), _b64url_encode(derived))


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, iteration_text, salt_text, hash_text = encoded.split('$', 3)
        iterations = int(iteration_text)
        salt = _b64url_decode(salt_text)
        expected = _b64url_decode(hash_text)
        derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        return hmac.compare_digest(expected, derived)
    except Exception:
        return False


def create_jwt(payload: dict[str, Any], expires_minutes: int | None = None) -> str:
    header = {'alg': 'HS256', 'typ': 'JWT'}
    issued_at = int(time.time())
    expires_at = issued_at + 60 * (expires_minutes or JWT_EXP_MINUTES)
    body = dict(payload)
    body.update({'iss': JWT_ISSUER, 'iat': issued_at, 'exp': expires_at})
    signing_input = f"{_b64url_encode(json.dumps(header, separators=(',', ':')).encode())}.{_b64url_encode(json.dumps(body, separators=(',', ':')).encode())}"
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input.encode('ascii'), hashlib.sha256).digest()
    return f'{signing_input}.{_b64url_encode(signature)}'


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        header_text, body_text, signature_text = token.split('.')
        signing_input = f'{header_text}.{body_text}'
        signature = _b64url_decode(signature_text)
        expected = hmac.new(JWT_SECRET.encode('utf-8'), signing_input.encode('ascii'), hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail='Invalid authentication token')
        payload = json.loads(_b64url_decode(body_text))
        if payload.get('iss') != JWT_ISSUER:
            raise HTTPException(status_code=401, detail='Invalid authentication token')
        if int(payload.get('exp', 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail='Token expired')
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid authentication token')


def get_bearer_token(credentials: HTTPAuthorizationCredentials | None) -> str | None:
    return credentials.credentials if credentials else None
