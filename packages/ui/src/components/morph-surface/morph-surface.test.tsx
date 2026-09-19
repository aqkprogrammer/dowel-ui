import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  MorphSurface,
  MorphSurfaceForm,
  useMorphSurface,
  type MorphSurfaceProps,
} from "./morph-surface";

function Example(
  props: Partial<MorphSurfaceProps> & { onSubmit?: (v: string) => boolean | void },
) {
  const { onSubmit, ...rest } = props;
  return (
    <>
      <MorphSurface label="Ask AI" icon={<span data-testid="orb" />} {...rest}>
        <MorphSurfaceForm onSubmit={onSubmit} />
      </MorphSurface>
      <button type="button">Elsewhere</button>
    </>
  );
}

function surface() {
  return document.querySelector<HTMLElement>('[data-slot="morph-surface"]')!;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MorphSurface", () => {
  it("renders a collapsed dock with a disclosure trigger and a hidden, inert panel", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Ask AI" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(trigger.getAttribute("aria-controls")!);
    expect(panel).toHaveAttribute("role", "dialog");
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("data-state", "closed");
    for (const orb of screen.getAllByTestId("orb")) {
      expect(orb.parentElement).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("opens from a click, grows to the panel size and moves focus to the message box", async () => {
    const user = userEvent.setup();
    render(<Example panelWidth={320} panelHeight="10rem" />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));

    expect(surface()).toHaveAttribute("data-state", "open");
    expect(surface().style.width).toBe("320px");
    expect(surface().style.height).toBe("10rem");
    const dialog = screen.getByRole("dialog", { name: "Ask AI" });
    expect(dialog).not.toHaveAttribute("inert");
    expect(screen.getByRole("textbox", { name: "Ask AI" })).toHaveFocus();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("collapses on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Ask AI" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("ignores other keys inside the panel", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.keyboard("a");
    expect(surface()).toHaveAttribute("data-state", "open");
  });

  it("collapses on an outside press without stealing focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.click(screen.getByRole("textbox"));
    expect(surface()).toHaveAttribute("data-state", "open");

    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    await user.click(elsewhere);
    expect(surface()).toHaveAttribute("data-state", "closed");
    expect(elsewhere).toHaveFocus();
  });

  it("collapses when focus tabs out of the panel", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    // Textarea → (dock is inert) → Elsewhere.
    await user.tab();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
    expect(surface()).toHaveAttribute("data-state", "closed");
  });

  it("stays open while focus moves inside the panel", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Send" })).toHaveFocus();
    expect(surface()).toHaveAttribute("data-state", "open");
  });

  it("submits with ⌘/Ctrl + Enter, collapses and announces success", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} successDuration={1000} />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.type(screen.getByRole("textbox"), "  Hello there  ");
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    expect(onSubmit).toHaveBeenCalledWith("Hello there", expect.anything());
    expect(surface()).toHaveAttribute("data-state", "closed");
    expect(screen.getByRole("status")).toHaveTextContent("Sent");
    const trigger = screen.getByRole("button", { name: "Sent" });
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("textbox", { hidden: true })).toHaveValue("");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Ask AI" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("submits from the named submit button with Ctrl + Enter too", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.type(screen.getByRole("textbox"), "One");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Sent" }));
    await user.type(screen.getByRole("textbox"), "Two");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenLastCalledWith("Two", expect.anything());
  });

  it("does not submit an empty message, and plain Enter adds a line", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.type(screen.getByRole("textbox"), "   ");
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(surface()).toHaveAttribute("data-state", "open");
  });

  it("stays open when onSubmit returns false", async () => {
    const user = userEvent.setup();
    render(<Example onSubmit={() => false} />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.type(screen.getByRole("textbox"), "Nope");
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(surface()).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("textbox")).toHaveValue("Nope");
  });

  it("closes successfully without an onSubmit handler", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await user.type(screen.getByRole("textbox"), "Hi");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("button", { name: "Sent" })).toBeInTheDocument();
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(surface()).toHaveAttribute("data-state", "closed");

    rerender(<Example open onOpenChange={onOpenChange} />);
    expect(surface()).toHaveAttribute("data-state", "open");
  });

  it("can start open, and focuses the panel itself when it has nothing focusable", () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <MorphSurface label={<span>Info</span>} open={open} onOpenChange={setOpen}>
          <p>Nothing to focus.</p>
        </MorphSurface>
      );
    }
    render(<Controlled />);
    const dialog = screen.getByRole("dialog", { name: "Panel" });
    expect(dialog).toHaveFocus();
  });

  it("sizes the collapsed surface to the measured dock", () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(140);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(44);
    const callbacks: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Example />);
    expect(surface()).toHaveStyle({ width: "140px", height: "44px" });
    act(() => callbacks.forEach((callback) => callback()));
    expect(surface()).toHaveStyle({ width: "140px" });
  });

  it("uses panelLabel as the dialog and field name", async () => {
    const user = userEvent.setup();
    render(<Example panelLabel="Feedback" />);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(screen.getByRole("dialog", { name: "Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Feedback" })).toBeInTheDocument();
  });

  it("forwards refs (object and callback), props, and lets className win", () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <MorphSurface
        ref={ref}
        label="Ask"
        className="rounded-none"
        id="dock"
        style={{ zIndex: 3 }}
      >
        x
      </MorphSurface>,
    );
    expect(ref.current).toBe(surface());
    expect(surface()).toHaveAttribute("id", "dock");
    expect(surface()).toHaveClass("rounded-none");
    expect(surface()).not.toHaveClass("rounded-[1.25rem]");
    expect(surface()).toHaveStyle({ zIndex: "3" });

    const callback = vi.fn();
    rerender(
      <MorphSurface ref={callback} label="Ask">
        x
      </MorphSurface>,
    );
    expect(callback).toHaveBeenCalledWith(surface());
  });

  it("throws a helpful error when a part is used outside the surface", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useMorphSurface())).toThrow(/inside <MorphSurface>/);
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    await expectNoA11yViolations(container);
  });
});
