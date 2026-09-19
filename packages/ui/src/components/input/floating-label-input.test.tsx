import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Form, FormControl, FormDescription, FormField, FormMessage } from "../form";
import { FloatingLabelInput } from "./floating-label-input";

describe("FloatingLabelInput", () => {
  it("names the input with a real label", () => {
    render(<FloatingLabelInput label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(screen.getByText("Email").tagName).toBe("LABEL");
    expect(screen.getByText("Email")).toHaveAttribute("for", input.id);
  });

  it("gives an empty field a blank placeholder so :placeholder-shown tracks emptiness", () => {
    render(<FloatingLabelInput label="Email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", " ");
  });

  it("keeps a consumer's placeholder, hidden until the label has floated", () => {
    render(<FloatingLabelInput label="Email" placeholder="you@example.com" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "you@example.com");
    expect(input).toHaveClass(
      "placeholder:text-transparent",
      "focus:placeholder:text-muted-foreground",
    );
  });

  it("uses a given id for both the input and the label", () => {
    render(<FloatingLabelInput id="custom" label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom");
    expect(screen.getByText("Name")).toHaveAttribute("for", "custom");
  });

  it("floats from CSS state alone, so there is nothing for reduced motion to chase", () => {
    render(<FloatingLabelInput label="Name" />);
    const label = screen.getByText("Name");
    expect(label).toHaveClass("peer-focus:top-0", "peer-[:not(:placeholder-shown)]:top-0");
    // The only animation is a token-timed transition, which --motion-scale collapses.
    expect(label).toHaveClass("duration-[var(--duration-normal)]");
    expect(screen.getByRole("textbox")).toHaveClass("peer");
  });

  it.each([
    ["sm", "start-1.5", "h-8"],
    ["md", "start-2", "h-9"],
    ["lg", "start-2.5", "h-10"],
  ] as const)(
    "aligns the %s label with the input's padding",
    (inputSize, labelClass, inputClass) => {
      render(<FloatingLabelInput label="Name" inputSize={inputSize} />);
      expect(screen.getByText("Name")).toHaveClass(labelClass);
      expect(screen.getByRole("textbox")).toHaveClass(inputClass);
    },
  );

  it("sends className to the input and containerClassName to the wrapper", () => {
    const { container } = render(
      <FloatingLabelInput
        label="Name"
        className="h-16"
        containerClassName="w-40"
        labelClassName="text-lg"
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("h-16");
    expect(input).not.toHaveClass("h-9");
    expect(container.querySelector("[data-slot='floating-label-input']")).toHaveClass("w-40");
    expect(screen.getByText("Name")).toHaveClass("text-lg");
    expect(screen.getByText("Name")).not.toHaveClass("text-sm");
  });

  it("forwards a ref and native props to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<FloatingLabelInput ref={ref} label="Name" name="name" autoComplete="name" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute("name", "name");
    expect(ref.current).toHaveAttribute("autocomplete", "name");
  });

  it("is reachable by keyboard and accepts typing, controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <FloatingLabelInput
          label="Name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }
    render(<Controlled />);
    await user.tab();
    const input = screen.getByRole<HTMLInputElement>("textbox");
    expect(input).toHaveFocus();
    await user.keyboard("Ada");
    expect(input.value).toBe("Ada");
  });

  it("clicking the label focuses the input", async () => {
    const user = userEvent.setup();
    render(<FloatingLabelInput label="Name" />);
    await user.click(screen.getByText("Name"));
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("takes its id and ARIA wiring from FormControl", () => {
    render(
      <Form>
        <FormField name="email" error="Enter a valid email address.">
          <FormControl>
            <FloatingLabelInput label="Email" />
          </FormControl>
          <FormDescription>We will never share it.</FormDescription>
          <FormMessage />
        </FormField>
      </Form>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "We will never share it. Enter a valid email address.",
    );
    expect(screen.getByText("Email")).toHaveClass("peer-aria-invalid:text-destructive");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <FloatingLabelInput label="Name" />
        <FloatingLabelInput label="Email" defaultValue="ada@example.com" aria-invalid />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
