import base64
import json
import logging

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.context import FarmContext
from app.agent.factory import AgentNotConfigured, get_agent
from app.core.config import DEFAULT_PHOTO_TEXT, get_settings
from app.core.images import OUTPUT_TYPE
from app.db import chat as chat_db
from app.db import images as images_db

logger = logging.getLogger(__name__)

TITLE_LENGTH = 60
FALLBACK_REPLY = "Sorry, I could not produce an answer. Please try again."
ESCALATION_TOOL = "escalate_to_extension_officer"
LIMIT_MARKER = "limits exceeded"
LIMIT_REPLY = "I could not finish working that out. Please try asking in a simpler or shorter way."

__all__ = ["AgentNotConfigured", "AgentUnavailable", "ThreadNotFound", "VisionUnavailable", "run_chat", "summarise_run"]


class ThreadNotFound(Exception):
    """Raised when a thread does not exist or belongs to someone else."""


class VisionUnavailable(Exception):
    """Raised when photos are sent but the configured model cannot read images."""


class AgentUnavailable(Exception):
    """Raised when the agent fails to produce a result."""


def _text(content) -> str:
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"
    )


def summarise_run(messages: list) -> dict:
    """Extract the reply, token usage and escalation flag from the messages of the latest run."""
    last_human = max((i for i, m in enumerate(messages) if isinstance(m, HumanMessage)), default=-1)
    new = messages[last_human + 1:]

    reply = ""
    for message in reversed(new):
        if isinstance(message, AIMessage) and not message.tool_calls:
            reply = _text(message.content).strip()
            if reply:
                break

    tokens_in = tokens_out = 0
    for message in new:
        if isinstance(message, AIMessage) and message.usage_metadata:
            tokens_in += message.usage_metadata.get("input_tokens", 0)
            tokens_out += message.usage_metadata.get("output_tokens", 0)

    escalated = False
    for message in new:
        if isinstance(message, ToolMessage) and message.name == ESCALATION_TOOL:
            try:
                escalated = bool(json.loads(_text(message.content)).get("escalated"))
            except (ValueError, AttributeError):
                escalated = False

    if LIMIT_MARKER in reply.lower():
        reply = LIMIT_REPLY

    return {
        "reply": reply or FALLBACK_REPLY,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "escalated": escalated,
    }


def estimate_cost(tokens_in: int, tokens_out: int) -> float | None:
    settings = get_settings()
    if settings.llm_price_in_per_million is None or settings.llm_price_out_per_million is None:
        return None
    return round(
        (tokens_in * settings.llm_price_in_per_million + tokens_out * settings.llm_price_out_per_million) / 1_000_000,
        6,
    )


def build_content(text: str, images: list[bytes]):
    if not images:
        return text
    blocks: list[dict] = [{"type": "text", "text": text}]
    for data in images:
        encoded = base64.b64encode(data).decode("ascii")
        blocks.append({"type": "image_url", "image_url": {"url": f"data:{OUTPUT_TYPE};base64,{encoded}"}})
    return blocks


def run_chat(user: dict, thread_id, text: str, images: list[bytes] | None = None) -> dict:
    """Run one chat turn: store the question, run the agent, store and return the answer."""
    images = images or []
    if images and not get_settings().llm_supports_vision:
        raise VisionUnavailable()
    text = text.strip() or (DEFAULT_PHOTO_TEXT if images else "")
    if thread_id:
        thread = chat_db.get_thread_for_user(thread_id, user["id"])
        if thread is None:
            raise ThreadNotFound(str(thread_id))
    else:
        thread = chat_db.create_thread(user["id"], text[:TITLE_LENGTH])

    agent = get_agent()
    user_message = chat_db.add_message(thread["id"], "user", text)
    if images:
        images_db.add_images(user_message["id"], [(OUTPUT_TYPE, data) for data in images])

    config = {
        "configurable": {"thread_id": str(thread["id"])},
        "recursion_limit": get_settings().agent_recursion_limit,
        "run_name": "farmer_chat",
        "tags": ["farmer-advisor"],
        "metadata": {"user_id": str(user["id"])},
    }
    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": build_content(text, images)}]},
            config,
            context=FarmContext(user_id=str(user["id"]), thread_id=str(thread["id"])),
        )
    except Exception as exc:
        logger.exception("Agent run failed")
        raise AgentUnavailable() from exc

    summary = summarise_run(result["messages"])
    cost = estimate_cost(summary["tokens_in"], summary["tokens_out"])
    saved = chat_db.add_message(
        thread["id"],
        "assistant",
        summary["reply"],
        model=get_settings().llm_model or None,
        tokens_in=summary["tokens_in"],
        tokens_out=summary["tokens_out"],
        cost_usd=cost,
    )
    return {
        "thread_id": thread["id"],
        "message_id": saved["id"],
        "reply": summary["reply"],
        "escalated": summary["escalated"],
        "usage": {
            "input_tokens": summary["tokens_in"],
            "output_tokens": summary["tokens_out"],
            "cost_usd": cost,
        },
    }
