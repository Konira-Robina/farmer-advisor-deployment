import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { describeSendError } from "@/components/chat/useChat";
import { RainGauge } from "@/components/today/RainGauge";
import { StatusPill, statusLabel } from "@/components/ui/StatusPill";
import { PasswordField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api";

describe("StatusPill", () => {
  it("uses words as well as colour for every status", () => {
    expect(statusLabel("favourable")).toBe("Good time to plant");
    expect(statusLabel("prepare_land_and_monitor")).toBe("Prepare the land");
    expect(statusLabel("wait")).toBe("Wait for rain");
    expect(statusLabel("insufficient_data")).toBe("Not enough data");
    render(<StatusPill status="wait" />);
    expect(screen.getByText("Wait for rain")).toBeInTheDocument();
  });
});

describe("RainGauge", () => {
  it("describes the gauge in words for screen readers", () => {
    render(
      <RainGauge
        rainfall={96.4}
        markers={[
          { crop: "maize", required: 80 },
          { crop: "banana", required: 100 },
        ]}
      />,
    );
    const label = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(label).toContain("96.4 millimetres in the last 30 days");
    expect(label).toContain("Maize needs 80 millimetres");
    expect(label).toContain("Bananas needs 100 millimetres");
  });

  it("shows each crop requirement on the gauge", () => {
    const { container } = render(<RainGauge rainfall={10} markers={[{ crop: "beans", required: 60 }]} />);
    expect(container.textContent).toContain("Beans 60");
  });
});

describe("PasswordField", () => {
  it("hides the password until asked", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" defaultValue="secret-pass" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("connects hints and errors to the field", () => {
    render(<PasswordField label="Password" error="Use at least 8 characters." />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use at least 8 characters.");
  });
});

describe("describeSendError", () => {
  it("tells the farmer how long to wait when rate limited", () => {
    expect(describeSendError(new ApiError(429, "Too many", 12))).toBe(
      "You are sending messages quickly. Try again in 12 seconds.",
    );
  });

  it("passes through API messages", () => {
    expect(describeSendError(new ApiError(422, "That file could not be read as a photo."))).toBe(
      "That file could not be read as a photo.",
    );
  });

  it("has a safe message for unknown errors", () => {
    expect(describeSendError(new Error("boom"))).toBe("Your message could not be sent. Please try again.");
  });
});
