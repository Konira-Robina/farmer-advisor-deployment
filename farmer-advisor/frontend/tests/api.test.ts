import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, setUnauthorizedHandler } from "@/lib/api";

function reply(status: number, body: unknown = null, headers: Record<string, string> = {}) {
  return Promise.resolve(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  );
}

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON", async () => {
    fetchMock.mockReturnValue(reply(200, { max_images: 3 }));
    expect(await api.config()).toEqual({ max_images: 3 });
    expect(fetchMock).toHaveBeenCalledWith("/api/config", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("handles 204 with no body", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(null, { status: 204 })));
    expect(await api.logout()).toBeUndefined();
  });

  it("uses a string detail as the message", async () => {
    fetchMock.mockReturnValue(reply(409, { detail: "An account with this email already exists." }));
    await expect(api.register("a@b.co", "password1", "")).rejects.toMatchObject({
      status: 409,
      message: "An account with this email already exists.",
    });
  });

  it("turns validation arrays into readable text", async () => {
    fetchMock.mockReturnValue(
      reply(422, { detail: [{ msg: "Value error, The location must be within Uganda." }, { msg: "Another problem." }] }),
    );
    await expect(api.saveProfile({})).rejects.toThrow("The location must be within Uganda. Another problem.");
  });

  it("falls back to a friendly message", async () => {
    fetchMock.mockReturnValue(reply(503, {}));
    await expect(api.chat("hi", null)).rejects.toThrow("The advisor is not available right now. Please try again shortly.");
  });

  it("explains a gateway failure when the backend is down", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response("Internal Server Error", { status: 500 })));
    await expect(api.chat("hi", null)).rejects.toThrow("Something went wrong on our side. Please try again.");
    fetchMock.mockReturnValue(Promise.resolve(new Response("Bad Gateway", { status: 502 })));
    await expect(api.chat("hi", null)).rejects.toThrow("We could not reach the advisor.");
  });

  it("explains network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await api.me().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/internet connection/);
  });

  it("exposes Retry-After on rate limits", async () => {
    fetchMock.mockReturnValue(reply(429, { detail: "Too many messages." }, { "Retry-After": "12" }));
    const error = await api.chat("hi", null).catch((caught) => caught);
    expect(error.status).toBe(429);
    expect(error.retryAfter).toBe(12);
  });

  it("signals an expired session, except for sign-in calls", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockReturnValue(reply(401, { detail: "Invalid or expired session." }));
    await api.profile().catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
    await api.login("a@b.co", "wrong").catch(() => undefined);
    await api.me().catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("sends chat as JSON", async () => {
    fetchMock.mockReturnValue(reply(200, { reply: "ok" }));
    await api.chat("Hello", "thread-1");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ message: "Hello", thread_id: "thread-1" });
  });

  it("sends photos as multipart form data", async () => {
    fetchMock.mockReturnValue(reply(200, { reply: "ok" }));
    const photo = new File(["x"], "leaf.jpg", { type: "image/jpeg" });
    await api.chatWithPhotos("What is this?", "thread-1", [photo, photo]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat/upload");
    const form = init.body as FormData;
    expect(form.get("message")).toBe("What is this?");
    expect(form.get("thread_id")).toBe("thread-1");
    expect(form.getAll("photos")).toHaveLength(2);
    expect(init.headers).toBeUndefined();
  });

  it("omits thread_id for a new conversation", async () => {
    fetchMock.mockReturnValue(reply(200, { reply: "ok" }));
    await api.chatWithPhotos("Hi", null, []);
    expect((fetchMock.mock.calls[0][1].body as FormData).has("thread_id")).toBe(false);
  });
});
