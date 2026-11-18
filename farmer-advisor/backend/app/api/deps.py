import threading
import time
from collections import defaultdict, deque

import jwt
from fastapi import Depends, HTTPException, Request

from app.core.config import get_settings
from app.core.security import decode_token
from app.db import users

COOKIE_NAME = "access_token"


def get_current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        header = request.headers.get("Authorization", "")
        if header.lower().startswith("bearer "):
            token = header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    user = users.get_user_by_id(payload.get("sub"))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


def require_roles(*roles: str):
    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to do this.")
        return user

    return dependency


class RateLimiter:
    """Sliding-window limiter kept in memory. It works for a single server process."""

    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False, max(1, int(self.window - (now - hits[0])))
            hits.append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


chat_limiter = RateLimiter(limit=get_settings().chat_rate_limit_per_minute)


def chat_rate_limit(user: dict = Depends(get_current_user)) -> dict:
    allowed, retry_after = chat_limiter.allow(str(user["id"]))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )
    return user
