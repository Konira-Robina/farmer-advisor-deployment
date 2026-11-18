import os

import psycopg
import pytest

TEST_URL = os.environ.get("TEST_DATABASE_URL")
os.environ["DATABASE_URL"] = TEST_URL or "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWT_SECRET"] = "test-secret-test-secret-123456"
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["LLM_MODEL"] = ""
os.environ["EMBEDDING_MODEL"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.agent import factory  # noqa: E402
from app.api.deps import chat_limiter  # noqa: E402
from app.core.config import ROOT_DIR  # noqa: E402
from app.db import users  # noqa: E402
from app.main import app  # noqa: E402


def _database_available() -> bool:
    if not TEST_URL:
        return False
    name = TEST_URL.rsplit("/", 1)[-1]
    if "test" not in name:
        raise RuntimeError("TEST_DATABASE_URL must point to a database whose name contains 'test'.")
    try:
        with psycopg.connect(TEST_URL, connect_timeout=3):
            return True
    except psycopg.OperationalError:
        return False


DB_AVAILABLE = _database_available()

RESET_SQL = (
    "TRUNCATE users, market_prices, guide_chunks RESTART IDENTITY CASCADE; "
    "UPDATE crops SET maturity_days = NULL, min_rainfall_30d_mm = NULL, "
    "ideal_ph_min = NULL, ideal_ph_max = NULL, source = NULL"
)


@pytest.fixture(scope="session", autouse=True)
def lifespan():
    if DB_AVAILABLE:
        with psycopg.connect(TEST_URL, autocommit=True) as conn:
            exists = conn.execute("SELECT to_regclass('public.users')").fetchone()[0]
            if exists is None:
                conn.execute((ROOT_DIR / "db" / "init.sql").read_text())
            for migration in sorted((ROOT_DIR / "db" / "migrations").glob("*.sql")):
                conn.execute(migration.read_text())
    with TestClient(app):
        yield


@pytest.fixture
def db(lifespan):
    if not DB_AVAILABLE:
        pytest.skip("TEST_DATABASE_URL is not set or the database is unreachable")
    with psycopg.connect(TEST_URL, autocommit=True) as conn:
        conn.execute(RESET_SQL)
    chat_limiter.reset()
    factory.reset_agent()
    from app.services.overview import clear_weather_cache

    clear_weather_cache()
    yield


@pytest.fixture
def client(db):
    return TestClient(app)


@pytest.fixture
def register(client):
    def _register(email="farmer@example.com", password="correct-horse", name="Test Farmer"):
        response = client.post("/api/auth/register", json={"email": email, "password": password, "full_name": name})
        assert response.status_code == 201, response.text
        return response.json()

    return _register


@pytest.fixture
def farmer(client, register):
    return register()


@pytest.fixture
def officer_client(db):
    from app.core.security import hash_password

    users.create_user("officer@example.com", hash_password("officer-pass-1"), "Officer", "extension_officer")
    officer = TestClient(app)
    response = officer.post("/api/auth/login", json={"email": "officer@example.com", "password": "officer-pass-1"})
    assert response.status_code == 200
    return officer


@pytest.fixture
def install_agent(db):
    def _install(model):
        factory.set_agent(factory.build_agent(model, factory.get_checkpointer()))

    yield _install
    factory.reset_agent()


@pytest.fixture
def seed_crops(db):
    from app.db import crops

    crops.upsert_crop("maize", 110, 80.0, 5.5, 7.0, "Test guide")
    crops.upsert_crop("beans", 75, 60.0, 6.0, 7.5, "Test guide")
