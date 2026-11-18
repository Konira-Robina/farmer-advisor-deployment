import logging

from app.db import crops, guides
from app.rag.embeddings import EmbeddingsNotConfigured, embed_query
from app.tools.common import normalise_crop

logger = logging.getLogger(__name__)

DEFAULT_RESULTS = 4
MAX_PASSAGE_CHARS = 1200


def search_guides(query: str, crop: str | None = None, k: int = DEFAULT_RESULTS) -> dict:
    """Find the guide passages most relevant to a question."""
    text = query.strip()
    if not text:
        return {"error": "The search query is empty."}
    crop_name = None
    if crop:
        candidate = normalise_crop(crop)
        crop_name = candidate if crops.get_crop(candidate) else None
    try:
        rows = guides.search_chunks(embed_query(text), crop_name, k)
    except EmbeddingsNotConfigured:
        return {"error": "The guide search is not configured."}
    except Exception:
        logger.exception("Guide search failed")
        return {"error": "The guide search is unavailable right now."}
    if not rows:
        return {"results": [], "note": "No guide material was found. Do not invent advice."}
    return {
        "results": [
            {
                "title": r["title"],
                "source": r["source"],
                "crop": r["crop"],
                "text": r["content"][:MAX_PASSAGE_CHARS],
                "relevance": round(float(r["score"]), 3),
            }
            for r in rows
        ]
    }
