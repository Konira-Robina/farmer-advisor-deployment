from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.core.config import EMBEDDING_DIMENSIONS, get_settings


class EmbeddingsNotConfigured(Exception):
    """Raised when no embedding model or key is configured."""


@lru_cache
def get_embeddings() -> OpenAIEmbeddings:
    settings = get_settings()
    if not settings.embedding_model or not settings.resolved_embedding_key:
        raise EmbeddingsNotConfigured("EMBEDDING_MODEL and an API key must be set.")
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.resolved_embedding_key,
        base_url=settings.resolved_embedding_base_url,
        check_embedding_ctx_length=False,
    )


def _check_dimensions(vectors: list[list[float]]) -> None:
    for vector in vectors:
        if len(vector) != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Embedding has {len(vector)} dimensions but the database expects {EMBEDDING_DIMENSIONS}. "
                "Use a matching model or change the vector size in db/init.sql."
            )


def embed_query(text: str) -> list[float]:
    vector = get_embeddings().embed_query(text)
    _check_dimensions([vector])
    return vector


def embed_documents(texts: list[str]) -> list[list[float]]:
    vectors = get_embeddings().embed_documents(texts)
    _check_dimensions(vectors)
    return vectors
