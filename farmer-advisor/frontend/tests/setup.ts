import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

let urlCounter = 0;

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  writable: true,
  value: vi.fn(() => `blob:test-${++urlCounter}`),
});
Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });

window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query.includes("pointer: fine"),
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
});
