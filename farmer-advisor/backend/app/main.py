import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.agent.factory import agent_is_configured
from app.api import auth, chat, farm, officer, profile
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.pool import close_pool, database_is_up, open_pool

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    open_pool()
    yield
    close_pool()


app = FastAPI(title="Farmer Advisor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(chat.router)
app.include_router(farm.router)
app.include_router(officer.router)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "database": "up" if database_is_up() else "down",
        "advisor_configured": agent_is_configured(),
    }
