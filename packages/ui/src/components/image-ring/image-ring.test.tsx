import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ImageRing, ringRadius, type ImageRingItem } from "./image-ring";

const images: ImageRingItem[] = Array.from({ length: 8 }, (_, i) => ({
  src: `/photo-${String(i)}.jpg`,
  alt: `Photo ${String(i + 1)}`,
}));

let frames: FrameRequestCallback[] = [];
let now = 0;
function flush(count: number) {
  for (let i = 0; i < count; i += 1) {
    const batch = frames;
    frames = [];
    now += 16;
    for (const callback of batch) callback(now);
  }
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const yaw = (container: HTMLElement) =>
  Number(
    /rotateY\((-?[\d.e-]+)deg\)/.exec(
      (container.querySelector('[data-slot="image-ring-ring"]') as HTMLElement).style.transform,
    )?.[1],
  );

describe("ringRadius", () => {
  it("fits the items edge to edge", () => {
    // Four 100px items make a square of side 100: radius 50.
    expect(ringRadius(4, 100)).toBeCloseTo(50);
    expect(ringRadius(6, 100)).toBeCloseTo(86.6, 1);
  });
});

describe("ImageRing", () => {
  it("is a named region holding a list of every image", async () => {
    const { container } = render(<ImageRing label="Studio work" images={images} />);
    const region = screen.getByRole("region", { name: "Studio work" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("img", { name: "Photo 3" })).toHaveAttribute("src", "/photo-2.jpg");
    await expectNoA11yViolations(container);
  });

  it("places each image around the ring", () => {
    const { container } = render(
      <ImageRing label="Ring" images={images} itemWidth={100} gap={0} />,
    );
    const items = container.querySelectorAll<HTMLElement>('[data-slot="image-ring-item"]');
    expect(items[2]?.style.transform).toContain("rotateY(90deg)");
    expect(items[2]?.style.transform).toContain(`translateZ(${String(ringRadius(8, 100))}px)`);
  });

  it("drifts on its own, and stops while hovered", () => {
    const { container } = render(<ImageRing label="Ring" images={images} duration={10} />);
    act(() => {
      flush(60);
    });
    const drifted = yaw(container);
    expect(drifted).toBeLessThan(-5);
    fireEvent.pointerEnter(screen.getByRole("region"));
    act(() => {
      flush(120);
    });
    // Eases to rest, then holds.
    const held = yaw(container);
    act(() => {
      flush(60);
    });
    expect(yaw(container)).toBeCloseTo(held, 1);
  });

  it("turns one image per arrow key, easing to it", () => {
    const { container } = render(<ImageRing label="Ring" images={images} duration={0} />);
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    act(() => {
      flush(120);
    });
    expect(yaw(container)).toBeCloseTo(-45, 0);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    act(() => {
      flush(120);
    });
    expect(yaw(container)).toBeCloseTo(45, 0);
  });

  it("turns by a drag", () => {
    const { container } = render(
      <ImageRing label="Ring" images={images} duration={0} itemWidth={100} gap={0} />,
    );
    const region = screen.getByRole("region");
    region.setPointerCapture = vi.fn();
    fireEvent.pointerDown(region, { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(region, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(region, { clientX: 200, pointerId: 1 });
    act(() => {
      flush(120);
    });
    // Dragging one image's width turns it by one image.
    expect(yaw(container)).toBeCloseTo(-45, 0);
  });

  it("fades images that face away", () => {
    const { container } = render(<ImageRing label="Ring" images={images} duration={0} />);
    const items = container.querySelectorAll<HTMLElement>('[data-slot="image-ring-item"]');
    expect(Number(items[0]?.style.opacity)).toBeCloseTo(1);
    expect(Number(items[4]?.style.opacity)).toBeCloseTo(0.3);
  });
});
