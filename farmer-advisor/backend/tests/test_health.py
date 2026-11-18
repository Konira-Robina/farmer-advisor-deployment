
from fastapi.testclient import TestClient

from tests.conftest import DB_AVAILABLE
from app.main import app
from app.agent.factory import agent_is_configured


def test_health_reports_database_state():
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "ok"
    assert body["database"] == ("up" if DB_AVAILABLE else "down")
    assert body["advisor_configured"] is agent_is_configured()
