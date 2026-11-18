import logging
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.db import crops, guides
from app.rag.embeddings import embed_documents
from app.tools.common import normalise_crop

logger = logging.getLogger(__name__)

SUPPORTED_SUFFIXES = {".md", ".txt", ".pdf"}
HEADER_KEYS = {"title", "source", "crop"}
CHUNK_SIZE = 900
CHUNK_OVERLAP = 120
EMBED_BATCH_SIZE = 64


class IngestError(Exception):
    """Raised when a guide file cannot be ingested."""


def split_header(text: str) -> tuple[dict, str]:
    """Read optional 'key: value' lines (title, source, crop) at the top of a text file."""
    lines = text.splitlines()
    meta: dict = {}
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            break
        key, sep, value = line.partition(":")
        if not sep or key.strip().lower() not in HEADER_KEYS:
            return {}, text
        meta[key.strip().lower()] = value.strip()
        index += 1
    return meta, "\n".join(lines[index:])


def read_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)
    return path.read_text(encoding="utf-8")


def load_guide(path: Path, base_dir: Path, known_crops: set[str]) -> dict:
    raw = read_text(path)
    meta, body = ({}, raw) if path.suffix.lower() == ".pdf" else split_header(raw)
    relative = path.relative_to(base_dir)
    folder = relative.parts[0] if len(relative.parts) > 1 else None
    crop_value = meta.get("crop") or (folder if folder and folder.lower() != "general" else None)
    crop = normalise_crop(crop_value) if crop_value else None
    if crop and crop not in known_crops:
        raise IngestError(f"{relative}: unknown crop '{crop_value}'. Known crops: {', '.join(sorted(known_crops))}.")
    text = body.strip()
    if not text:
        raise IngestError(f"{relative}: no readable text found.")
    return {
        "title": meta.get("title") or path.stem.replace("_", " ").replace("-", " "),
        "source": meta.get("source") or relative.as_posix(),
        "crop": crop,
        "text": text,
    }


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    return [c.strip() for c in splitter.split_text(text) if c.strip()]


def ingest_directory(directory: Path) -> dict:
    """Chunk, embed and store every supported file under a directory. Safe to re-run."""
    known_crops = set(crops.list_crop_names())
    files = sorted(
        p
        for p in directory.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES and not p.stem.lower().startswith("readme")
    )
    summary = {"files": 0, "chunks": 0, "errors": []}
    seen_sources: set[str] = set()

    for path in files:
        try:
            guide = load_guide(path, directory, known_crops)
            if guide["source"] in seen_sources:
                raise IngestError(f"{path.name}: duplicate source '{guide['source']}'.")
            seen_sources.add(guide["source"])
            chunks = chunk_text(guide["text"])
            vectors: list[list[float]] = []
            for start in range(0, len(chunks), EMBED_BATCH_SIZE):
                vectors.extend(embed_documents(chunks[start:start + EMBED_BATCH_SIZE]))
            rows = [
                {"crop": guide["crop"], "title": guide["title"], "content": c, "embedding": v}
                for c, v in zip(chunks, vectors)
            ]
            guides.replace_source_chunks(guide["source"], rows)
            summary["files"] += 1
            summary["chunks"] += len(rows)
        except IngestError as exc:
            summary["errors"].append(str(exc))
        except Exception as exc:
            logger.exception("Failed to ingest %s", path)
            summary["errors"].append(f"{path.name}: {type(exc).__name__}")
    return summary
