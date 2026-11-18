from app.db import escalations, profiles
from app.tools import prices as prices_tool
from app.tools import weather
from tests.helpers import ai, scripted, tool_call


def send(client, message, thread_id=None):
    body = {"message": message}
    if thread_id:
        body["thread_id"] = thread_id
    return client.post("/api/chat", json=body)


WEATHER = {
    "latitude": 0.35,
    "longitude": 32.58,
    "current": {"temperature_c": 24.0, "humidity_percent": 70},
    "rainfall_last_30_days_mm": 90.0,
    "rainfall_next_7_days_mm": 20.0,
    "daily_forecast": [],
}


def test_tool_reads_location_from_saved_profile(client, farmer, install_agent, monkeypatch):
    profiles.upsert_profile(farmer["id"], {"latitude": 0.35, "longitude": 32.58})
    seen = {}

    def fake_fetch(lat, lon):
        seen["coords"] = (lat, lon)
        return WEATHER

    monkeypatch.setattr(weather, "fetch_weather", fake_fetch)
    install_agent(scripted(ai(tool_calls=[tool_call("get_weather", {})]), ai("It has rained 90 mm this month.")))
    response = send(client, "How is the weather on my farm?")
    assert response.status_code == 200
    assert response.json()["reply"] == "It has rained 90 mm this month."
    assert seen["coords"] == (0.35, 32.58)


def test_tool_error_is_passed_to_the_model(client, farmer, install_agent):
    install_agent(
        scripted(ai(tool_calls=[tool_call("get_weather", {})]), ai("Please set your farm location on the map."))
    )
    response = send(client, "Weather?")
    assert response.json()["reply"] == "Please set your farm location on the map."


def test_profile_tool_saves_details(client, farmer, install_agent):
    call = tool_call("update_farmer_profile", {"location_name": "Gulu", "crops": ["beans"], "farm_size_acres": 3})
    install_agent(scripted(ai(tool_calls=[call]), ai("Saved your farm details.")))
    assert send(client, "I farm 3 acres of beans near Gulu").status_code == 200
    stored = profiles.get_profile(farmer["id"])
    assert stored["location_name"] == "Gulu" and stored["crops"] == ["beans"]


def test_invalid_profile_update_is_rejected_by_the_tool(client, farmer, install_agent):
    call = tool_call("update_farmer_profile", {"latitude": 51.5, "longitude": -0.1})
    install_agent(scripted(ai(tool_calls=[call]), ai("That location is outside Uganda.")))
    send(client, "My farm is in London")
    assert profiles.get_profile(farmer["id"]) is None


def test_escalation_creates_ticket_and_sets_flag(client, farmer, officer_client, install_agent):
    call = tool_call("escalate_to_extension_officer", {"reason": "Maize leaves turning white, farmer unsure of dose"})
    install_agent(scripted(ai(tool_calls=[call]), ai("Please also speak to your extension officer.")))
    data = send(client, "What pesticide dose should I use?").json()
    assert data["escalated"] is True
    rows = escalations.list_escalations("open")
    assert len(rows) == 1 and "white" in rows[0]["reason"]

    listing = officer_client.get("/api/escalations?status=open").json()
    assert len(listing) == 1 and listing[0]["farmer_email"] == "farmer@example.com"
    assert client.get("/api/escalations").status_code == 403

    updated = officer_client.patch(f"/api/escalations/{listing[0]['id']}", json={"status": "reviewed"})
    assert updated.json()["status"] == "reviewed"
    assert officer_client.get("/api/escalations?status=open").json() == []


def test_duplicate_escalation_in_a_thread_is_not_created_twice(client, farmer, install_agent):
    call = tool_call("escalate_to_extension_officer", {"reason": "Unsafe chemical question"})
    install_agent(
        scripted(
            ai(tool_calls=[call]),
            ai("Please speak to an officer."),
            ai(tool_calls=[tool_call("escalate_to_extension_officer", {"reason": "Same again"}, "call_2")]),
            ai("Already flagged."),
        )
    )
    first = send(client, "Pesticide dose?").json()
    send(client, "And how much exactly?", first["thread_id"])
    assert len(escalations.list_escalations()) == 1


def test_unexpected_tool_exception_does_not_crash_the_run(client, farmer, install_agent, monkeypatch):
    def broken(crop, market=None):
        raise RuntimeError("database exploded with secret details")

    monkeypatch.setattr(prices_tool, "lookup_prices", broken)
    call = tool_call("get_market_prices", {"crop": "maize"})
    install_agent(scripted(ai(tool_calls=[call]), ai("Prices are unavailable right now.")))
    response = send(client, "Maize price?")
    assert response.status_code == 200
    assert response.json()["reply"] == "Prices are unavailable right now."
    assert "secret" not in response.text


def test_runaway_tool_calls_are_stopped(client, farmer, install_agent, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "agent_model_call_limit", 3)
    loop = [ai(tool_calls=[tool_call("get_market_prices", {"crop": "maize"}, f"c{i}")]) for i in range(10)]
    install_agent(scripted(*loop))
    response = send(client, "Keep checking prices forever")
    assert response.status_code == 200
    assert "could not finish" in response.json()["reply"]
    assert "limit" not in response.json()["reply"].lower()


def test_system_prompt_includes_profile_and_reading_level(client, farmer, install_agent):
    from app.agent.prompts import build_system_prompt

    profiles.upsert_profile(farmer["id"], {"location_name": "Gulu", "crops": ["beans"], "reading_level": "detailed"})
    prompt = build_system_prompt(profiles.get_profile(farmer["id"]))
    assert "Gulu" in prompt and "beans" in prompt and "fuller explanations" in prompt
    assert "nothing saved yet" in build_system_prompt(None)


def test_officer_endpoints_require_role(client, farmer):
    assert client.post(
        "/api/admin/prices",
        json={"crop": "maize", "market": "Kampala", "price_ugx_per_kg": 1000, "recorded_on": "2026-11-01"},
    ).status_code == 403


def test_officer_can_add_prices_and_agent_can_read_them(officer_client, seed_crops):
    created = officer_client.post(
        "/api/admin/prices",
        json={"crop": "Corn", "market": "Kampala", "price_ugx_per_kg": 1250, "recorded_on": "2026-11-01", "source": "Test"},
    )
    assert created.status_code == 201 and created.json()["crop"] == "maize"
    bad = officer_client.post(
        "/api/admin/prices",
        json={"crop": "dragonfruit", "market": "Kampala", "price_ugx_per_kg": 1250, "recorded_on": "2026-11-01"},
    )
    assert bad.status_code == 422
    from app.tools.prices import lookup_prices

    assert lookup_prices("maize")["prices"][0]["price_ugx_per_kg"] == 1250.0
