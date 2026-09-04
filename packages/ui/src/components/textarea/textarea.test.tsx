import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a multi-line field", () => {
    render(<Textarea aria-label="Bio" />);

    const field = screen.getByRole("textbox", { name: "Bio" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "3");
  });

  it.each([
    ["sm", "text-sm"],
    ["lg", "text-base"],
  ] as const)("applies the %s size", (textareaSize, expected) => {
    render(<Textarea textareaSize={textareaSize} aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveClass(expected);
  });

  it("does not shadow the native form attributes", () => {
    render(<Textarea name="bio" maxLength={10} aria-label="Bio" />);

    const field = screen.getByRole("textbox");
    expect(field).toHaveAttribute("name", "bio");
    expect(field).toHaveAttribute("maxlength", "10");
  });

  it("resizes vertically only, so it cannot be dragged out of its container", () => {
    render(<Textarea aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveClass("resize-y");
  });

  it("takes an explicit resize setting", () => {
    render(<Textarea resize="none" aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveClass("resize-none");
  });

  it("never leaves a drag handle on a field that sizes itself", () => {
    render(<Textarea autoResize resize="both" aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveClass("resize-none");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<Textarea className="text-base" textareaSize="sm" aria-label="Bio" />);

    const field = screen.getByRole("textbox");
    expect(field).toHaveClass("text-base");
    expect(field).not.toHaveClass("text-sm");
  });

  it("types like a textarea, newlines included", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Bio" />);

    const field = screen.getByRole("textbox");
    await user.type(field, "one{Enter}two");

    expect(field).toHaveValue("one\ntwo");
  });

  it("reports changes to the caller", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} aria-label="Bio" />);

    await user.type(screen.getByRole("textbox"), "hi");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("forwards a ref while still driving its own auto-resize", () => {
    // Dropping the caller's ref would break every form library that reaches
    // for the node.
    let node: HTMLTextAreaElement | null = null;
    render(
      <Textarea
        autoResize
        ref={(element) => {
          node = element;
        }}
        aria-label="Bio"
      />,
    );

    expect(node).not.toBeNull();
    expect((node as unknown as HTMLTextAreaElement).tagName).toBe("TEXTAREA");
  });

  it("takes the error state from aria-invalid, not a bespoke prop", () => {
    render(<Textarea aria-invalid aria-label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Textarea character count", () => {
  it("shows nothing without a limit to count against", () => {
    render(<Textarea showCount aria-label="Bio" />);
    expect(screen.queryByText(/characters/)).not.toBeInTheDocument();
  });

  it("states the remainder in words, not as a bare ratio", () => {
    // "141/200" is read aloud as two unlabelled numbers.
    render(
      <Textarea showCount maxLength={200} defaultValue={"x".repeat(59)} aria-label="Bio" />,
    );
    expect(screen.getByText("141 characters left")).toBeInTheDocument();
  });

  it("describes the field with the count", () => {
    render(<Textarea showCount maxLength={200} aria-label="Bio" />);

    const field = screen.getByRole("textbox");
    const describedBy = field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toContain("characters left");
  });

  it("keeps a caller's own aria-describedby as well as its own", () => {
    render(
      <>
        <p id="hint">Keep it short.</p>
        <Textarea showCount maxLength={100} aria-describedby="hint" aria-label="Bio" />
      </>,
    );

    const describedBy = screen.getByRole("textbox").getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("hint");
    expect(describedBy.split(" ").length).toBe(2);
  });

  it("stays silent while there is room", () => {
    // A permanently live counter reads the number between every keystroke.
    render(<Textarea showCount maxLength={200} defaultValue="short" aria-label="Bio" />);
    expect(screen.getByText(/characters left/)).toHaveAttribute("aria-live", "off");
  });

  it("speaks up once the limit is close", () => {
    render(
      <Textarea showCount maxLength={200} defaultValue={"x".repeat(185)} aria-label="Bio" />,
    );
    expect(screen.getByText("15 characters left")).toHaveAttribute("aria-live", "polite");
  });

  it("uses a floor of twenty characters for a small limit", () => {
    // A tenth of 30 is 3, which is too late to be useful.
    render(
      <Textarea showCount maxLength={30} defaultValue={"x".repeat(12)} aria-label="Bio" />,
    );
    expect(screen.getByText("18 characters left")).toHaveAttribute("aria-live", "polite");
  });

  it("says how far over rather than showing a negative remainder", () => {
    render(
      <Textarea
        showCount
        maxLength={10}
        value={"x".repeat(14)}
        onChange={() => undefined}
        aria-label="Bio"
      />,
    );
    expect(screen.getByText("4 characters over the limit")).toBeInTheDocument();
  });

  it("updates as an uncontrolled field is typed into", async () => {
    // Nothing re-renders an uncontrolled field, so a count read off the element
    // during render shows its first-paint value forever.
    const user = userEvent.setup();
    render(<Textarea showCount maxLength={100} aria-label="Bio" />);

    expect(screen.getByText("100 characters left")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "hello");
    expect(screen.getByText("95 characters left")).toBeInTheDocument();
  });

  it("counts a defaultValue from the first paint", () => {
    render(<Textarea showCount maxLength={100} defaultValue="hello" aria-label="Bio" />);
    expect(screen.getByText("95 characters left")).toBeInTheDocument();
  });

  it("updates as a controlled value changes", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <Textarea
          showCount
          maxLength={100}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          aria-label="Bio"
        />
      );
    }

    render(<Controlled />);
    expect(screen.getByText("100 characters left")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "hello");
    expect(screen.getByText("95 characters left")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <label htmlFor="bio">Bio</label>
        <Textarea id="bio" showCount maxLength={200} defaultValue="Hello" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
