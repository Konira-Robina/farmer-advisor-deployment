
from app.tools import varieties as varieties_tool
from tests.helpers import ai, scripted, tool_call


def test_lookup_varieties_returns_documented_evidence(monkeypatch):
    monkeypatch.setattr(
        varieties_tool,
        "list_varieties",
        lambda crop: [
            {
                "id": "variety-1",
                "variety_name": "NABE 16",
                "description": "Bean variety",
                "production_type": "open_pollinated",
            }
        ],
    )
    monkeypatch.setattr(
        varieties_tool,
        "list_variety_evidence",
        lambda variety_id: [
            {
                "characteristic": "days_to_maturity",
                "value_text": "60–70",
                "unit": "days",
                "source_title": "Beans Training Manual",
                "source_organisation": "MAAIF",
                "source_url": "https://example.com/beans.pdf",
                "source_page": "Page 66",
                "confidence": "supported",
            }
        ],
    )

    result = varieties_tool.lookup_varieties(" Beans ")

    assert result["crop"] == "beans"
    assert result["variety_count"] == 1
    assert result["varieties"][0]["variety"] == "NABE 16"
    assert result["varieties"][0]["evidence"][0]["characteristic"] == "days_to_maturity"
    assert result["varieties"][0]["evidence"][0]["value"] == "60–70"
    assert result["varieties"][0]["evidence"][0]["source"] == "Beans Training Manual"


def test_lookup_varieties_handles_crop_without_records(monkeypatch):
    monkeypatch.setattr(varieties_tool, "list_varieties", lambda crop: [])

    result = varieties_tool.lookup_varieties("sorghum")

    assert result["crop"] == "sorghum"
    assert result["varieties"] == []
    assert "Do not invent varieties" in result["note"]


def test_agent_uses_variety_comparison_tool(
    client, farmer, install_agent, monkeypatch
):
    expected = {
        "crop": "maize",
        "variety_count": 1,
        "varieties": [
            {
                "variety": "Longe 4",
                "description": "Open-pollinated maize variety",
                "production_type": "open_pollinated",
                "evidence": [
                    {
                        "characteristic": "days_to_maturity",
                        "value": "100–105",
                        "unit": "days",
                        "source": "MAAIF Maize Training Manual",
                        "organisation": "MAAIF",
                        "source_url": "https://example.com/maize.pdf",
                        "source_page": "Page 59",
                        "confidence": "supported",
                    }
                ],
            }
        ],
        "note": "Use only the supplied evidence.",
    }

    monkeypatch.setattr(
        varieties_tool,
        "lookup_varieties",
        lambda crop: expected if crop == "maize" else {},
    )

    install_agent(
        scripted(
            ai(tool_calls=[tool_call("compare_crop_varieties", {"crop": "maize"})]),
            ai("Longe 4 matures in 100–105 days, according to the MAAIF manual."),
        )
    )

    response = client.post(
        "/api/chat",
        json={"message": "Compare maize varieties and their maturity periods."},
    )

    assert response.status_code == 200
    assert "100–105 days" in response.json()["reply"]
    assert "MAAIF" in response.json()["reply"]
