import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "../form";
import { OtpInput } from "./otp-input";

function slots(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="otp-input-slot"]')];
}

function caret(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="otp-input-caret"]');
}

function painted(container: HTMLElement) {
  return slots(container).map((slot) => slot.textContent);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Lays the slots out 50px apart, 40px square, as a browser would. */
function layOutSlots() {
  const index = (element: HTMLElement) =>
    Number(element.style.getPropertyValue("--dowel-otp-input-index") || 0);
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return index(this) * 50;
  });
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockReturnValue(4);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(40);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
}

describe("OtpInput", () => {
  it("renders one real one-time-code input and aria-hidden slots", () => {
    const { container } = render(<OtpInput />);
    const input = screen.getByRole("textbox", { name: "One-time code" });
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("maxlength", "6");
    expect(slots(container)).toHaveLength(6);
    for (const slot of slots(container)) {
      expect(slot.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it("fills slots as digits are typed and drops anything else", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<OtpInput length={4} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.keyboard("1a2");
    expect(input).toHaveValue("12");
    expect(painted(container)).toEqual(["1", "2", "", ""]);
    expect(onValueChange).toHaveBeenLastCalledWith("12");
    expect(slots(container)[1]).toHaveAttribute("data-filled");
  });

  it("marks the next empty slot active and draws the caret there", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("7");
    const active = slots(container).findIndex((slot) => slot.hasAttribute("data-active"));
    expect(active).toBe(1);
    // One caret for the whole row, placed over the slot it belongs to.
    expect(container.querySelectorAll('[data-slot="otp-input-caret"]')).toHaveLength(1);
    expect(caret(container)).toHaveAttribute("data-index", "1");
    expect(caret(container)).toHaveAttribute("data-state", "visible");
  });

  it("slides one caret from slot to slot, measured from the slots", async () => {
    layOutSlots();
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    expect(caret(container)).toHaveAttribute("data-state", "hidden");

    await user.click(screen.getByRole("textbox"));
    // Centred on the first slot, a quarter of the way down, half its height.
    expect(caret(container)?.style.translate).toBe("20px 14px");
    expect(caret(container)?.style.height).toBe("20px");
    expect(caret(container)?.style.transition).toBe("");

    await user.keyboard("5");
    expect(caret(container)?.style.translate).toBe("70px 14px");
    await user.keyboard("6");
    expect(caret(container)).toHaveAttribute("data-index", "2");
    expect(caret(container)?.style.translate).toBe("120px 14px");
  });

  it("restarts the caret's blink, solid, each time it arrives", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    await user.click(screen.getByRole("textbox"));
    const first = container.querySelector('[data-slot="otp-input-caret-blink"]');
    await user.keyboard("1");
    expect(container.querySelector('[data-slot="otp-input-caret-blink"]')).not.toBe(first);
  });

  it("hides the caret while a filled slot is selected, and when focus leaves", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={3} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("123");
    // Full: the last slot is selected for overwriting, so there is no caret.
    expect(caret(container)).toHaveAttribute("data-state", "hidden");
    expect(caret(container)).not.toHaveAttribute("data-index");

    await user.keyboard("{Backspace}");
    expect(caret(container)).toHaveAttribute("data-state", "visible");
    await user.tab();
    expect(caret(container)).toHaveAttribute("data-state", "hidden");
  });

  it("re-places the caret when the row reflows", async () => {
    let reflow: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          reflow = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("1");

    layOutSlots();
    reflow?.();
    expect(caret(container)?.style.translate).toBe("70px 14px");
  });

  it("clears a slot in place with Backspace, then steps back on the next press", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    const input = screen.getByRole<HTMLInputElement>("textbox");
    await user.click(input);
    await user.keyboard("1234");

    await user.keyboard("{Backspace}");
    expect(painted(container)).toEqual(["1", "2", "3", ""]);
    expect(caret(container)).toHaveAttribute("data-index", "3");

    await user.keyboard("{Backspace}");
    expect(painted(container)).toEqual(["1", "2", "", ""]);
    expect(caret(container)).toHaveAttribute("data-index", "2");
  });

  it("clears the active slot on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput />);
    await user.click(screen.getByRole("textbox"));
    expect(slots(container).some((slot) => slot.hasAttribute("data-active"))).toBe(true);
    await user.tab();
    expect(slots(container).some((slot) => slot.hasAttribute("data-active"))).toBe(false);
  });

  it("calls onComplete once when the last slot fills", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpInput length={4} onComplete={onComplete} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("1234");
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("1234");
    await user.keyboard("5");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("replaces the whole code on paste, stripping separators", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<OtpInput onComplete={onComplete} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("9");
    await user.paste("123-456");
    expect(painted(container)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("inserts a partial paste at the caret", async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("1");
    await user.paste("23");
    expect(input).toHaveValue("123");
  });

  it("ignores a paste with nothing acceptable, and one the consumer prevents", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OtpInput />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.paste("abc");
    expect(input).toHaveValue("");

    rerender(
      <OtpInput
        onPaste={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.paste("123");
    expect(input).toHaveValue("");
  });

  it("accepts SMS autofill that sets the whole value at once", () => {
    const onComplete = vi.fn();
    render(<OtpInput onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "482913" } });
    expect(onComplete).toHaveBeenCalledWith("482913");
  });

  it("deletes backwards with Backspace", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("123{Backspace}");
    expect(painted(container)).toEqual(["1", "2", "", ""]);
  });

  it("moves between slots with the arrow keys and overwrites the selected one", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} />);
    const input = screen.getByRole<HTMLInputElement>("textbox");
    await user.click(input);
    await user.keyboard("1234");

    // Full: the last slot is selected, so typing would replace it.
    expect(input.selectionStart).toBe(3);
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(2);
    expect(slots(container)[1]).toHaveAttribute("data-active");

    await user.keyboard("9");
    expect(input).toHaveValue("1934");

    await user.keyboard("{Home}");
    expect(input.selectionStart).toBe(0);
    await user.keyboard("{ArrowRight}");
    expect(input.selectionStart).toBe(1);
    await user.keyboard("{End}");
    expect(input.selectionStart).toBe(3);
  });

  it("leaves modified arrow keys to the browser", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<OtpInput onKeyDown={onKeyDown} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}{Control>}{ArrowLeft}{/Control}{Tab}");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("focuses the clicked slot", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} defaultValue="1234" />);
    slots(container).forEach((slot, index) => {
      vi.spyOn(slot, "getBoundingClientRect").mockReturnValue(
        new DOMRect(index * 50, 0, 40, 40),
      );
    });
    const input = screen.getByRole<HTMLInputElement>("textbox");
    await user.pointer({
      target: input,
      coords: { clientX: 110, clientY: 10 },
      keys: "[MouseLeft]",
    });
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(3);

    // Between slots: the browser's caret is kept.
    await user.pointer({
      target: input,
      coords: { clientX: 45, clientY: 10 },
      keys: "[MouseLeft]",
    });
    expect(input).toHaveFocus();
  });

  it("starts from defaultValue when uncontrolled", () => {
    const { container } = render(<OtpInput length={4} defaultValue="12ab" />);
    expect(painted(container)).toEqual(["1", "2", "", ""]);
  });

  it("follows the controlled value and only requests changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<OtpInput value="12" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("3");
    expect(onValueChange).toHaveBeenCalledWith("123");
    expect(input).toHaveValue("12");

    rerender(<OtpInput value="123" onValueChange={onValueChange} />);
    expect(input).toHaveValue("123");
  });

  it("works as a controlled pair", async () => {
    function Controlled() {
      const [code, setCode] = useState("");
      return (
        <>
          <OtpInput value={code} onValueChange={setCode} />
          <output>{code}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("42");
    expect(screen.getByRole("status")).toHaveTextContent("42");
  });

  it("masks filled slots with a dot or a given character", () => {
    const { container, rerender } = render(<OtpInput length={3} defaultValue="123" mask />);
    expect(painted(container)).toEqual(["•", "•", "•"]);
    rerender(<OtpInput length={3} defaultValue="123" mask="*" />);
    expect(painted(container)).toEqual(["*", "*", "*"]);
  });

  it("accepts letters when allowed", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OtpInput allow="alphanumeric" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "text");
    await user.click(input);
    await user.keyboard("a1-B");
    expect(input).toHaveValue("a1B");
    unmount();

    render(<OtpInput allow="alpha" />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("2c");
    expect(screen.getByRole("textbox")).toHaveValue("c");
  });

  it("accepts a custom pattern", async () => {
    const user = userEvent.setup();
    render(<OtpInput allow={/^[A-F0-9]$/} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("0aFz9");
    expect(input).toHaveValue("0F9");
  });

  it("draws groups with a separator between them", () => {
    const { container, rerender } = render(<OtpInput groups={[3, 3]} />);
    expect(container.querySelectorAll('[data-slot="otp-input-separator"]')).toHaveLength(1);
    rerender(<OtpInput groups={[2]} separator={<span data-testid="dot">·</span>} />);
    // The remainder becomes a last group, so no slot is lost.
    expect(slots(container)).toHaveLength(6);
    expect(screen.getByTestId("dot")).toBeInTheDocument();
  });

  it("sizes slots", () => {
    const { container } = render(<OtpInput slotSize="lg" slotClassName="rounded-none" />);
    expect(slots(container)[0]).toHaveClass("size-12", "rounded-none");
  });

  it("reflects aria-invalid onto the slots", () => {
    const { container } = render(<OtpInput aria-invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(slots(container)[0]).toHaveAttribute("data-invalid");
  });

  describe("status", () => {
    function root(container: HTMLElement) {
      return container.querySelector<HTMLElement>('[data-slot="otp-input"]');
    }

    function traces(container: HTMLElement) {
      return container.querySelectorAll('[data-slot="otp-input-trace"]');
    }

    it("is idle by default, with no status marks", () => {
      const { container } = render(<OtpInput length={4} />);
      expect(root(container)).not.toHaveAttribute("data-status");
      expect(slots(container)[0]).not.toHaveAttribute("data-status");
      expect(traces(container)).toHaveLength(0);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });

    it("traces a ring around each slot in turn on success", () => {
      const { container, rerender } = render(<OtpInput length={4} defaultValue="1234" />);
      rerender(<OtpInput length={4} defaultValue="1234" status="success" />);
      expect(root(container)).toHaveAttribute("data-status", "success");
      expect(root(container)).toHaveAttribute("data-played");
      expect(traces(container)).toHaveLength(4);
      expect(slots(container)[2]).toHaveAttribute("data-status", "success");
      expect(slots(container)[2]).toHaveClass("data-[status=success]:border-success");
      // Each trace inherits its slot's index, which staggers its sweep.
      expect(slots(container)[2]?.style.getPropertyValue("--dowel-otp-input-index")).toBe("2");
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });

    it("rings red, is invalid and shakes on error", () => {
      const { container, rerender } = render(<OtpInput length={4} defaultValue="1234" />);
      rerender(<OtpInput length={4} defaultValue="1234" status="error" />);
      expect(root(container)).toHaveAttribute("data-status", "error");
      expect(root(container)).toHaveAttribute("data-played");
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
      expect(slots(container)[0]).toHaveAttribute("data-invalid");
      expect(slots(container)[0]).toHaveClass("data-[status=error]:ring-destructive/40");
      expect(traces(container)).toHaveLength(0);

      const sheet = document.head.querySelector('style[data-href="dowel-otp-input"]');
      expect(sheet?.textContent).toContain("[data-played][data-status=error]{animation:");
    });

    it("lets an explicit aria-invalid win over the status", () => {
      render(<OtpInput status="error" aria-invalid={false} />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
    });

    it("does not play its feedback for a status present on first render", () => {
      const { container, rerender } = render(<OtpInput status="error" />);
      expect(root(container)).toHaveAttribute("data-status", "error");
      expect(root(container)).not.toHaveAttribute("data-played");

      rerender(<OtpInput status="idle" />);
      expect(root(container)).not.toHaveAttribute("data-played");
      rerender(<OtpInput status="error" />);
      expect(root(container)).toHaveAttribute("data-played");
    });

    it("announces a status message only once there is a verdict", () => {
      const { rerender } = render(<OtpInput status="idle" statusMessage="Code verified" />);
      const region = screen.getByRole("status");
      expect(region).toBeEmptyDOMElement();
      rerender(<OtpInput status="success" statusMessage="Code verified" />);
      expect(region).toHaveTextContent("Code verified");
      rerender(<OtpInput status="error" statusMessage="That code is wrong" />);
      expect(region).toHaveTextContent("That code is wrong");
    });

    it("renders no live region without a message", () => {
      render(<OtpInput status="success" />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("has no accessibility violations in either verdict", async () => {
      const { container, rerender } = render(
        <OtpInput defaultValue="123456" status="success" statusMessage="Code verified" />,
      );
      await expectNoA11yViolations(container);
      rerender(<OtpInput defaultValue="123456" status="error" statusMessage="Wrong code" />);
      await expectNoA11yViolations(container);
    });
  });

  it("flips characters in by default and can roll them in instead", () => {
    const { container, rerender } = render(<OtpInput />);
    expect(container.firstElementChild).toHaveAttribute("data-entrance", "flip");
    rerender(<OtpInput entrance="roll" />);
    expect(container.firstElementChild).toHaveAttribute("data-entrance", "roll");
  });

  it("has an extra-large slot size", () => {
    const { container } = render(<OtpInput slotSize="xl" />);
    expect(slots(container)[0]).toHaveClass("size-14", "text-xl");
  });

  it("is disabled as a whole", () => {
    const { container } = render(<OtpInput disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("is labelled and described through FormField", async () => {
    const { container } = render(
      <FormField error="That code has expired.">
        <FormLabel>Verification code</FormLabel>
        <FormControl>
          <OtpInput />
        </FormControl>
        <FormDescription>Sent to your phone.</FormDescription>
        <FormMessage />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input).toHaveAccessibleDescription("Sent to your phone. That code has expired.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(slots(container)[0]).toHaveAttribute("data-invalid");
    await expectNoA11yViolations(container);
  });

  it("submits its value under its name", () => {
    const { container } = render(
      <form>
        <OtpInput name="code" defaultValue="123456" />
      </form>,
    );
    const form = container.querySelector("form");
    expect(form && new FormData(form).get("code")).toBe("123456");
  });

  it("forwards native handlers", async () => {
    const user = userEvent.setup();
    const handlers = {
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      onKeyUp: vi.fn(),
      onClick: vi.fn(),
      onSelect: vi.fn(),
    };
    render(<OtpInput {...handlers} />);
    await user.click(screen.getByRole("textbox"));
    await user.keyboard("1");
    await user.tab();
    expect(handlers.onFocus).toHaveBeenCalled();
    expect(handlers.onBlur).toHaveBeenCalled();
    expect(handlers.onKeyUp).toHaveBeenCalled();
    expect(handlers.onClick).toHaveBeenCalled();
  });

  it("lets the consumer className win on the container", () => {
    const { container } = render(<OtpInput className="gap-6" />);
    expect(container.firstElementChild).toHaveClass("gap-6");
    expect(container.firstElementChild).not.toHaveClass("gap-2");
  });

  it("forwards a ref to the input, object or callback", () => {
    const ref = createRef<HTMLInputElement>();
    const { unmount } = render(<OtpInput ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("textbox"));
    unmount();

    const callback = vi.fn();
    render(<OtpInput ref={callback} />);
    expect(callback).toHaveBeenCalledWith(screen.getByRole("textbox"));
  });

  it("uses a consumer-supplied name instead of the default", () => {
    render(<OtpInput aria-label="Backup code" />);
    expect(screen.getByRole("textbox", { name: "Backup code" })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<OtpInput groups={[3, 3]} defaultValue="12" />);
    await expectNoA11yViolations(container);
  });
});
