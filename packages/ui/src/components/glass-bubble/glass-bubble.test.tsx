import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  drawDisplacementMap,
  GlassBubble,
  glassBubbleScales,
  supportsSvgBackdrop,
} from "./glass-bubble";

let measure: MockInstance<() => DOMRect>;

beforeEach(() => {
  // A 600x600 field: at size 132 the travel is 468 each way.
  measure = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue(new DOMRect(0, 0, 600, 600));
});
afterEach(() => {
  vi.restoreAllMocks();
});

function bubble() {
  return screen.getByRole("slider");
}

function root() {
  return document.querySelector('[data-slot="glass-bubble"]');
}

/** A 2D context good enough for the map: pixel buffer in, data URL out. */
function mockCanvas() {
  const put = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: put,
      }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,AA",
  );
  return put;
}

describe("GlassBubble", () => {
  it("is a labelled 2D slider over its content", () => {
    render(
      <GlassBubble defaultValue={{ x: 49, y: 36 }}>
        <p>Under the glass</p>
      </GlassBubble>,
    );
    const slider = screen.getByRole("slider", { name: "Glass bubble" });
    expect(slider).toHaveAttribute("aria-valuetext", "49 across, 36 down");
    expect(slider).toHaveAttribute("aria-valuenow", "49");
    expect(slider).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Under the glass")).toBeInTheDocument();
    for (const slot of ["glass-bubble-specular", "glass-bubble-rim"]) {
      expect(document.querySelector(`[data-slot="${slot}"]`)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("moves 2% per arrow, 6% with Shift, and Home centres", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GlassBubble onValueChange={onValueChange} />);
    bubble().focus();
    await user.keyboard("{ArrowRight}{ArrowUp}");
    expect(bubble()).toHaveAttribute("aria-valuetext", "52 across, 48 down");
    await user.keyboard("{Shift>}{ArrowLeft}{ArrowDown}{/Shift}");
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 46, y: 54 });
    await user.keyboard("{Home}");
    expect(bubble()).toHaveAttribute("aria-valuetext", "50 across, 50 down");
    await user.keyboard("{Home}{a}");
    expect(onValueChange).toHaveBeenCalledTimes(5);
  });

  it("mirrors horizontal keys and drags in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <GlassBubble />
      </DirectionProvider>,
    );
    bubble().focus();
    await user.keyboard("{ArrowRight}");
    expect(bubble()).toHaveAttribute("aria-valuetext", "48 across, 50 down");
    fireEvent.pointerDown(bubble(), { pointerId: 1, button: 0, clientX: 300, clientY: 300 });
    fireEvent.pointerMove(bubble(), { pointerId: 1, clientX: 300 - 46.8, clientY: 300 });
    expect(bubble()).toHaveAttribute("aria-valuetext", "58 across, 50 down");
  });

  it("drags 1:1, tightens its shadow while held, and stays where dropped", () => {
    render(<GlassBubble />);
    const slider = bubble();
    const rim = document.querySelector<HTMLElement>('[data-slot="glass-bubble-rim"]');
    expect(rim?.style.boxShadow).toContain("10px 22px");
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 300, clientY: 300 });
    expect(slider).toHaveAttribute("data-held");
    expect(slider).toHaveFocus();
    expect(rim?.style.boxShadow).toContain("5px 12px");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 300 + 46.8, clientY: 300 - 93.6 });
    expect(slider).toHaveAttribute("aria-valuetext", "60 across, 30 down");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: -5000, clientY: 5000 });
    expect(slider).toHaveAttribute("aria-valuetext", "0 across, 100 down");
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(slider).not.toHaveAttribute("data-held");
    expect(rim?.style.boxShadow).toContain("10px 22px");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 300, clientY: 300 });
    expect(slider).toHaveAttribute("aria-valuetext", "0 across, 100 down");
  });

  it("ignores secondary buttons and stray pointers", () => {
    const onValueChange = vi.fn();
    render(<GlassBubble onValueChange={onValueChange} />);
    const slider = bubble();
    fireEvent.pointerDown(slider, { pointerId: 1, button: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 90, clientY: 0 });
    fireEvent.pointerDown(slider, { pointerId: 2, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 3, clientX: 90, clientY: 0 });
    fireEvent.pointerUp(slider, { pointerId: 3 });
    expect(slider).toHaveAttribute("data-held");
    fireEvent.pointerCancel(slider, { pointerId: 2 });
    expect(slider).not.toHaveAttribute("data-held");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("centres when the field is no bigger than the bubble", () => {
    measure.mockReturnValue(new DOMRect(0, 0, 100, 100));
    render(<GlassBubble defaultValue={{ x: 10, y: 10 }} />);
    fireEvent.pointerDown(bubble(), { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(bubble(), { pointerId: 1, clientX: 20, clientY: 20 });
    expect(bubble()).toHaveAttribute("aria-valuetext", "50 across, 50 down");
  });

  it("is controllable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <GlassBubble value={{ x: 20, y: 20 }} onValueChange={onValueChange} />,
    );
    bubble().focus();
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledWith({ x: 20, y: 22 });
    expect(bubble()).toHaveAttribute("aria-valuetext", "20 across, 20 down");
    rerender(<GlassBubble value={{ x: 90, y: -10 }} onValueChange={onValueChange} />);
    expect(bubble()).toHaveAttribute("aria-valuetext", "90 across, 0 down");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GlassBubble disabled onValueChange={onValueChange} />);
    const slider = bubble();
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 90, clientY: 0 });
    await user.click(slider);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("falls back to a blur lens outside Chromium (jsdom)", () => {
    render(<GlassBubble />);
    expect(root()).toHaveAttribute("data-lens", "fallback");
    expect(bubble().style.backdropFilter).toContain("blur(");
    expect(document.querySelector("filter")).toBeNull();
  });

  it("builds the refracting SVG lens when asked, with one pass per channel", () => {
    const put = mockCanvas();
    render(<GlassBubble lens="svg" size={80} fringe={40} />);
    expect(root()).toHaveAttribute("data-lens", "svg");
    const filter = document.querySelector("filter");
    expect(filter?.id).toMatch(/^dowel-glass-bubble-/);
    expect(bubble().style.backdropFilter).toBe(
      `url(#${String(filter?.id)}) saturate(1.12) brightness(1.04)`,
    );
    const scales = [...document.querySelectorAll("feDisplacementMap")].map((pass) =>
      Number(pass.getAttribute("scale")),
    );
    expect(scales).toEqual([166.4, 160, 153.6]);
    expect(document.querySelectorAll("feBlend")).toHaveLength(2);
    expect(document.querySelector("feImage")).toHaveAttribute(
      "href",
      "data:image/png;base64,AA",
    );
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("uses the SVG lens by default where Chromium says so", () => {
    mockCanvas();
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { brands: [{ brand: "Chromium" }] },
    });
    try {
      render(<GlassBubble />);
      expect(root()).toHaveAttribute("data-lens", "svg");
    } finally {
      Reflect.deleteProperty(navigator, "userAgentData");
    }
  });

  it("omits the map when there is no 2D canvas", () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);
    render(<GlassBubble lens="svg" />);
    expect(document.querySelector("feImage")).toBeNull();
    getContext.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(drawDisplacementMap(80, 70)).toBeNull();
  });

  it("draws a map that pulls toward the centre and leaves the corners alone", () => {
    let pixels = new Uint8ClampedArray(0);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          createImageData: (w: number, h: number) => {
            pixels = new Uint8ClampedArray(w * h * 4);
            return { data: pixels };
          },
          putImageData: () => {},
        }) as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:map");
    expect(drawDisplacementMap(10, 100)).toBe("data:map");
    const at = (col: number, row: number) => [
      ...pixels.slice((row * 10 + col) * 4, (row * 10 + col) * 4 + 4),
    ];
    expect(at(0, 0)).toEqual([128, 128, 128, 255]);
    // Left of centre samples to the right (red above half), and vice versa.
    expect(at(1, 5)[0]).toBeGreaterThan(128);
    expect(at(8, 5)[0]).toBeLessThan(128);
  });

  it("spreads the channel scales with fringe", () => {
    expect(glassBubbleScales(0)).toEqual({ r: 160, g: 160, b: 160 });
    expect(glassBubbleScales(18).r).toBeCloseTo(162.88);
    expect(glassBubbleScales(99)).toEqual(glassBubbleScales(40));
  });

  it("detects Chromium from client hints or the user agent", () => {
    const nav = (userAgent: string, brands?: string[]) =>
      ({
        userAgent,
        userAgentData: brands ? { brands: brands.map((brand) => ({ brand })) } : undefined,
      }) as unknown as Navigator;
    expect(supportsSvgBackdrop(undefined)).toBe(false);
    expect(supportsSvgBackdrop(nav("", ["Chromium", "Google Chrome"]))).toBe(true);
    expect(supportsSvgBackdrop(nav("", ["Not A Brand"]))).toBe(false);
    expect(supportsSvgBackdrop(nav("Mozilla/5.0 AppleWebKit Chrome/140.0 Safari/537.36"))).toBe(
      true,
    );
    expect(supportsSvgBackdrop(nav("Mozilla/5.0 (iPhone) CriOS/140.0 Chrome/140.0"))).toBe(
      false,
    );
    expect(supportsSvgBackdrop(nav("Mozilla/5.0 Gecko/20100101 Firefox/140.0"))).toBe(false);
    expect(supportsSvgBackdrop(nav("Mozilla/5.0 Version/18.0 Safari/605.1.15"))).toBe(false);
  });

  it("keeps working under reduced motion: nothing moves on its own", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
    );
    const user = userEvent.setup();
    render(<GlassBubble />);
    bubble().focus();
    await user.keyboard("{ArrowLeft}");
    expect(bubble()).toHaveAttribute("aria-valuetext", "48 across, 50 down");
    const rim = document.querySelector('[data-slot="glass-bubble-rim"]');
    expect(rim?.className).toContain("duration-[var(--duration-fast)]");
  });

  it("lets the consumer's className win, clamps size, and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<GlassBubble ref={ref} className="max-w-sm" size={400} />);
    expect(ref.current).toBe(root());
    expect(ref.current).toHaveClass("max-w-sm");
    expect(ref.current).not.toHaveClass("max-w-[37.5rem]");
    expect(bubble().style.width).toBe("240px");
  });

  it("can be named by another element", () => {
    render(
      <>
        <span id="lens-name">Magnifier</span>
        <GlassBubble aria-labelledby="lens-name" />
      </>,
    );
    expect(screen.getByRole("slider", { name: "Magnifier" })).not.toHaveAttribute("aria-label");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <GlassBubble>
        <p>Content</p>
      </GlassBubble>,
    );
    await expectNoA11yViolations(container);
  });
});
