import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SignupBlock, estimatePasswordStrength } from "./signup";

describe("estimatePasswordStrength", () => {
  it("reports too short below the minimum", () => {
    expect(estimatePasswordStrength("abc", 12).label).toBe("Too short");
  });

  it("rises with length and variety", () => {
    const short = estimatePasswordStrength("aaaaaaaaaaaa", 12);
    const varied = estimatePasswordStrength("Correct-Horse-9-Battery", 12);
    expect(varied.score).toBeGreaterThan(short.score);
  });

  it("never exceeds 100", () => {
    expect(estimatePasswordStrength("A".repeat(200) + "1!aA", 12).score).toBeLessThanOrEqual(
      100,
    );
  });

  it("prompts when empty", () => {
    expect(estimatePasswordStrength("", 12).label).toBe("Enter a password");
  });
});

describe("SignupBlock", () => {
  it("labels every field", () => {
    render(<SignupBlock />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("asks password managers for a new password, not an existing one", () => {
    render(<SignupBlock />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("states the length requirement before anyone gets it wrong", () => {
    render(<SignupBlock minPasswordLength={12} />);
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "At least 12 characters.",
    );
  });

  it("shows the strength as text, with the bar hidden", async () => {
    const user = userEvent.setup();
    const { container } = render(<SignupBlock />);

    await user.type(screen.getByLabelText("Password"), "Correct-Horse-9-Battery");

    expect(screen.getByText("Strong")).toBeInTheDocument();
    // The label already says it; the bar must not be announced as well.
    expect(container.querySelector("[data-slot='progress']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("gates on length, not on the strength estimate", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SignupBlock onSubmit={onSubmit} minPasswordLength={12} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    // Weak by the estimate, but long enough — and length is the actual rule.
    await user.type(screen.getByLabelText("Password"), "aaaaaaaaaaaaaa");
    await user.click(screen.getByLabelText(/I agree to the terms/));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
    );
  });

  it("requires the terms to be accepted, and says so", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SignupBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "aaaaaaaaaaaaaa");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Accept the terms to continue.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SignupBlock />);
    await expectNoA11yViolations(container);
  });
});
