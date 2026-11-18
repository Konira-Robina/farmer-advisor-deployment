from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

from app.agent import runner
from app.agent.factory import get_checkpointer
from app.api.deps import chat_rate_limit, get_current_user
from app.api.schemas import (
    ChatRequest,
    ChatResponse,
    ConfigOut,
    FeedbackIn,
    FeedbackOut,
    ImageOut,
    MessageOut,
    ThreadOut,
)
from app.core.config import MAX_IMAGE_BYTES, MAX_IMAGES, MAX_MESSAGE_CHARS, get_settings
from app.core.images import ImageRejected, process_image
from app.db import chat as chat_db
from app.db import images as images_db

router = APIRouter(prefix="/api", tags=["chat"])


def _run(user: dict, thread_id, text: str, images: list[bytes] | None = None):
    try:
        return runner.run_chat(user, thread_id, text, images)
    except runner.ThreadNotFound:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    except runner.VisionUnavailable:
        raise HTTPException(status_code=400, detail="Photo analysis is not available right now.")
    except runner.AgentNotConfigured:
        raise HTTPException(status_code=503, detail="The advisor is not configured yet.")
    except runner.AgentUnavailable:
        raise HTTPException(status_code=503, detail="The advisor is temporarily unavailable. Please try again.")


@router.get("/config", response_model=ConfigOut)
def public_config():
    return ConfigOut(
        max_images=MAX_IMAGES,
        max_image_mb=MAX_IMAGE_BYTES // (1024 * 1024),
        vision_enabled=get_settings().llm_supports_vision,
        max_message_chars=MAX_MESSAGE_CHARS,
    )


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user: dict = Depends(chat_rate_limit)):
    return _run(user, body.thread_id, body.message)


@router.post("/chat/upload", response_model=ChatResponse)
def chat_with_photos(
    message: str = Form(default=""),
    thread_id: UUID | None = Form(default=None),
    photos: list[UploadFile] = File(default=[]),
    user: dict = Depends(chat_rate_limit),
):
    text = message.strip()
    if len(text) > MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=422, detail=f"Please keep your message under {MAX_MESSAGE_CHARS} characters.")
    if not text and not photos:
        raise HTTPException(status_code=422, detail="Write a message or add a photo.")
    if len(photos) > MAX_IMAGES:
        raise HTTPException(status_code=422, detail=f"You can send up to {MAX_IMAGES} photos at a time.")
    processed: list[bytes] = []
    for photo in photos:
        raw = photo.file.read(MAX_IMAGE_BYTES + 1)
        try:
            processed.append(process_image(raw))
        except ImageRejected as exc:
            raise HTTPException(status_code=422, detail=str(exc))
    return _run(user, thread_id, text, processed)


@router.get("/images/{image_id}")
def get_image(image_id: UUID, user: dict = Depends(get_current_user)):
    row = images_db.get_image_for_user(image_id, user["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="Photo not found.")
    return Response(
        content=bytes(row["data"]),
        media_type=row["content_type"],
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(user: dict = Depends(get_current_user)):
    return chat_db.list_threads(user["id"])


@router.get("/threads/{thread_id}/messages", response_model=list[MessageOut])
def thread_messages(thread_id: UUID, user: dict = Depends(get_current_user)):
    if chat_db.get_thread_for_user(thread_id, user["id"]) is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = chat_db.list_messages(thread_id, user["id"])
    photos = images_db.list_images_for_messages([m["id"] for m in messages])
    return [
        MessageOut(
            **message,
            images=[ImageOut(id=i, url=f"/api/images/{i}") for i in photos.get(message["id"], [])],
        )
        for message in messages
    ]


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: UUID, user: dict = Depends(get_current_user)):
    if not chat_db.delete_thread(thread_id, user["id"]):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    try:
        get_checkpointer().delete_thread(str(thread_id))
    except Exception:
        pass
    return Response(status_code=204)


@router.post("/messages/{message_id}/feedback", response_model=FeedbackOut)
def give_feedback(message_id: UUID, body: FeedbackIn, user: dict = Depends(get_current_user)):
    message = chat_db.get_message_for_user(message_id, user["id"])
    if message is None or message["role"] != "assistant":
        raise HTTPException(status_code=404, detail="Message not found.")
    return chat_db.set_feedback(message_id, user["id"], body.rating, body.comment)
