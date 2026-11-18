import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Composer, type ComposerProps } from "@/components/chat/Composer";

function setup(overrides: Partial<ComposerProps> = {}) {
  const onSend = vi.fn();
  const props: ComposerProps = {
    onSend,
    maxChars: 100,
    maxImages: 3,
    visionEnabled: true,
    ...overrides,
  };
  render(<Composer {...props} />);
  return { onSend, user: userEvent.setup({ applyAccept: false }) };
}

const photo = (name = "leaf.jpg", type = "image/jpeg", size = 2000) => new File([new Uint8Array(size)], name, { type });

describe("Composer", () => {
  it("cannot send an empty message", () => {
    setup();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("sends typed text and clears the box", async () => {
    const { onSend, user } = setup();
    const box = screen.getByLabelText("Your question");
    await user.type(box, "Should I plant maize?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("Should I plant maize?", []);
    expect(box).toHaveValue("");
  });

  it("sends with Enter on a computer and adds a new line with Shift+Enter", async () => {
    const { onSend, user } = setup();
    const box = screen.getByLabelText("Your question");
    await user.type(box, "Line one{Shift>}{Enter}{/Shift}line two");
    expect(onSend).not.toHaveBeenCalled();
    await user.type(box, "{Enter}");
    expect(onSend).toHaveBeenCalledWith("Line one\nline two", []);
  });

  it("keeps Enter as a new line on touch screens", async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList,
    );
    const { onSend, user } = setup();
    await user.type(screen.getByLabelText("Your question"), "Hello{Enter}there");
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Your question")).toHaveValue("Hello\nthere");
  });

  it("shows a counter near the limit and blocks sending over it", async () => {
    const { onSend, user } = setup({ maxChars: 20 });
    await user.type(screen.getByLabelText("Your question"), "a".repeat(25));
    expect(screen.getByText("25 of 20 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("previews an added photo, lets you remove it, and sends it", async () => {
    const { onSend, user } = setup();
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await user.upload(input, photo());
    expect(screen.getByAltText("Photo ready to send")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByAltText("Photo ready to send")).not.toBeInTheDocument();

    const second = photo("second.png", "image/png");
    await user.upload(input, second);
    await user.type(screen.getByLabelText("Your question"), "What is this?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("What is this?", [second]);
    expect(screen.queryByAltText("Photo ready to send")).not.toBeInTheDocument();
  });

  it("explains why a file was rejected", async () => {
    const { user } = setup();
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await user.upload(input, photo("movie.gif", "image/gif"));
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG or WebP photo.");
    expect(screen.queryByAltText("Photo ready to send")).not.toBeInTheDocument();
  });

  it("limits the number of photos", async () => {
    const { user } = setup({ maxImages: 2 });
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await user.upload(input, [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]);
    expect(screen.getAllByAltText("Photo ready to send")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("You can add up to 2 photos.");
    expect(screen.getByRole("button", { name: "Add a photo" })).toBeDisabled();
  });

  it("hides the photo button when photos are not supported", () => {
    setup({ visionEnabled: false });
    expect(screen.queryByRole("button", { name: "Add a photo" })).not.toBeInTheDocument();
  });

  it("is disabled while a reply is being written", async () => {
    const { onSend, user } = setup({ disabled: true });
    await user.type(screen.getByLabelText("Your question"), "Hi");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("starts with prefilled text", () => {
    setup({ initialText: "Should I plant maize now?" });
    expect(screen.getByLabelText("Your question")).toHaveValue("Should I plant maize now?");
  });
});
