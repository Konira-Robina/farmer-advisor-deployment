import argparse
import csv
import sys
from datetime import date
from pathlib import Path

from app.db import crops, prices
from app.db.pool import close_pool, open_pool
from app.tools.common import normalise_crop


def main() -> int:
    parser = argparse.ArgumentParser(description="Load market prices from a CSV file.")
    parser.add_argument("--file", type=Path, required=True)
    args = parser.parse_args()

    open_pool()
    try:
        parsed = []
        with args.file.open(newline="", encoding="utf-8") as handle:
            for line_no, row in enumerate(csv.DictReader(handle), start=2):
                try:
                    crop = normalise_crop(row["crop"])
                    if crops.get_crop(crop) is None:
                        raise ValueError(f"unknown crop '{row['crop']}'")
                    price = float(row["price_ugx_per_kg"])
                    if price < 0:
                        raise ValueError("price cannot be negative")
                    parsed.append(
                        (
                            crop,
                            row["market"].strip(),
                            price,
                            date.fromisoformat(row["recorded_on"].strip()),
                            (row.get("source") or "").strip() or None,
                        )
                    )
                except (ValueError, KeyError) as exc:
                    print(f"Line {line_no}: {exc}. Nothing was loaded.")
                    return 1
        for entry in parsed:
            prices.add_price(*entry)
    finally:
        close_pool()
    count = len(parsed)
    print(f"Loaded {count} prices")
    return 0


if __name__ == "__main__":
    sys.exit(main())
