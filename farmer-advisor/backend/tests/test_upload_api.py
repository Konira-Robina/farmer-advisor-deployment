from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import get_settings
from app.main import app
from tests.helpers import ai, recording, scripted


def jpeg(size=(300, 200), color="green") -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, "JPEG")
    return buffer.getvalue()


def upload(client, message="What is wrong with this leaf?", photos=None, thread_id=None, name="leaf.jpg"):
    data = {"message": message}
    if thread_id:
        data["thread_id"] = thread_id
    files = [("photos", (name, content, "image/jpeg")) for content in (photos if photos is not None else [jpeg()])]
    return client.post("/api/chat/upload", data=data, files=files or None)


def test_public_config(client):
    body = client.get("/api/config").json()
    assert body == {"max_images": 3, "max_image_mb": 5, "vision_enabled": True, "max_message_chars": 1000}


def test_photo_reaches_the_model_as_an_image_block(client, farmer, install_agent):
    model = recording(ai("It looks like leaf spot. Please check with an extension officer too."))
    install_agent(model)
    response = upload(client)
    assert response.status_code == 200
    assert "leaf spot" in response.json()["reply"]
    human = [m for m in model.seen[0] if m.type == "human"][-1]
    assert isinstance(human.content, list)
    assert human.content[0] == {"type": "text", "text": "What is wrong with this leaf?"}
    assert human.content[1]["type"] == "image_url"
    assert human.content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_photo_is_listed_with_the_message_and_can_be_fetched(client, farmer, install_agent):
    install_agent(scripted(ai("Answer.")))
    data = upload(client).json()
    messages = client.get(f"/api/threads/{data['thread_id']}/messages").json()
    assert messages[0]["images"] and messages[1]["images"] == []
    url = messages[0]["images"][0]["url"]
    image = client.get(url)
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/jpeg"
    assert image.headers["x-content-type-options"] == "nosniff"
    assert "private" in image.headers["cache-control"]
    assert Image.open(BytesIO(image.content)).format == "JPEG"


def test_photos_are_private(client, farmer, install_agent):
    install_agent(scripted(ai("Answer.")))
    data = upload(client).json()
    url = client.get(f"/api/threads/{data['thread_id']}/messages").json()[0]["images"][0]["url"]
    other = TestClient(app)
    assert other.get(url).status_code == 401
    other.post("/api/auth/register", json={"email": "b@example.com", "password": "correct-horse"})
    assert other.get(url).status_code == 404


def test_photo_without_text_gets_a_default_question(client, farmer, install_agent):
    model = recording(ai("I can see a maize leaf."))
    install_agent(model)
    response = upload(client, message="")
    assert response.status_code == 200
    human = [m for m in model.seen[0] if m.type == "human"][-1]
    assert "look at this photo" in human.content[0]["text"]


def test_follow_up_in_same_thread_with_photo(client, farmer, install_agent):
    install_agent(scripted(ai("First."), ai("Second.")))
    first = upload(client).json()
    second = upload(client, "And this one?", thread_id=first["thread_id"])
    assert second.status_code == 200 and second.json()["thread_id"] == first["thread_id"]


def test_deleting_a_thread_removes_its_photos(client, farmer, install_agent):
    install_agent(scripted(ai("Answer.")))
    data = upload(client).json()
    url = client.get(f"/api/threads/{data['thread_id']}/messages").json()[0]["images"][0]["url"]
    assert client.delete(f"/api/threads/{data['thread_id']}").status_code == 204
    assert client.get(url).status_code == 404


def test_validation_errors(client, farmer, install_agent):
    install_agent(scripted(ai("x")))
    assert upload(client, photos=[jpeg()] * 4).status_code == 422
    bad = upload(client, photos=[b"not an image"])
    assert bad.status_code == 422 and "could not be read" in bad.json()["detail"]
    assert client.post("/api/chat/upload", data={"message": ""}).status_code == 422
    assert upload(client, message="x" * 1001).status_code == 422
    assert client.post("/api/chat/upload", data={"message": "hi", "thread_id": "bad"}).status_code == 422


def test_gif_is_rejected_with_a_clear_message(client, farmer, install_agent):
    install_agent(scripted(ai("x")))
    buffer = BytesIO()
    Image.new("RGB", (10, 10)).save(buffer, "GIF")
    response = upload(client, photos=[buffer.getvalue()], name="x.gif")
    assert response.status_code == 422 and "JPG, PNG or WebP" in response.json()["detail"]


def test_text_only_upload_endpoint_still_works(client, farmer, install_agent):
    install_agent(scripted(ai("Plain answer.")))
    response = upload(client, "Hello", photos=[])
    assert response.status_code == 200 and response.json()["reply"] == "Plain answer."


def test_vision_disabled_blocks_photos_but_not_text(client, farmer, install_agent, monkeypatch):
    monkeypatch.setattr(get_settings(), "llm_supports_vision", False)
    install_agent(scripted(ai("Plain answer.")))
    blocked = upload(client)
    assert blocked.status_code == 400 and "not available" in blocked.json()["detail"]
    assert client.get("/api/threads").json() == []
    assert client.get("/api/config").json()["vision_enabled"] is False
    assert upload(client, "Hello", photos=[]).status_code == 200


def test_upload_requires_login(client):
    assert client.post("/api/chat/upload", data={"message": "hi"}).status_code == 401
