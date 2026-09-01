import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LoginBlock } from "./login";

describe("LoginBlock", () => {
  it("labels every field", () => {
    render(<LoginBlock />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Keep me signed in")).toBeInTheDocument();
  });

  it("uses the right input types and autocomplete", () => {
    render(<LoginBlock />);

    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("submits valid credentials", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse",
      remember: false,
    });
  });

  it("reports the remember choice", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByLabelText("Keep me signed in"));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ remember: true }));
  });

  it("does not submit an invalid form, and ties the error to the field", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginBlock onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).not.toHaveBeenCalled();
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter a valid email address.");
  });

  it("announces a server error assertively", () => {
    render(<LoginBlock error="Those credentials did not match." />);
    // It arrived after the user acted and explains why nothing happened.
    expect(screen.getByRole("alert")).toHaveTextContent("Those credentials did not match.");
  });

  it("reports its busy state on the submit button", () => {
    render(<LoginBlock pending />);
    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("links to password recovery and sign-up", () => {
    render(<LoginBlock forgotHref="/reset" signupHref="/register" />);
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/reset",
    );
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<LoginBlock error="Those credentials did not match." />);
    await expectNoA11yViolations(container);
  });
});
