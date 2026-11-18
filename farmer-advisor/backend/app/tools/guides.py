from langchain.tools import tool

from app.rag.retrieve import search_guides


@tool
def search_farming_guides(query: str, crop: str | None = None) -> dict:
    """Search the farming guide library for advice on a crop, pest, disease or farming practice.
    Returns passages with their sources. Optionally limit the search to one crop."""
    return search_guides(query, crop)
