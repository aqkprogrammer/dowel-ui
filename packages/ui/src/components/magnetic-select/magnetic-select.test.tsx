import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MagneticSelect, type MagneticSelectOption } from "./magnetic-select";
import { springEasing } from "./magnetic-select-spring";

const options = (count: number): MagneticSelectOption[] =>
  Array.from({ length: count }, (_, index) => ({
    value: `o${String(index + 1)}`,
    label: `Option ${String(index + 1)}`,
  }));

const SEVEN = options(7);

function radios() {
  return screen.getAllByRole("radio");
}

function styleOf(element: HTMLElement) {
  return element.getAttribute("style") ?? "";
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MagneticSelect", () => {
  it("renders a named radiogroup of named radios, none checked by default", () => {
    render(<MagneticSelect aria-label="Shape" options={SEVEN} />);
    expect(screen.getByRole("radiogroup", { name: "Shape" })).toBeInTheDocument();
    expect(radios()).toHaveLength(7);
    for (const radio of radios()) expect(radio).toHaveAttribute("aria-checked", "false");
    // With nothing chosen the first chip is the one Tab reaches.
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1]);
  });

  it("packs seven chips into a honeycomb in reading order", () => {
    render(<MagneticSelect aria-label="Shape" options={SEVEN} />);
    const group = screen.getByRole("radiogroup");
    expect(styleOf(group)).toContain("width: 186px");
    expect(styleOf(group)).toContain("height: 173.94px");
    const [first, , , centre] = radios();
    expect(styleOf(first!)).toContain("inset-inline-start: 48.5px");
    expect(styleOf(first!)).toContain("top: 26px");
    expect(styleOf(centre!)).toContain("inset-inline-start: 71px");
  });

  it("lays three chips out as a triangle and caps the honeycomb at nineteen", () => {
    const { unmount } = render(<MagneticSelect aria-label="Shape" options={options(3)} />);
    expect(styleOf(screen.getByRole("radiogroup"))).toContain("width: 141px");
    expect(styleOf(radios()[0]!)).toContain("inset-inline-start: 48.5px");
    unmount();
    render(<MagneticSelect aria-label="Shape" options={options(25)} />);
    expect(radios()).toHaveLength(19);
  });

  it("selects on click, grows the chosen chip and pushes the rest away", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<MagneticSelect aria-label="Shape" options={SEVEN} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Option 4" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("o4");
    const centre = screen.getByRole("radio", { name: "Option 4" });
    expect(centre).toHaveAttribute("aria-checked", "true");
    expect(centre).toHaveAttribute("data-state", "checked");
    expect(styleOf(centre)).toContain("scale: 1 1.28");

    // Directly to the start: pushed along X only, and tilted.
    const start = screen.getByRole("radio", { name: "Option 3" });
    expect(styleOf(start)).toContain(
      "translate: calc(var(--magnetic-select-dir) * -13.92px) 0px",
    );
    expect(styleOf(start)).toContain("rotate: calc(var(--magnetic-select-dir) * -2.75deg)");
    expect(styleOf(start)).toContain("scale: 1 0.91");

    // Clicking the chosen chip again does not report a change.
    await user.click(centre);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("pushes two-hop chips a little less and keeps them tabbable only when selected", async () => {
    const user = userEvent.setup();
    render(<MagneticSelect aria-label="Shape" options={SEVEN} defaultValue="o1" />);
    const last = screen.getByRole("radio", { name: "Option 7" });
    expect(styleOf(last)).toContain("scale: 1 0.93");
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1]);
    await user.click(last);
    expect(last.tabIndex).toBe(0);
  });

  it("moves and selects with the arrow keys, wrapping, with Home and End", async () => {
    const user = userEvent.setup();
    render(<MagneticSelect aria-label="Shape" options={SEVEN} defaultValue="o1" />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Option 1" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Option 2" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Option 2" })).toBeChecked();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Option 3" })).toBeChecked();

    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Option 7" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Option 7" })).toBeChecked();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Option 7" })).toBeChecked();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Option 1" })).toHaveFocus();

    // Other keys are left alone.
    await user.keyboard("a");
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();
  });

  it("follows the reading direction in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <MagneticSelect aria-label="Shape" options={SEVEN} defaultValue="o2" />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Option 2" })).toBeChecked();
  });

  it("follows a controlled value and only requests changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <MagneticSelect
        aria-label="Shape"
        options={SEVEN}
        value="o1"
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Option 5" }));
    expect(onValueChange).toHaveBeenCalledWith("o5");
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();

    rerender(
      <MagneticSelect
        aria-label="Shape"
        options={SEVEN}
        value="o5"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "Option 5" })).toBeChecked();
  });

  it("maps pull, bounce and give onto the spring", () => {
    const { rerender } = render(
      <MagneticSelect
        aria-label="Shape"
        options={SEVEN}
        defaultValue="o4"
        pull={100}
        bounce={0}
      />,
    );
    const group = screen.getByRole("radiogroup");
    expect(styleOf(screen.getByRole("radio", { name: "Option 4" }))).toContain("scale: 1 1.38");
    expect(group.style.getPropertyValue("--magnetic-select-spring")).toBe(springEasing(0));
    expect(styleOf(radios()[0]!)).toContain(
      "transition-duration: calc(290ms * var(--motion-scale))",
    );

    rerender(
      <MagneticSelect aria-label="Shape" options={SEVEN} defaultValue="o4" give={100} />,
    );
    expect(styleOf(radios()[0]!)).toContain(
      "transition-duration: calc(800ms * var(--motion-scale))",
    );
    expect(group.style.getPropertyValue("--magnetic-select-spring")).toBe(springEasing(0.7));
  });

  it("drives the cursor parallax from a mouse only, and resets on leave", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <MagneticSelect
        aria-label="Shape"
        options={SEVEN}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    const group = screen.getByRole("radiogroup");
    vi.spyOn(group, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(group, { pointerType: "touch", clientX: 0, clientY: 0 });
    expect(group.style.getPropertyValue("--lx")).toBe("");

    fireEvent.pointerMove(group, { pointerType: "mouse", clientX: 200, clientY: 25 });
    expect(group.style.getPropertyValue("--lx")).toBe("2.5px");
    expect(group.style.getPropertyValue("--ly")).toBe("-1.25px");
    expect(onPointerMove).toHaveBeenCalledTimes(2);

    fireEvent.pointerLeave(group);
    expect(group.style.getPropertyValue("--lx")).toBe("");
    expect(onPointerLeave).toHaveBeenCalled();
  });

  it("shows the option image on the chosen chip, and a gradient otherwise", () => {
    render(
      <MagneticSelect
        aria-label="Shape"
        options={[
          { value: "a", label: "A", image: "/orb.png", content: <span>A</span> },
          { value: "b", label: "B" },
        ]}
        defaultValue="a"
      />,
    );
    const [a, b] = radios();
    const fillA = a!.querySelector<HTMLElement>('[data-slot="magnetic-select-fill"]')!;
    expect(fillA.style.backgroundImage).toContain("/orb.png");
    expect(fillA).toHaveClass("opacity-100");
    const fillB = b!.querySelector('[data-slot="magnetic-select-fill"]')!;
    expect(fillB).toHaveClass("opacity-0");
    expect(a).toHaveTextContent("A");
  });

  it("submits through a hidden input and can be disabled", () => {
    const { container } = render(
      <MagneticSelect
        aria-label="Shape"
        options={SEVEN}
        name="shape"
        defaultValue="o3"
        disabled
      />,
    );
    expect(container.querySelector('input[name="shape"]')).toHaveValue("o3");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
    for (const radio of radios()) expect(radio).toBeDisabled();
  });

  it("adds an inset hairline with stroke", () => {
    render(<MagneticSelect aria-label="Shape" options={SEVEN} stroke />);
    expect(radios()[0]!.querySelector('[data-slot="magnetic-select-skin"]')).toHaveClass(
      "after:ring-1",
    );
  });

  it("warns in development when the group has no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<MagneticSelect options={SEVEN} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no name"));
    warn.mockClear();
    render(<MagneticSelect aria-labelledby="x" options={SEVEN} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("merges className and forwards refs of both kinds", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = render(
      <MagneticSelect ref={ref} aria-label="Shape" options={SEVEN} className="gap-9" />,
    );
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("gap-9", "relative");
    unmount();
    const callback = vi.fn();
    render(<MagneticSelect ref={callback} aria-label="Shape" options={SEVEN} />);
    expect(callback).toHaveBeenCalledWith(screen.getByRole("radiogroup"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <MagneticSelect aria-label="Shape" options={SEVEN} defaultValue="o4" stroke />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("springEasing", () => {
  it("is monotone with no overshoot at zero bounce and overshoots when lively", () => {
    const values = (easing: string) =>
      easing.slice("linear(".length, -1).split(", ").map(Number);
    const still = values(springEasing(0));
    expect(Math.max(...still)).toBeLessThanOrEqual(1);
    expect(still.at(-1)).toBe(1);
    expect(Math.max(...values(springEasing(1)))).toBeGreaterThan(1);
    expect(values(springEasing(5, 8))).toHaveLength(9);
  });
});
