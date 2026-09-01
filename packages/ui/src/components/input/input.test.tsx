import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Input } from "./input";

describe("Input", () => {
  it("renders a text input by default", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("type", "text");
  });

  it("honours an explicit type", () => {
    render(<Input type="email" aria-label="Email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("applies the %s size", (inputSize, expectedClass) => {
    render(<Input inputSize={inputSize} aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveClass(expectedClass);
  });

  it("does not shadow the native size attribute", () => {
    render(<Input size={5} aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("size", "5");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<Input className="h-16" aria-label="Name" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("h-16");
    expect(input).not.toHaveClass("h-9");
  });

  it("forwards a ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Name" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("works uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Input defaultValue="ab" aria-label="Name" />);

    const input = screen.getByRole<HTMLInputElement>("textbox");
    await user.type(input, "cd");
    expect(input.value).toBe("abcd");
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Name"
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByRole<HTMLInputElement>("textbox");
    await user.type(input, "hello");
    expect(input.value).toBe("hello");
  });

  it("does not accept input while disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input disabled onChange={onChange} aria-label="Name" />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    await user.type(input, "x");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes the invalid state through aria-invalid", () => {
    render(<Input aria-invalid aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Name" />);
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <label htmlFor="field">Name</label>
        <Input id="field" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
