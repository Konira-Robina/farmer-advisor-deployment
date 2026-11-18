import logging

from dotenv import load_dotenv

from app.core.config import ROOT_DIR


def setup_logging() -> None:
    """Load .env into the process (needed for LangSmith) and configure logging."""
    load_dotenv(ROOT_DIR / ".env")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
