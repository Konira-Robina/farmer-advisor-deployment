import { describe, expect, it } from "vitest";
import { checkImageFile, fitWithin, inferType } from "@/lib/image";

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("checkImageFile", () => {
  it("accepts JPG, PNG and WebP", () => {
    expect(checkImageFile(file("a.jpg", "image/jpeg"), 5)).toBeNull();
    expect(checkImageFile(file("a.png", "image/png"), 5)).toBeNull();
    expect(checkImageFile(file("a.webp", "image/webp"), 5)).toBeNull();
  });

  it("uses the extension when the browser gives no type", () => {
    expect(inferType(file("leaf.JPG", ""))).toBe("image/jpeg");
    expect(checkImageFile(file("leaf.jpeg", ""), 5)).toBeNull();
  });

  it("rejects other formats with a clear message", () => {
    expect(checkImageFile(file("a.gif", "image/gif"), 5)).toBe("Use a JPG, PNG or WebP photo.");
    expect(checkImageFile(file("a.heic", "image/heic"), 5)).toBe("Use a JPG, PNG or WebP photo.");
    expect(checkImageFile(file("notes.pdf", "application/pdf"), 5)).toBe("Use a JPG, PNG or WebP photo.");
  });

  it("rejects files over the size limit", () => {
    expect(checkImageFile(file("a.jpg", "image/jpeg", 6 * 1024 * 1024), 5)).toBe("That photo is bigger than 5 MB.");
    expect(checkImageFile(file("a.jpg", "image/jpeg", 5 * 1024 * 1024), 5)).toBeNull();
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it("never enlarges", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});
