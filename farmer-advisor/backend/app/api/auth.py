from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import COOKIE_NAME, get_current_user
from app.api.schemas import LoginRequest, RegisterRequest, UserOut
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db import users

router = APIRouter(prefix="/api/auth", tags=["auth"])

_DUMMY_HASH = hash_password("not-a-real-password")


def _set_cookie(response: Response, user_id) -> None:
    settings = get_settings()
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(user_id),
        max_age=settings.jwt_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterRequest, response: Response):
    try:
        user = users.create_user(body.email, hash_password(body.password), body.full_name)
    except users.EmailAlreadyRegistered:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    _set_cookie(response, user["id"])
    return user


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response):
    user = users.get_user_by_email(body.email)
    hashed = user["password_hash"] if user else _DUMMY_HASH
    valid = verify_password(body.password, hashed)
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    _set_cookie(response, user["id"])
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return user
