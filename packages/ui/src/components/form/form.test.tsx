import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Input } from "../input";
import { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

function Example({
  error,
  withDescription = true,
}: {
  error?: string;
  withDescription?: boolean;
} = {}) {
  return (
    <Form>
      <FormField name="email" error={error}>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" />
        </FormControl>
        {withDescription ? <FormDescription>We will never share it.</FormDescription> : null}
        <FormMessage />
      </FormField>
    </Form>
  );
}

describe("Form", () => {
  it("disables native validation so custom messages are the only ones shown", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("allows native validation back in", () => {
    const { container } = render(
      <Form noValidate={false}>
        <div />
      </Form>,
    );
    expect(container.querySelector("form")).not.toHaveAttribute("novalidate");
  });
});

describe("FormField", () => {
  it("points the label at the control", () => {
    render(<Example />);
    expect(screen.getByLabelText("Email")).toBe(screen.getByRole("textbox"));
  });

  it("describes the control with its description", () => {
    render(<Example />);
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("We will never share it.");
  });

  it("does not reference a description that was never rendered", () => {
    render(<Example withDescription={false} />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-describedby");
  });

  it("is not invalid without an error", () => {
    render(<Example />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  describe("with an error", () => {
    it("marks the control invalid", () => {
      render(<Example error="Enter a valid email address." />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("renders the message", () => {
      render(<Example error="Enter a valid email address." />);
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    });

    it("describes the control with both the description and the message", () => {
      render(<Example error="Enter a valid email address." />);
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
        "We will never share it. Enter a valid email address.",
      );
    });

    it("announces the message politely", () => {
      render(<Example error="Enter a valid email address." />);
      const message = screen.getByText("Enter a valid email address.");
      expect(message).toHaveAttribute("role", "status");
      expect(message).toHaveAttribute("aria-live", "polite");
    });

    it("marks the label and wrapper as invalid for styling", () => {
      const { container } = render(<Example error="Bad" />);
      expect(container.querySelector("[data-slot='form-field']")).toHaveAttribute(
        "data-invalid",
        "true",
      );
      expect(screen.getByText("Email")).toHaveClass("text-destructive");
    });
  });

  it("mirrors the field name for form-library integration", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("[data-slot='form-field']")).toHaveAttribute(
      "data-name",
      "email",
    );
  });

  it("gives each field its own ids", () => {
    render(
      <Form>
        <FormField name="first">
          <FormLabel>First</FormLabel>
          <FormControl>
            <Input />
          </FormControl>
        </FormField>
        <FormField name="last">
          <FormLabel>Last</FormLabel>
          <FormControl>
            <Input />
          </FormControl>
        </FormField>
      </Form>,
    );

    const first = screen.getByLabelText("First");
    const last = screen.getByLabelText("Last");
    expect(first.id).not.toBe(last.id);
  });

  it("works with any state source, updating as validation changes", async () => {
    const user = userEvent.setup();

    function Validated() {
      const [value, setValue] = useState("");
      const error = value.includes("@") ? undefined : "Enter a valid email address.";
      return (
        <Form>
          <FormField name="email" error={value ? error : undefined}>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input value={value} onChange={(event) => setValue(event.target.value)} />
            </FormControl>
            <FormMessage />
          </FormField>
        </Form>
      );
    }

    render(<Validated />);
    const input = screen.getByRole("textbox");

    await user.type(input, "nope");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

    await user.type(input, "@example.com");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  it("lets FormMessage render its own children", () => {
    render(
      <Form>
        <FormField name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input />
          </FormControl>
          <FormMessage>Custom hint</FormMessage>
        </FormField>
      </Form>,
    );
    expect(screen.getByText("Custom hint")).toBeInTheDocument();
  });

  it.each([
    ["FormLabel", <FormLabel key="l">Label</FormLabel>],
    [
      "FormControl",
      <FormControl key="c">
        <input />
      </FormControl>,
    ],
    ["FormDescription", <FormDescription key="d">Text</FormDescription>],
    ["FormMessage", <FormMessage key="m">Text</FormMessage>],
  ])("throws a useful error if %s is used outside FormField", (name, element) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(element)).toThrow(
      new RegExp(`${name} must be rendered inside <FormField>`),
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example error="Enter a valid email address." />);
    await expectNoA11yViolations(container);
  });
});
