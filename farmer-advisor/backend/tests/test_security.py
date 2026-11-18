from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core import security
from app.core.config import get_settings


def test_password_hash_roundtrip():
    hashed = security.hash_password("correct-horse")
    assert hashed != "correct-horse"
    assert security.verify_password("correct-horse", hashed)
    assert not security.verify_password("wrong", hashed)


def test_verify_password_with_bad_hash_is_false():
    assert security.verify_password("x", "not-a-hash") is False


def test_token_roundtrip():
    token = security.create_access_token("abc")
    assert security.decode_token(token)["sub"] == "abc"


def test_expired_token_rejected():
    payload = {"sub": "abc", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}
    token = jwt.encode(payload, get_settings().jwt_secret, algorithm="HS256")
    with pytest.raises(jwt.ExpiredSignatureError):
        security.decode_token(token)


def test_token_with_wrong_secret_rejected():
    token = jwt.encode({"sub": "abc"}, "another-secret-another-secret-12", algorithm="HS256")
    with pytest.raises(jwt.InvalidSignatureError):
        security.decode_token(token)
