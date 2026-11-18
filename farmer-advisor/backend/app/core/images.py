from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import IMAGE_MAX_SIDE, IMAGE_QUALITY, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
OUTPUT_TYPE = "image/jpeg"


class ImageRejected(Exception):
    """Raised with a message that is safe to show to the farmer."""


def process_image(raw: bytes) -> bytes:
    """Validate an uploaded photo and return a smaller JPEG with no metadata (location data is removed)."""
    if not raw:
        raise ImageRejected("The photo is empty.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ImageRejected(f"The photo is too large. The limit is {MAX_IMAGE_BYTES // (1024 * 1024)} MB.")
    try:
        with Image.open(BytesIO(raw)) as source:
            if source.format not in ALLOWED_FORMATS:
                raise ImageRejected("Please use a JPG, PNG or WebP photo.")
            width, height = source.size
            if width * height > MAX_IMAGE_PIXELS:
                raise ImageRejected("The photo has too many pixels. Please use a smaller photo.")
            image = ImageOps.exif_transpose(source)
            image.load()
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            rgba = image.convert("RGBA")
            flattened = Image.new("RGB", rgba.size, "white")
            flattened.paste(rgba, mask=rgba.split()[-1])
            image = flattened
        else:
            image = image.convert("RGB")
        image.thumbnail((IMAGE_MAX_SIDE, IMAGE_MAX_SIDE))
        output = BytesIO()
        image.save(output, "JPEG", quality=IMAGE_QUALITY, optimize=True)
    except ImageRejected:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise ImageRejected("That file could not be read as a photo.")
    return output.getvalue()
