import logging
import re
import time

from langchain.agents.middleware import (
    ModelCallLimitMiddleware,
    ModelRequest,
    ModelRetryMiddleware,
    ToolCallLimitMiddleware,
    ToolErrorMiddleware,
    before_agent,
    dynamic_prompt,
    wrap_tool_call,
)
from langchain_core.messages import AIMessage, HumanMessage

from app.agent.prompts import build_system_prompt
from app.core.config import MAX_MESSAGE_CHARS, get_settings
from app.db import profiles

logger = logging.getLogger(__name__)

INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)",
        r"disregard\s+.{0,30}(instructions|rules|prompt)",
        r"(reveal|show|print|repeat|display)\s+.{0,30}(system|hidden|initial)\s+prompt",
        r"you\s+are\s+now\s+(dan|in\s+developer\s+mode|an?\s+unrestricted)",
        r"pretend\s+(that\s+)?you\s+(have\s+no|are\s+not\s+bound)",
    )
]

TOO_LONG_REPLY = f"Please keep your question under {MAX_MESSAGE_CHARS} characters."
OFF_LIMITS_REPLY = (
    "I can only help with farming questions, such as your crops, weather, soil, prices and planting. "
    "Please ask me about those."
)


def message_text(message) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    return " ".join(
        block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"
    )


@before_agent(can_jump_to=["end"])
def input_guard(state, runtime):
    """Block over-long messages and common prompt-injection phrases before any model call."""
    last = next((m for m in reversed(state["messages"]) if isinstance(m, HumanMessage)), None)
    if last is None:
        return None
    text = message_text(last)
    if len(text) > MAX_MESSAGE_CHARS:
        return {"messages": [AIMessage(content=TOO_LONG_REPLY)], "jump_to": "end"}
    if any(p.search(text) for p in INJECTION_PATTERNS):
        logger.warning("Blocked a suspected prompt-injection message")
        return {"messages": [AIMessage(content=OFF_LIMITS_REPLY)], "jump_to": "end"}
    return None


@wrap_tool_call
def audit_tool_calls(request, handler):
    """Log every tool call with its duration."""
    name = request.tool_call["name"]
    user_id = getattr(request.runtime.context, "user_id", "unknown")
    start = time.perf_counter()
    try:
        return handler(request)
    finally:
        logger.info("tool_call name=%s user=%s ms=%d", name, user_id, (time.perf_counter() - start) * 1000)


@dynamic_prompt
def farm_prompt(request: ModelRequest) -> str:
    """Build the system prompt from the farmer's saved profile on every model call."""
    profile = profiles.get_profile(request.runtime.context.user_id)
    return build_system_prompt(profile)


def _tool_error_message(exc: Exception, request) -> str:
    logger.exception("Tool %s failed", request.tool_call["name"], exc_info=exc)
    return (
        f"The tool failed ({type(exc).__name__}). Do not guess. "
        "Tell the farmer this information is unavailable right now."
    )


def build_middleware() -> list:
    settings = get_settings()
    return [
        input_guard,
        ModelRetryMiddleware(max_retries=2, on_failure="error"),
        ModelCallLimitMiddleware(run_limit=settings.agent_model_call_limit, exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=settings.agent_tool_call_limit, exit_behavior="continue"),
        ToolErrorMiddleware(on_error=_tool_error_message),
        audit_tool_calls,
        farm_prompt,
    ]
