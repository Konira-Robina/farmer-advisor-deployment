from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.config import MAX_MESSAGE_CHARS, UGANDA_LAT_RANGE, UGANDA_LON_RANGE


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    role: str


class ProfileIn(BaseModel):
    location_name: str | None = Field(default=None, min_length=1, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    farm_size_acres: float | None = Field(default=None, gt=0, le=10000)
    crops: list[str] | None = Field(default=None, max_length=10)
    language: str | None = Field(default=None, pattern=r"^[a-z]{2,3}$")
    reading_level: Literal["simple", "detailed"] | None = None

    @field_validator("crops")
    @classmethod
    def clean_crops(cls, value):
        if value is None:
            return value
        cleaned = []
        for crop in value:
            name = " ".join(crop.strip().lower().split())
            if not name or len(name) > 40:
                raise ValueError("Each crop name must be 1 to 40 characters.")
            if name not in cleaned:
                cleaned.append(name)
        return cleaned

    @model_validator(mode="after")
    def check_location(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Give both latitude and longitude, or neither.")
        if self.latitude is not None:
            in_lat = UGANDA_LAT_RANGE[0] <= self.latitude <= UGANDA_LAT_RANGE[1]
            in_lon = UGANDA_LON_RANGE[0] <= self.longitude <= UGANDA_LON_RANGE[1]
            if not (in_lat and in_lon):
                raise ValueError("The location must be within Uganda.")
        return self


class ProfileOut(BaseModel):
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    farm_size_acres: float | None = None
    crops: list[str] = []
    language: str = "en"
    reading_level: str = "simple"


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    thread_id: UUID | None = None

    @field_validator("message")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("The message is empty.")
        return value.strip()


class UsageOut(BaseModel):
    input_tokens: int
    output_tokens: int
    cost_usd: float | None


class ChatResponse(BaseModel):
    thread_id: UUID
    message_id: UUID
    reply: str
    escalated: bool
    usage: UsageOut


class ThreadOut(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime


class ImageOut(BaseModel):
    id: UUID
    url: str


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    rating: int | None = None
    images: list[ImageOut] = []


class ConfigOut(BaseModel):
    max_images: int
    max_image_mb: int
    vision_enabled: bool
    max_message_chars: int


class FeedbackIn(BaseModel):
    rating: Literal[-1, 1]
    comment: str | None = Field(default=None, max_length=500)


class FeedbackOut(BaseModel):
    message_id: UUID
    rating: int
    comment: str | None


class EscalationOut(BaseModel):
    id: UUID
    thread_id: UUID
    reason: str
    status: str
    created_at: datetime
    farmer_email: str
    farmer_name: str | None
    location_name: str | None
    latitude: float | None
    longitude: float | None


class EscalationUpdate(BaseModel):
    status: Literal["open", "reviewed", "closed"]


class PriceIn(BaseModel):
    crop: str = Field(min_length=1, max_length=40)
    market: str = Field(min_length=1, max_length=100)
    price_ugx_per_kg: float = Field(ge=0, le=1_000_000)
    recorded_on: date
    source: str | None = Field(default=None, max_length=200)


class PriceOut(BaseModel):
    id: UUID
    crop: str
    market: str
    price_ugx_per_kg: float
    recorded_on: date
