from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]
MAX_MESSAGE_CHARS = 1000
EMBEDDING_DIMENSIONS = 1536
MAX_IMAGES = 3
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
IMAGE_MAX_SIDE = 1024
IMAGE_QUALITY = 80
DEFAULT_PHOTO_TEXT = "Please look at this photo and tell me what you think."
UGANDA_LAT_RANGE = (-1.6, 4.4)
UGANDA_LON_RANGE = (29.4, 35.2)


class Settings(BaseSettings):
    """Application settings loaded from the project .env file."""

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore", env_ignore_empty=True)

    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 1440
    cookie_secure: bool = False
    cors_origins: str = "http://localhost:3000"

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = ""
    llm_supports_vision: bool = True
    llm_price_in_per_million: float | None = None
    llm_price_out_per_million: float | None = None

    embedding_model: str = ""
    embedding_api_key: str = ""
    embedding_base_url: str = ""

    isda_username: str = ""
    isda_password: str = ""

    chat_rate_limit_per_minute: int = 20
    agent_model_call_limit: int = 10
    agent_tool_call_limit: int = 10
    agent_recursion_limit: int = 30

    @field_validator("jwt_secret")
    @classmethod
    def secret_must_be_strong(cls, value: str) -> str:
        if len(value) < 16:
            raise ValueError(
                "JWT_SECRET must be at least 16 characters. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_embedding_key(self) -> str:
        return self.embedding_api_key or self.openrouter_api_key

    @property
    def resolved_embedding_base_url(self) -> str:
        return self.embedding_base_url or self.openrouter_base_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
