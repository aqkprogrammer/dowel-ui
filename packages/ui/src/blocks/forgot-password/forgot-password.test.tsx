import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ForgotPasswordBlock } from "./forgot-password";

describe("ForgotPasswordBlock", () => {
  it("asks for an email", () => {
    render(<ForgotPasswordBlock />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("submits a valid address", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ForgotPasswordBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com" });
  });

  it("refuses an invalid address", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ForgotPasswordBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("the confirmation", () => {
    it("announces itself, because it replaces the form", () => {
      render(<ForgotPasswordBlock sent />);
      expect(screen.getByRole("status")).toHaveTextContent("Check your inbox");
    });

    it("does not reveal whether the account exists", () => {
      render(<ForgotPasswordBlock sent />);
      // Confirming it would turn this form into an account enumeration oracle.
      expect(screen.getByText(/If an account exists/)).toBeInTheDocument();
    });

    it("replaces the form entirely", () => {
      render(<ForgotPasswordBlock sent />);
      expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    });
  });

  it("has no accessibility violations in either state", async () => {
    const form = render(<ForgotPasswordBlock />);
    await expectNoA11yViolations(form.container);
    form.unmount();

    const sent = render(<ForgotPasswordBlock sent />);
    await expectNoA11yViolations(sent.container);
  });
});
