import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Carousel3D, type Carousel3DItem } from "./carousel-3d";

const items: Carousel3DItem[] = [
  { title: "Dawn", image: "/a.jpg" },
  { title: "Noon", image: "/b.jpg" },
  { title: "Dusk", image: "/c.jpg" },
  { title: "Night", image: "/d.jpg" },
  { title: "Stars", content: <span>custom</span> },
];

function slides() {
  return screen.getAllByRole("tabpanel", { hidden: true });
}

function currentSlide(container: HTMLElement) {
  return container.querySelector('[data-slot="carousel-3d-slide"][data-state="active"]');
}

function rect(left: number, width: number): DOMRect {
  return {
    left,
    right: left + width,
    top: 0,
    bottom: 100,
    width,
    height: 100,
    x: left,
    y: 0,
    toJSON: () => ({}),
  };
}

describe("Carousel3D", () => {
  it("renders an APG carousel region with labelled slides, buttons and dots", () => {
    render(<Carousel3D items={items} aria-label="Places" />);
    const region = screen.getByRole("region", { name: "Places" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Slides" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    // Only the current slide is exposed; the neighbours are inert.
    const visible = screen.getAllByRole("tabpanel");
    expect(visible).toHaveLength(1);
    expect(visible[0]).toHaveAttribute("aria-roledescription", "slide");
    expect(visible[0]).toHaveAccessibleName("3 of 5");
    expect(slides()[0]).toHaveAttribute("inert");
  });

  it("defaults the region name and starts in the middle, like the source", () => {
    render(<Carousel3D items={items} />);
    expect(screen.getByRole("region", { name: "Carousel" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Dusk" })).toHaveAttribute("aria-selected", "true");
  });

  it("steps with the buttons and announces the change", async () => {
    const user = userEvent.setup();
    const { container } = render(<Carousel3D items={items} defaultIndex={0} />);
    const previous = screen.getByRole("button", { name: "Previous slide" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    await user.click(previous);
    expect(screen.getByRole("status")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("tab", { name: "Noon" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Noon, 2 of 5");
    expect(currentSlide(container)).toHaveTextContent("Noon");

    await user.click(previous);
    expect(screen.getByRole("tab", { name: "Dawn" })).toHaveAttribute("aria-selected", "true");
  });

  it("disables next at the end unless it loops", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Carousel3D items={items} defaultIndex={4} />);
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    await user.click(next);
    expect(screen.getByRole("tab", { name: "Stars" })).toHaveAttribute("aria-selected", "true");

    rerender(<Carousel3D items={items} defaultIndex={4} loop />);
    expect(next).not.toHaveAttribute("aria-disabled");
    await user.click(next);
    expect(screen.getByRole("tab", { name: "Dawn" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(screen.getByRole("tab", { name: "Stars" })).toHaveAttribute("aria-selected", "true");
  });

  it("selects a slide from its dot", async () => {
    const user = userEvent.setup();
    render(<Carousel3D items={items} />);
    await user.click(screen.getByRole("tab", { name: "Night" }));
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Dusk" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves selection and focus through the dots with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<Carousel3D items={items} />);
    await user.tab();
    await user.tab();
    const dusk = screen.getByRole("tab", { name: "Dusk" });
    expect(dusk).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Night" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Noon" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Stars" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Dawn" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Dawn" })).toHaveAttribute("aria-selected", "true");
  });

  it("reverses arrow keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Carousel3D items={items} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Stars" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");
  });

  it("leaves arrow keys inside slide content alone, and ignores unrelated keys", async () => {
    const user = userEvent.setup();
    render(
      <Carousel3D
        items={[...items.slice(0, 2), { title: "Form", content: <input aria-label="Note" /> }]}
        defaultIndex={2}
      />,
    );
    await user.click(screen.getByRole("textbox", { name: "Note" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Form" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    await user.keyboard("a");
    expect(screen.getByRole("tab", { name: "Noon" })).toHaveAttribute("aria-selected", "true");
  });

  it("follows the controlled index and only requests changes", async () => {
    const onIndexChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Carousel3D items={items} index={1} onIndexChange={onIndexChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(screen.getByRole("tab", { name: "Noon" })).toHaveAttribute("aria-selected", "true");
    rerender(<Carousel3D items={items} index={2} onIndexChange={onIndexChange} />);
    expect(screen.getByRole("tab", { name: "Dusk" })).toHaveAttribute("aria-selected", "true");
  });

  it("works as a controlled component with state", async () => {
    function Controlled() {
      const [index, setIndex] = useState(0);
      return (
        <>
          <Carousel3D items={items} index={index} onIndexChange={setIndex} />
          <output>{index}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("tab", { name: "Night" }));
    expect(screen.getByText("3", { selector: "output" })).toBeInTheDocument();
  });

  it("swipes to the next slide, and back, in either direction of writing", () => {
    const { container, rerender } = render(<Carousel3D items={items} />);
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="carousel-3d-viewport"]',
    )!;

    fireEvent.pointerDown(viewport, { button: 0, pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 120 });
    expect(viewport).toHaveAttribute("data-dragging");
    expect(viewport.style.getPropertyValue("--c3d-drag")).toBe("-80px");
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 120 });
    expect(viewport).not.toHaveAttribute("data-dragging");
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");
    // The click that follows a drag does not select anything.
    fireEvent.click(viewport, { detail: 1, clientX: 0, clientY: 0 });
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");

    fireEvent.pointerDown(viewport, { button: 0, pointerId: 2, clientX: 100 });
    fireEvent.pointerMove(viewport, { pointerId: 2, clientX: 180 });
    fireEvent.pointerUp(viewport, { pointerId: 2, clientX: 180 });
    expect(screen.getByRole("tab", { name: "Dusk" })).toHaveAttribute("aria-selected", "true");

    rerender(
      <div dir="rtl">
        <Carousel3D items={items} />
      </div>,
    );
    const rtlViewport = container.querySelector<HTMLElement>(
      '[data-slot="carousel-3d-viewport"]',
    )!;
    fireEvent.pointerDown(rtlViewport, { button: 0, pointerId: 3, clientX: 100 });
    fireEvent.pointerMove(rtlViewport, { pointerId: 3, clientX: 180 });
    fireEvent.pointerUp(rtlViewport, { pointerId: 3, clientX: 180 });
    expect(screen.getByRole("tab", { name: "Night" })).toHaveAttribute("aria-selected", "true");
  });

  it("settles back when a drag is short, cancelled, or not the primary button", () => {
    const { container } = render(<Carousel3D items={items} />);
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="carousel-3d-viewport"]',
    )!;
    const selected = () => screen.getByRole("tab", { selected: true });

    fireEvent.pointerDown(viewport, { button: 0, pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 180 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 180 });
    expect(selected()).toHaveAccessibleName("Dusk");

    fireEvent.pointerDown(viewport, { button: 0, pointerId: 2, clientX: 200 });
    fireEvent.pointerMove(viewport, { pointerId: 2, clientX: 50 });
    fireEvent.pointerCancel(viewport, { pointerId: 2, clientX: 50 });
    expect(selected()).toHaveAccessibleName("Dusk");
    expect(viewport.style.getPropertyValue("--c3d-drag")).toBe("0px");

    fireEvent.pointerDown(viewport, { button: 2, pointerId: 3, clientX: 200 });
    fireEvent.pointerMove(viewport, { pointerId: 3, clientX: 50 });
    fireEvent.pointerUp(viewport, { pointerId: 3, clientX: 50 });
    expect(selected()).toHaveAccessibleName("Dusk");
    // A move from a pointer that never pressed is ignored.
    fireEvent.pointerMove(viewport, { pointerId: 9, clientX: 50 });
    expect(viewport).not.toHaveAttribute("data-dragging");
  });

  it("steps by as many slides as the drag covered, measured from the card", () => {
    const { container } = render(<Carousel3D items={items} variant="coverflow" />);
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="carousel-3d-viewport"]',
    )!;
    for (const slide of slides()) Object.defineProperty(slide, "offsetWidth", { value: 100 });
    fireEvent.pointerDown(viewport, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 220 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 220 });
    // 80px at 40px per step is two slides.
    expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName("Stars");
  });

  it("selects a neighbouring card that is clicked", () => {
    const { container } = render(<Carousel3D items={items} />);
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="carousel-3d-viewport"]',
    )!;
    slides().forEach((slide, i) => {
      slide.getBoundingClientRect = () => rect(i * 100, 120);
    });
    // 210 is inside Dusk (200–320) and Noon (100–220): the nearer one to the current slide wins.
    fireEvent.click(viewport, { detail: 1, clientX: 210, clientY: 50 });
    expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName("Dusk");
    fireEvent.click(viewport, { detail: 1, clientX: 450, clientY: 50 });
    expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName("Stars");
    // Keyboard-originated clicks (detail 0) and clicks outside every card do nothing.
    fireEvent.click(viewport, { detail: 0, clientX: 10, clientY: 50 });
    fireEvent.click(viewport, { detail: 1, clientX: 900, clientY: 50 });
    expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName("Stars");
  });

  it("places slides by offset, mirrored through a direction variable", () => {
    const { container, rerender } = render(<Carousel3D items={items} />);
    const root = container.querySelector('[data-slot="carousel-3d"]')!;
    expect(root).toHaveClass("[--c3d-dir:1]", "rtl:[--c3d-dir:-1]");
    expect(slides()[0]!.style.transform).toContain("translateX(calc(-2 * var(--c3d-dir)");
    expect(slides()[2]!.style.transform).toContain("scale(1.05)");

    rerender(<Carousel3D items={items} variant="coverflow" />);
    expect(root).toHaveAttribute("data-variant", "coverflow");
    expect(slides()[0]!.style.opacity).toBe("0.5");
    expect(slides()[0]!.style.transform).toContain("rotateY(calc(38 * var(--c3d-dir) * 1deg))");
    expect(slides()[4]!.style.transform).toContain(
      "rotateY(calc(-38 * var(--c3d-dir) * 1deg))",
    );
    expect(slides()[2]!.style.transform).toContain("scale(1.1)");
    rerender(<Carousel3D items={items} variant="coverflow" defaultIndex={0} index={0} />);
    expect(slides()[4]!.style.opacity).toBe("0");
  });

  it("renders images, custom content, and numbered tiles in the mono tone", () => {
    const { container, rerender } = render(<Carousel3D items={items} />);
    expect(container.querySelectorAll("img")).toHaveLength(4);
    expect(screen.getByText("custom")).toBeInTheDocument();

    rerender(<Carousel3D items={items} tone="mono" />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    const cards = container.querySelectorAll('[data-slot="carousel-3d-card"]');
    expect(cards[0]).toHaveTextContent("1");
    expect(cards[0]).toHaveClass("bg-muted");
  });

  it("applies the spread and size variants", () => {
    const { container, rerender } = render(
      <Carousel3D items={items} spread="always" size="lg" />,
    );
    const root = container.querySelector('[data-slot="carousel-3d"]')!;
    expect(root).toHaveClass("[--c3d-spread:1]", "[--c3d-card:10rem]");
    rerender(<Carousel3D items={items} spread="never" size="sm" />);
    expect(root).toHaveClass("[--c3d-spread:0]", "[--c3d-card:5rem]");
  });

  it("mirrors its chevrons for right-to-left layouts", () => {
    render(<Carousel3D items={items} />);
    for (const name of ["Previous slide", "Next slide"]) {
      expect(screen.getByRole("button", { name }).querySelector("svg")).toHaveClass(
        "rtl:-scale-x-100",
      );
    }
  });

  it("takes custom labels", () => {
    render(
      <Carousel3D
        items={items}
        aria-labelledby="heading"
        previousLabel="Back"
        nextLabel="Forward"
        dotsLabel="Pick"
        slideLabel={(i) => `Card ${String(i + 1)}`}
      />,
    );
    expect(screen.getByRole("region")).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forward" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Pick" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Card 3");
  });

  it("lets a consumer className win and forwards refs and props", () => {
    const ref = createRef<HTMLElement>();
    const callback = vi.fn();
    const { rerender } = render(
      <Carousel3D items={items} ref={ref} className="gap-8" data-testid="c" />,
    );
    expect(ref.current).toBe(screen.getByTestId("c"));
    expect(ref.current).toHaveClass("gap-8");
    expect(ref.current).not.toHaveClass("gap-4");
    rerender(<Carousel3D items={items} ref={callback} />);
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it("uses token-driven transitions, which collapse under reduced motion", () => {
    render(<Carousel3D items={items} />);
    for (const slide of slides()) {
      expect(slide.className).toContain("duration-[var(--duration-slower)]");
      expect(slide.className).toContain("group-data-[dragging]/c3d:transition-none");
    }
  });

  it("renders nothing to select with no items", () => {
    render(<Carousel3D items={[]} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("has no axe violations in either variant", async () => {
    const { container, rerender } = render(<Carousel3D items={items} aria-label="Places" />);
    await expectNoA11yViolations(container);
    rerender(<Carousel3D items={items} aria-label="Places" variant="coverflow" tone="mono" />);
    await expectNoA11yViolations(container);
  });
});
