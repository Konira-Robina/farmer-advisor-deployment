import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { UiMessage } from "@/components/chat/types";

function message(overrides: Partial<UiMessage>): UiMessage {
  return { key: "k1", id: "m1", role: "assistant", content: "", images: [], status: "sent", rating: null, ...overrides };
}

function setup(msg: UiMessage) {
  const handlers = { onRate: vi.fn(), onRetry: vi.fn(), onDismiss: vi.fn(), onOpenImage: vi.fn() };
  render(
    <ul>
      <MessageBubble message={msg} {...handlers} />
    </ul>,
  );
  return { ...handlers, user: userEvent.setup() };
}

describe("assistant messages", () => {
  it("renders markdown", () => {
    setup(message({ content: "**Plant now.**\n\n- Space rows 75 cm\n- Weed early" }));
    expect(screen.getByText("Plant now.").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("never turns raw HTML into live elements", () => {
    const { container } = render(
      <ul>
        <MessageBubble
          message={message({ content: '<img src=x onerror="alert(1)"><script>alert(2)</script>' })}
          onRate={vi.fn()}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
          onOpenImage={vi.fn()}
        />
      </ul>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[onerror]")).toBeNull();
  });

  it("opens links safely in a new tab", () => {
    setup(message({ content: "See [the guide](https://example.com/guide)." }));
    const link = screen.getByRole("link", { name: "the guide" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render unsafe link protocols", () => {
    setup(message({ content: "[click](javascript:alert(1))" }));
    const link = screen.queryByRole("link", { name: "click" });
    expect(link?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
  });

  it("shows the officer notice when escalated", () => {
    setup(message({ content: "Please see an officer.", escalated: true }));
    expect(screen.getByRole("note")).toHaveTextContent("An extension officer has been asked to review this.");
  });

  it("sends a thumbs up", async () => {
    const { onRate, user } = setup(message({ content: "Answer" }));
    await user.click(screen.getByRole("button", { name: "Helpful" }));
    expect(onRate).toHaveBeenCalledWith("m1", 1);
  });

  it("asks what went wrong after a thumbs down and sends the reason", async () => {
    const { onRate, user } = setup(message({ content: "Answer", rating: -1 }));
    expect(screen.getByText("What went wrong?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Too long" }));
    expect(onRate).toHaveBeenCalledWith("m1", -1, "Too long");
    expect(screen.queryByText("What went wrong?")).not.toBeInTheDocument();
  });

  it("marks the chosen rating as pressed", () => {
    setup(message({ content: "Answer", rating: 1 }));
    expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Not helpful" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("user messages", () => {
  it("shows text and photos, and opens a photo", async () => {
    const { onOpenImage, user } = setup(
      message({ role: "user", id: null, content: "What is wrong?", images: [{ id: "i1", url: "blob:leaf" }] }),
    );
    expect(screen.getByText("What is wrong?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View photo full size" }));
    expect(onOpenImage).toHaveBeenCalledWith("blob:leaf");
  });

  it("offers to send again or remove a failed message", async () => {
    const { onRetry, onDismiss, user } = setup(
      message({ role: "user", id: null, key: "u1", content: "Hello", status: "failed", error: "Cannot reach the server." }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Cannot reach the server.");
    await user.click(screen.getByRole("button", { name: /Send again/ }));
    expect(onRetry).toHaveBeenCalledWith("u1");
    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onDismiss).toHaveBeenCalledWith("u1");
  });

  it("does not show feedback buttons on a farmer's message", () => {
    setup(message({ role: "user", id: null, content: "Hello" }));
    expect(screen.queryByRole("button", { name: "Helpful" })).not.toBeInTheDocument();
  });
});
