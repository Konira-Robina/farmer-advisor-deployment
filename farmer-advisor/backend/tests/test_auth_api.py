def test_register_sets_cookie_and_returns_user(client):
    response = client.post(
        "/api/auth/register", json={"email": "New@Example.com", "password": "correct-horse", "full_name": "N"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "farmer"
    assert "password" not in str(body).lower()
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/api/auth/me").json()["email"] == "new@example.com"


def test_role_cannot_be_chosen_at_registration(client):
    response = client.post(
        "/api/auth/register", json={"email": "a@example.com", "password": "correct-horse", "role": "admin"}
    )
    assert response.status_code == 201
    assert response.json()["role"] == "farmer"


def test_duplicate_email_conflict(client, register):
    register("dup@example.com")
    response = client.post("/api/auth/register", json={"email": "DUP@example.com", "password": "correct-horse"})
    assert response.status_code == 409


def test_weak_or_invalid_input_rejected(client):
    assert client.post("/api/auth/register", json={"email": "a@example.com", "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "nope", "password": "correct-horse"}).status_code == 422
    too_long = "x" * 73
    assert client.post("/api/auth/register", json={"email": "a@example.com", "password": too_long}).status_code == 422


def test_login_logout_flow(client, register):
    register("f@example.com", "correct-horse")
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
    bad = client.post("/api/auth/login", json={"email": "f@example.com", "password": "wrong-password"})
    assert bad.status_code == 401
    missing = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "wrong-password"})
    assert missing.status_code == 401
    assert missing.json() == bad.json()
    ok = client.post("/api/auth/login", json={"email": "f@example.com", "password": "correct-horse"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_protected_routes_require_login(client):
    for method, path in [("get", "/api/profile"), ("get", "/api/threads"), ("post", "/api/chat")]:
        assert getattr(client, method)(path).status_code == 401


def test_bearer_token_also_works(client, register):
    from app.core.security import create_access_token

    user = register()
    client.cookies.clear()
    token = create_access_token(user["id"])
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_garbage_token_rejected(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.token"}).status_code == 401
