def test_empty_profile_has_defaults(client, farmer):
    body = client.get("/api/profile").json()
    assert body["crops"] == [] and body["reading_level"] == "simple" and body["latitude"] is None


def test_update_and_partial_update(client, farmer):
    first = client.put(
        "/api/profile",
        json={"location_name": "Wakiso", "latitude": 0.4, "longitude": 32.5, "crops": ["Maize", "beans"], "farm_size_acres": 2},
    )
    assert first.status_code == 200
    assert first.json()["crops"] == ["maize", "beans"]
    second = client.put("/api/profile", json={"reading_level": "detailed"})
    assert second.json()["reading_level"] == "detailed"
    assert second.json()["location_name"] == "Wakiso"
    assert client.get("/api/profile").json()["farm_size_acres"] == 2.0


def test_validation(client, farmer):
    assert client.put("/api/profile", json={"latitude": 0.4}).status_code == 422
    assert client.put("/api/profile", json={"latitude": 51.5, "longitude": -0.1}).status_code == 422
    assert client.put("/api/profile", json={"farm_size_acres": -1}).status_code == 422
    assert client.put("/api/profile", json={"reading_level": "expert"}).status_code == 422
    assert client.put("/api/profile", json={"language": "english"}).status_code == 422


def test_profiles_are_private(client, register):
    from fastapi.testclient import TestClient

    from app.main import app

    register("a@example.com")
    client.put("/api/profile", json={"location_name": "Gulu"})
    other = TestClient(app)
    other.post("/api/auth/register", json={"email": "b@example.com", "password": "correct-horse"})
    assert other.get("/api/profile").json()["location_name"] is None
