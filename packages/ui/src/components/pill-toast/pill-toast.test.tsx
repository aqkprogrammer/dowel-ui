import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PillToast } from "./pill-toast";

function pill(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-part=pill]");
}

describe("PillToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is an empty polite live region while closed", () => {
    render(<PillToast>Saved to Photos</PillToast>);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
  });

  it("puts the message in the live region when it opens", () => {
    render(<PillToast defaultOpen>Saved to Photos</PillToast>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved to Photos");
  });

  it("dismisses itself after its duration and unmounts after the exit", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { container } = render(
      <PillToast defaultOpen duration={1000} onOpenChange={onOpenChange}>
        Saved
      </PillToast>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(pill(container)).toHaveAttribute("data-state", "closed");
  });

  it("unmounts the pill once its exit animation ends", () => {
    const { container, rerender } = render(<PillToast open>Saved</PillToast>);
    rerender(<PillToast open={false}>Saved</PillToast>);
    const leaving = pill(container)!;
    expect(leaving).toHaveAttribute("data-state", "closed");
    fireEvent.animationEnd(leaving);
    expect(pill(container)).toBeNull();
  });

  it("holds the timer while hovered", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { container } = render(
      <PillToast defaultOpen duration={1000} onOpenChange={onOpenChange}>
        Saved
      </PillToast>,
    );
    fireEvent.pointerEnter(pill(container)!);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.pointerLeave(pill(container)!);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens from a controlled trigger, by keyboard too", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Save
          </button>
          <PillToast open={open} onOpenChange={setOpen}>
            Saved to Photos
          </PillToast>
        </>
      );
    }
    render(<Demo />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Saved to Photos");
  });

  it("forwards its ref to the live region and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PillToast ref={ref} className="custom">
        Saved
      </PillToast>,
    );
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("custom", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PillToast defaultOpen>Saved to Photos</PillToast>);
    await expectNoA11yViolations(container);
  });
});
