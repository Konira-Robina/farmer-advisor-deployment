from io import BytesIO

import pytest
from PIL import Image

from app.core import images
from app.core.images import ImageRejected, process_image


def make_image(fmt="JPEG", size=(200, 100), mode="RGB", color="green", **save_kwargs) -> bytes:
    buffer = BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save_kwargs)
    return buffer.getvalue()


def open_result(data: bytes) -> Image.Image:
    return Image.open(BytesIO(data))


@pytest.mark.parametrize("fmt", ["JPEG", "PNG", "WEBP"])
def test_supported_formats_become_jpeg(fmt):
    result = open_result(process_image(make_image(fmt)))
    assert result.format == "JPEG" and result.size == (200, 100)


def test_large_photos_are_shrunk():
    result = open_result(process_image(make_image(size=(3000, 2000))))
    assert max(result.size) == 1024
    assert result.size == (1024, 683)


def test_exif_location_is_removed():
    source = Image.new("RGB", (50, 50), "red")
    exif = Image.Exif()
    exif[0x8825] = {1: "N", 2: (0.0, 20.0, 0.0), 3: "E", 4: (32.0, 35.0, 0.0)}
    buffer = BytesIO()
    source.save(buffer, "JPEG", exif=exif)
    assert open_result(buffer.getvalue()).getexif().get(0x8825) is not None
    cleaned = open_result(process_image(buffer.getvalue()))
    assert len(cleaned.getexif()) == 0


def test_orientation_is_applied():
    source = Image.new("RGB", (200, 100), "red")
    exif = Image.Exif()
    exif[0x0112] = 6
    buffer = BytesIO()
    source.save(buffer, "JPEG", exif=exif)
    assert open_result(process_image(buffer.getvalue())).size == (100, 200)


def test_transparency_is_flattened_on_white():
    data = make_image("PNG", mode="RGBA", color=(0, 0, 0, 0))
    result = open_result(process_image(data)).convert("RGB")
    assert result.getpixel((10, 10)) == (255, 255, 255)


@pytest.mark.parametrize(
    "raw,message",
    [
        (b"", "empty"),
        (b"not an image at all", "could not be read"),
        (b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "could not be read"),
        (make_image("GIF"), "JPG, PNG or WebP"),
        (make_image("BMP"), "JPG, PNG or WebP"),
    ],
)
def test_rejected_inputs(raw, message):
    with pytest.raises(ImageRejected, match=message):
        process_image(raw)


def test_oversized_upload_rejected(monkeypatch):
    monkeypatch.setattr(images, "MAX_IMAGE_BYTES", 100)
    with pytest.raises(ImageRejected, match="too large"):
        process_image(make_image())


def test_too_many_pixels_rejected(monkeypatch):
    monkeypatch.setattr(images, "MAX_IMAGE_PIXELS", 1000)
    with pytest.raises(ImageRejected, match="too many pixels"):
        process_image(make_image())


def test_truncated_file_rejected():
    data = make_image(size=(400, 400))
    with pytest.raises(ImageRejected):
        process_image(data[: len(data) // 2])
