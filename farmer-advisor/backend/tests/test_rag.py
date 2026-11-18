import pytest

from app.db import guides
from app.rag import embeddings, ingest, retrieve
from app.rag.ingest import IngestError, chunk_text, ingest_directory, load_guide, split_header

WORDS = ["maize", "beans", "pest", "rain"]


def fake_vector(text: str) -> list[float]:
    vector = [0.0] * 1536
    lowered = text.lower()
    hit = False
    for index, word in enumerate(WORDS):
        if word in lowered:
            vector[index] = 1.0
            hit = True
    if not hit:
        vector[100] = 1.0
    return vector


@pytest.fixture
def fake_embeddings(monkeypatch):
    monkeypatch.setattr(ingest, "embed_documents", lambda texts: [fake_vector(t) for t in texts])
    monkeypatch.setattr(retrieve, "embed_query", fake_vector)


def test_split_header_reads_known_keys():
    meta, body = split_header("title: Maize pests\nsource: NARO 2021\ncrop: maize\n\nBody text here")
    assert meta == {"title": "Maize pests", "source": "NARO 2021", "crop": "maize"}
    assert body == "Body text here"


def test_split_header_ignores_normal_text():
    text = "Maize grows well.\nIt needs rain."
    assert split_header(text) == ({}, text)


def test_chunk_text_respects_size():
    chunks = chunk_text(("Maize needs rain. " * 200).strip())
    assert len(chunks) > 1
    assert all(len(c) <= ingest.CHUNK_SIZE for c in chunks)


def test_load_guide_uses_folder_for_crop(tmp_path):
    folder = tmp_path / "maize"
    folder.mkdir()
    (folder / "pests.md").write_text("title: Maize pests\n\nFall armyworm notes.")
    guide = load_guide(folder / "pests.md", tmp_path, {"maize", "beans"})
    assert guide["crop"] == "maize"
    assert guide["title"] == "Maize pests"
    assert guide["source"] == "maize/pests.md"


def test_load_guide_general_folder_has_no_crop(tmp_path):
    folder = tmp_path / "general"
    folder.mkdir()
    (folder / "soil.txt").write_text("Healthy soil notes.")
    assert load_guide(folder / "soil.txt", tmp_path, {"maize"})["crop"] is None


def test_load_guide_rejects_unknown_crop_and_empty(tmp_path):
    (tmp_path / "x.md").write_text("crop: dragonfruit\n\nText")
    with pytest.raises(IngestError, match="unknown crop"):
        load_guide(tmp_path / "x.md", tmp_path, {"maize"})
    (tmp_path / "y.md").write_text("   ")
    with pytest.raises(IngestError, match="no readable text"):
        load_guide(tmp_path / "y.md", tmp_path, {"maize"})


def build_pdf(text: str) -> bytes:
    stream = f"BT /F1 12 Tf 20 100 Td ({text}) Tj ET".encode()
    objects = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
        b"<</Length " + str(len(stream)).encode() + b">>\nstream\n" + stream + b"\nendstream",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode() + b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += f"trailer\n<</Root 1 0 R/Size {len(objects) + 1}>>\nstartxref\n{xref_at}\n%%EOF\n".encode()
    return out


def test_pdf_text_is_extracted(tmp_path):
    (tmp_path / "guide.pdf").write_bytes(build_pdf("Maize needs rain"))
    guide = load_guide(tmp_path / "guide.pdf", tmp_path, {"maize"})
    assert "Maize needs rain" in guide["text"]


def test_ingest_and_search_ranks_relevant_first(db, seed_crops, fake_embeddings, tmp_path):
    (tmp_path / "maize").mkdir()
    (tmp_path / "beans").mkdir()
    (tmp_path / "maize" / "m.md").write_text("title: Maize\nsource: Maize Guide\n\nMaize needs rain in the first weeks.")
    (tmp_path / "beans" / "b.md").write_text("title: Beans\nsource: Beans Guide\n\nBeans fix nitrogen in the soil.")
    summary = ingest_directory(tmp_path)
    assert summary["files"] == 2 and summary["errors"] == []

    result = retrieve.search_guides("when does maize need rain", None, k=2)
    assert result["results"][0]["source"] == "Maize Guide"

    only_beans = retrieve.search_guides("maize", "beans", k=5)
    assert {r["crop"] for r in only_beans["results"]} == {"beans"}


def test_reingest_replaces_instead_of_duplicating(db, seed_crops, fake_embeddings, tmp_path):
    (tmp_path / "g.md").write_text("title: G\nsource: Same\n\nMaize notes.")
    ingest_directory(tmp_path)
    ingest_directory(tmp_path)
    assert len(guides.search_chunks(fake_vector("maize"), None, 10)) == 1


def test_duplicate_sources_reported(db, seed_crops, fake_embeddings, tmp_path):
    (tmp_path / "a.md").write_text("source: Same\n\nMaize notes A.")
    (tmp_path / "b.md").write_text("source: Same\n\nMaize notes B.")
    summary = ingest_directory(tmp_path)
    assert summary["files"] == 1
    assert any("duplicate" in e for e in summary["errors"])


def test_search_without_guides(db, seed_crops, fake_embeddings):
    result = retrieve.search_guides("maize pests", "maize")
    assert result["results"] == []
    assert "Do not invent" in result["note"]


def test_search_unconfigured_embeddings(db, monkeypatch):
    def boom(text):
        raise embeddings.EmbeddingsNotConfigured()

    monkeypatch.setattr(retrieve, "embed_query", boom)
    assert "not configured" in retrieve.search_guides("maize")["error"]


def test_search_empty_query(db):
    assert "empty" in retrieve.search_guides("   ")["error"]


def test_dimension_mismatch_is_caught(monkeypatch):
    class Wrong:
        def embed_query(self, text):
            return [0.1, 0.2]

    monkeypatch.setattr(embeddings, "get_embeddings", lambda: Wrong())
    with pytest.raises(ValueError, match="dimensions"):
        embeddings.embed_query("x")
