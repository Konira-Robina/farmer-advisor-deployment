from dataclasses import dataclass


@dataclass
class FarmContext:
    """Per-request data that tools and middleware can read but the model never sees."""

    user_id: str
    thread_id: str
