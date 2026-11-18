import threading

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.postgres import PostgresSaver

from app.agent.context import FarmContext
from app.core.config import get_settings
from app.db.pool import get_pool
from app.middleware import build_middleware
from app.tools import ALL_TOOLS

_lock = threading.Lock()
_agent = None
_checkpointer = None


class AgentNotConfigured(Exception):
    """Raised when the language model settings are missing."""


def build_llm() -> ChatOpenAI:
    settings = get_settings()
    if not settings.openrouter_api_key or not settings.llm_model:
        raise AgentNotConfigured("OPENROUTER_API_KEY and LLM_MODEL must be set.")
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=0.2,
        timeout=60,
        max_retries=0,
    )


def get_checkpointer() -> PostgresSaver:
    global _checkpointer
    with _lock:
        if _checkpointer is None:
            saver = PostgresSaver(get_pool())
            saver.setup()
            _checkpointer = saver
        return _checkpointer


def build_agent(llm, checkpointer):
    return create_agent(
        model=llm,
        tools=ALL_TOOLS,
        middleware=build_middleware(),
        context_schema=FarmContext,
        checkpointer=checkpointer,
        name="farmer_advisor",
    )


def get_agent():
    global _agent
    with _lock:
        existing = _agent
    if existing is not None:
        return existing
    llm = build_llm()
    agent = build_agent(llm, get_checkpointer())
    with _lock:
        _agent = agent
    return agent


def set_agent(agent) -> None:
    global _agent
    with _lock:
        _agent = agent


def reset_agent() -> None:
    global _agent, _checkpointer
    with _lock:
        _agent = None
        _checkpointer = None


def agent_is_configured() -> bool:
    settings = get_settings()
    return bool(settings.openrouter_api_key and settings.llm_model)
