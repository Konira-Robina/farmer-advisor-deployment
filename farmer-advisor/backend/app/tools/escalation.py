from langchain.tools import ToolRuntime, tool

from app.agent.context import FarmContext
from app.db import escalations

MAX_REASON_CHARS = 500


def create_escalation_for_run(user_id: str, thread_id: str, reason: str) -> dict:
    text = reason.strip()[:MAX_REASON_CHARS]
    if not text:
        return {"error": "A reason is required."}
    row, created = escalations.create_escalation(thread_id, user_id, text)
    return {
        "escalated": True,
        "already_open": not created,
        "message": "An extension officer will be asked to review this case.",
    }


@tool
def escalate_to_extension_officer(runtime: ToolRuntime[FarmContext], reason: str) -> dict:
    """Ask a human extension officer to review this case. Use it for chemical or pesticide doses,
    serious crop or livestock disease, anything unsafe, or when you are not confident.
    Put the key facts in the reason."""
    return create_escalation_for_run(runtime.context.user_id, runtime.context.thread_id, reason)
