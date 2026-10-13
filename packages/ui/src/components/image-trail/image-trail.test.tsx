import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ImageTrail } from "./image-trail";

const IMAGES = ["/a.jpg", "/b.jpg", "/c.jpg"];

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
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

const images = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLImageElement>("[data-slot=image-trail-image]"),
];

function move(element: Element, x: number, y: number, pointerType = "mouse") {
  fireEvent.pointerMove(element, { clientX: x, clientY: y, pointerType });
}

describe("ImageTrail", () => {
  let animate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    animate = vi.fn();
    HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 800, 400),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error -- jsdom has no animate; remove the stub again
    delete HTMLElement.prototype.animate;
  });

  it("keeps a pool of decorative images behind its content", async () => {
    const { container } = render(
      <ImageTrail images={IMAGES} poolSize={6}>
        <h2>Selected work</h2>
      </ImageTrail>,
    );
    expect(images(container)).toHaveLength(6);
    for (const image of images(container)) expect(image).toHaveAttribute("alt", "");
    expect(container.querySelector("[data-slot=image-trail-layer]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Selected work" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("drops the next image wherever the pointer has travelled far enough", () => {
    const { container } = render(
      <ImageTrail images={IMAGES} spacing={50} size={100} ratio={1} />,
    );
    const root = container.firstElementChild as HTMLElement;
    move(root, 100, 100);
    move(root, 120, 100);
    move(root, 200, 100);
    const [first, second, third] = images(container);
    expect(first?.getAttribute("src")).toBe("/a.jpg");
    expect(first?.style.left).toBe("50px");
    expect(first?.style.top).toBe("50px");
    // 20px was too short a hop; 100px was not.
    expect(second?.getAttribute("src")).toBe("/b.jpg");
    expect(second?.style.left).toBe("150px");
    expect(third?.getAttribute("src")).toBeNull();
    expect(animate).toHaveBeenCalledTimes(2);
    expect(Number(second?.style.zIndex)).toBeGreaterThan(Number(first?.style.zIndex));
  });

  it("reuses the pool in turn and cycles the images", () => {
    const { container } = render(<ImageTrail images={IMAGES} spacing={10} poolSize={2} />);
    const root = container.firstElementChild as HTMLElement;
    for (let i = 0; i < 4; i += 1) move(root, 20 + i * 50, 100);
    const [first, second] = images(container);
    // Four drops into two slots: slot one holds the third image, slot two the first again.
    expect(first?.getAttribute("src")).toBe("/c.jpg");
    expect(second?.getAttribute("src")).toBe("/a.jpg");
  });

  it("ignores touch and pen, which have no hover path", () => {
    const { container } = render(<ImageTrail images={IMAGES} />);
    const root = container.firstElementChild as HTMLElement;
    move(root, 100, 100, "touch");
    move(root, 300, 100, "pen");
    expect(animate).not.toHaveBeenCalled();
  });

  it("shows no images under reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<ImageTrail images={IMAGES} />);
    expect(images(container)).toHaveLength(0);
    move(container.firstElementChild as HTMLElement, 100, 100);
    expect(animate).not.toHaveBeenCalled();
  });

  it("starts a fresh trail when the pointer comes back", () => {
    const { container } = render(<ImageTrail images={IMAGES} spacing={500} />);
    const root = container.firstElementChild as HTMLElement;
    move(root, 100, 100);
    fireEvent.pointerLeave(root);
    move(root, 120, 100);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("can pass over the content, lets className win and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ImageTrail
        ref={ref}
        images={IMAGES}
        layer="above"
        className="isolation-auto"
        data-testid="t"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("t"));
    expect(ref.current?.className).toContain("z-20");
    expect(ref.current).toHaveClass("isolation-auto");
    expect(ref.current).not.toHaveClass("isolate");
  });
});
