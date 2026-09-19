import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SloshSlider, sloshSpring } from "./slosh-slider";

afterEach(() => {
  vi.restoreAllMocks();
});

const thumb = () => screen.getByRole("slider");
const root = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=slosh-slider]")!;
const fillOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot=slosh-slider-fill]")!;

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("SloshSlider", () => {
  it("is a named slider with its value and bounds", () => {
    render(<SloshSlider aria-label="Flow" />);
    expect(thumb()).toHaveAccessibleName("Flow");
    expect(thumb()).toHaveAttribute("aria-valuenow", "62");
    expect(thumb()).toHaveAttribute("aria-valuemin", "0");
    expect(thumb()).toHaveAttribute("aria-valuemax", "100");
  });

  it("bakes in no name, and warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<SloshSlider />);
    expect(thumb()).not.toHaveAttribute("aria-label");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[SloshSlider]"));
  });

  it("forwards aria-labelledby and value text onto the thumb", () => {
    const { rerender } = render(
      <>
        <span id="lbl">Level</span>
        <SloshSlider aria-labelledby="lbl" formatValue={(v) => `${v} percent`} />
      </>,
    );
    expect(thumb()).toHaveAccessibleName("Level");
    expect(thumb()).toHaveAttribute("aria-valuetext", "62 percent");
    rerender(<SloshSlider aria-label="Flow" aria-valuetext="Lots" />);
    expect(thumb()).toHaveAttribute("aria-valuetext", "Lots");
  });

  it("steps with arrows, pages by largeStep, and jumps with Home and End", async () => {
    const onValueCommit = vi.fn();
    const user = userEvent.setup();
    render(<SloshSlider aria-label="Flow" onValueCommit={onValueCommit} />);
    await user.tab();
    expect(thumb()).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "63");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "61");
    await user.keyboard("{PageUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "71");
    expect(onValueCommit).toHaveBeenLastCalledWith(71);
    await user.keyboard("{PageDown}{PageDown}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "51");
    await user.keyboard("{Home}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{PageDown}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{End}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
  });

  it("pages by a custom largeStep in step units", async () => {
    const user = userEvent.setup();
    render(<SloshSlider aria-label="Flow" defaultValue={10} step={2} largeStep={3} />);
    await user.tab();
    await user.keyboard("{PageUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "16");
    await user.keyboard("{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "18");
  });

  it("lets a consumer onKeyDown cancel the page jump", async () => {
    const user = userEvent.setup();
    render(<SloshSlider aria-label="Flow" onKeyDown={(event) => event.preventDefault()} />);
    await user.tab();
    await user.keyboard("{PageUp}{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "62");
  });

  it("mirrors the arrow keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <SloshSlider aria-label="Flow" />
      </DirectionProvider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "63");
  });

  it("jumps to the pointer and commits on release", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = render(
      <SloshSlider
        aria-label="Flow"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const el = root(container);
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 40));
    vi.spyOn(el, "hasPointerCapture").mockReturnValue(true);
    fireEvent.pointerDown(el, { clientX: 50, pointerId: 1, button: 0 });
    expect(thumb()).toHaveAttribute("aria-valuenow", "25");
    fireEvent.pointerMove(el, { clientX: 150, pointerId: 1 });
    expect(thumb()).toHaveAttribute("aria-valuenow", "75");
    fireEvent.pointerUp(el, { clientX: 150, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(75);
    expect(onValueCommit).toHaveBeenCalledWith(75);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(20);
      return (
        <>
          <SloshSlider aria-label="Flow" value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.tab();
    await user.keyboard("{ArrowRight}{PageUp}");
    expect(screen.getByRole("status")).toHaveTextContent("31");
  });

  it("holds a controlled value the parent does not update", async () => {
    const user = userEvent.setup();
    render(<SloshSlider aria-label="Flow" value={40} />);
    await user.tab();
    await user.keyboard("{PageUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "40");
  });

  it("starts the fill at the value", () => {
    const { container } = render(<SloshSlider aria-label="Flow" />);
    expect(fillOf(container)).toHaveAttribute("aria-hidden", "true");
    expect(fillOf(container).style.width).toBe("calc(62% + 16px)");
  });

  it("under reduced motion the fill arrives at once and never leans", async () => {
    mockReducedMotion();
    const user = userEvent.setup();
    const { container } = render(<SloshSlider aria-label="Flow" />);
    await user.tab();
    await user.keyboard("{Home}");
    await waitFor(() => expect(fillOf(container).style.width).toBe("calc(0% + 16px)"));
    expect(fillOf(container).style.clipPath).toContain("calc(100% - 16px) 0");
  });

  it("chases the value with a spring otherwise", async () => {
    const user = userEvent.setup();
    const { container } = render(<SloshSlider aria-label="Flow" dir="rtl" />);
    await user.tab();
    await user.keyboard("{End}");
    await waitFor(() => expect(fillOf(container).style.width).not.toBe("calc(62% + 16px)"));
    await waitFor(() => expect(fillOf(container).style.clipPath).toMatch(/^polygon\(/));
  });

  it("maps the feel levels to a spring", () => {
    expect(sloshSpring(15, 55)).toEqual({ stiffness: 600, damping: 30.5, mass: 1.06 });
    expect(sloshSpring(500, -5).damping).toBe(90);
    expect(sloshSpring(500, -5).mass).toBe(0.4);
  });

  it("does nothing when disabled", () => {
    const onValueChange = vi.fn();
    render(<SloshSlider aria-label="Flow" disabled onValueChange={onValueChange} />);
    fireEvent.keyDown(thumb(), { key: "PageUp" });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(thumb()).toHaveAttribute("aria-valuenow", "62");
  });

  it("submits under a name inside a form", () => {
    const { container } = render(
      <form>
        <SloshSlider aria-label="Flow" name="flow" />
      </form>,
    );
    expect(container.querySelector("input[name=flow]")).toHaveValue("62");
  });

  it("applies fill, stroke and corner, and lets className and style win", () => {
    const { container } = render(
      <SloshSlider
        aria-label="Flow"
        fill="dark"
        stroke
        corner={4}
        className="h-12"
        style={{ opacity: 0.5 }}
      />,
    );
    const el = root(container);
    expect(el).toHaveClass("h-12");
    expect(el).not.toHaveClass("h-10");
    expect(el.className).toContain("inset_0_0_0_1px");
    expect(el.className).toContain("--slosh-track:var(--color-foreground)");
    expect(el.style.borderRadius).toBe("4px");
    expect(el.style.opacity).toBe("0.5");
  });

  it("forwards its ref to the root", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<SloshSlider aria-label="Flow" ref={ref} />);
    expect(ref.current).toHaveAttribute("data-slot", "slosh-slider");
  });

  it("has no axe violations", async () => {
    const { container } = render(<SloshSlider aria-label="Flow" />);
    await expectNoA11yViolations(container);
  });
});
