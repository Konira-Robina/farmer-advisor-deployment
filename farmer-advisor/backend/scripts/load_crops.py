import argparse
import csv
import sys
from pathlib import Path

from app.core.config import ROOT_DIR
from app.db import crops
from app.db.pool import close_pool, open_pool


def number(value: str, cast):
    value = (value or "").strip()
    return cast(value) if value else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Load crop planting data from a CSV file.")
    parser.add_argument("--file", type=Path, default=ROOT_DIR / "data" / "crops.csv")
    args = parser.parse_args()

    open_pool()
    count = 0
    try:
        with args.file.open(newline="", encoding="utf-8") as handle:
            for line_no, row in enumerate(csv.DictReader(handle), start=2):
                try:
                    crops.upsert_crop(
                        row["name"].strip().lower(),
                        number(row["maturity_days"], int),
                        number(row["min_rainfall_30d_mm"], float),
                        number(row["ideal_ph_min"], float),
                        number(row["ideal_ph_max"], float),
                        (row.get("source") or "").strip() or None,
                    )
                    count += 1
                except (ValueError, KeyError) as exc:
                    print(f"Line {line_no}: {exc}")
                    return 1
    finally:
        close_pool()
    print(f"Loaded {count} crops")
    return 0


if __name__ == "__main__":
    sys.exit(main())
