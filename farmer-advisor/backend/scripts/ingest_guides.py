import argparse
import sys
from pathlib import Path

from app.core.config import ROOT_DIR
from app.core.logging import setup_logging
from app.db.pool import close_pool, open_pool
from app.rag.ingest import ingest_directory


def main() -> int:
    parser = argparse.ArgumentParser(description="Load farming guides into the search index.")
    parser.add_argument("--dir", type=Path, default=ROOT_DIR / "data" / "guides")
    args = parser.parse_args()

    setup_logging()
    open_pool()
    try:
        summary = ingest_directory(args.dir)
    finally:
        close_pool()
    print(f"Ingested {summary['files']} files, {summary['chunks']} chunks")
    for error in summary["errors"]:
        print(f"Problem: {error}")
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
