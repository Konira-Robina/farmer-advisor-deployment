
from langchain.tools import tool

from app.db.crop_varieties import list_varieties
from app.db.crop_evidence import list_variety_evidence
from app.tools.common import normalise_crop


def lookup_varieties(crop_name: str) -> dict:
    """Retrieve crop varieties and their documented agricultural evidence."""
    name = normalise_crop(crop_name)
    varieties = list_varieties(name)

    if not varieties:
        return {
            "crop": name,
            "varieties": [],
            "note": "No variety records are available for this crop yet. Do not invent varieties.",
        }

    results = []

    for variety in varieties:
        evidence = list_variety_evidence(str(variety["id"]))

        results.append({
            "variety": variety["variety_name"],
            "description": variety["description"],
            "production_type": variety["production_type"],
            "evidence": [
                {
                    "characteristic": item["characteristic"],
                    "value": item["value_text"],
                    "unit": item["unit"],
                    "source": item["source_title"],
                    "organisation": item["source_organisation"],
                    "source_url": item["source_url"],
                    "source_page": item["source_page"],
                    "confidence": item["confidence"],
                }
                for item in evidence
            ],
        })

    return {
        "crop": name,
        "variety_count": len(results),
        "varieties": results,
        "note": (
            "Use only the supplied evidence when comparing varieties. "
            "Do not infer missing characteristics or treat undocumented "
            "traits as absent. Explain when evidence is incomplete."
        ),
    }


@tool
def compare_crop_varieties(crop: str) -> dict:
    """List crop varieties and compare their documented maturity, yield, disease and other traits."""
    return lookup_varieties(crop)
