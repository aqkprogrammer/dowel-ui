import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GridReveal } from "./grid-reveal";

/*
 * jsdom neither loads nor decodes images and has no 2D canvas. Tests fire
 * `load` / `error` on the image themselves, and the reveal order falls back to
 * centre-out unless a test installs a 2D context that reads back pixels.
 */

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function frame() {
  const element = document.querySelector<HTMLElement>('[data-slot="grid-reveal"]');
  if (!element) throw new Error("no frame");
  return element;
}

function cells() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="grid-reveal-cell"]')];
}

function image() {
  return document.querySelector<HTMLImageElement>('[data-slot="grid-reveal-image"]');
}

/** Lets the decode promise settle and React commit. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function load() {
  const img = image();
  if (!img) throw new Error("no image");
  fireEvent.load(img);
  await settle();
}

function finish() {
  act(() => {
    vi.advanceTimersByTime(2000);
  });
}

describe("GridReveal", () => {
  it("opens as four busy cells, hidden from assistive technology without alt", () => {
    render(<GridReveal />);
    const root = frame();
    expect(root).toHaveAttribute("data-state", "generating");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.style.aspectRatio).toMatch(/^1( \/ 1)?$/);
    expect(cells()).toHaveLength(4);
    expect(document.querySelector('[data-slot="grid-reveal-cells"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(image()).toBeNull();
  });

  it("is exposed to assistive technology when given alt", () => {
    render(<GridReveal alt="A lighthouse at dusk" />);
    expect(frame()).not.toHaveAttribute("aria-hidden");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("splits as progress advances and holds at 0.72", async () => {
    const { rerender } = render(<GridReveal progress={0} />);
    expect(cells()).toHaveLength(4);
    rerender(<GridReveal progress={0.36} />);
    expect(cells()).toHaveLength(18);
    rerender(<GridReveal progress={0.72} />);
    expect(cells()).toHaveLength(32);
    rerender(<GridReveal progress={1} />);
    expect(cells()).toHaveLength(32);
    // Collapsing back, the extra cells fade out before they leave.
    rerender(<GridReveal progress={-1} />);
    await waitFor(() => {
      expect(cells()).toHaveLength(4);
    });
  });

  it("tiles the whole frame with its cells, without overlap", () => {
    for (const aspect of [1, 16 / 9, 0.6]) {
      const { unmount } = render(<GridReveal progress={0.5} aspect={aspect} />);
      const area = cells().reduce(
        (sum, cell) =>
          sum + Number.parseFloat(cell.style.width) * Number.parseFloat(cell.style.height),
        0,
      );
      expect(area).toBeCloseTo(100 * 100, 0);
      for (const cell of cells()) {
        expect(
          Number.parseFloat(cell.style.left) + Number.parseFloat(cell.style.width),
        ).toBeLessThanOrEqual(100.001);
        expect(
          Number.parseFloat(cell.style.top) + Number.parseFloat(cell.style.height),
        ).toBeLessThanOrEqual(100.001);
      }
      unmount();
    }
  });

  it("cuts cells across their longer side, so a wide frame splits into columns first", () => {
    render(<GridReveal progress={0.72 * (4 / 28)} aspect={3} />);
    // Four more cells: each wide quadrant was cut into two narrower ones.
    const splits = cells();
    expect(splits).toHaveLength(8);
    for (const cell of splits) expect(Number.parseFloat(cell.style.height)).toBeCloseTo(50);
  });

  it("paces itself by estimatedDuration, creeping without passing the hold", () => {
    vi.useFakeTimers();
    render(<GridReveal estimatedDuration={10000} />);
    expect(cells()).toHaveLength(4);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const early = cells().length;
    expect(early).toBeGreaterThan(4);
    act(() => {
      vi.advanceTimersByTime(7500);
    });
    const due = cells().length;
    expect(due).toBeGreaterThan(early);
    expect(due).toBeLessThan(32);
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(cells()).toHaveLength(32);
  });

  it("reveals the image cell by cell once it loads, then shows the real picture", async () => {
    vi.useFakeTimers();
    const onRevealComplete = vi.fn();
    const { rerender } = render(
      <GridReveal alt="A lighthouse" progress={0.3} onRevealComplete={onRevealComplete} />,
    );
    const count = cells().length;
    rerender(
      <GridReveal
        alt="A lighthouse"
        progress={0.3}
        src="/lighthouse.png"
        onRevealComplete={onRevealComplete}
      />,
    );
    expect(frame()).toHaveAttribute("data-state", "generating");
    expect(image()).toHaveAttribute("aria-hidden", "true");
    expect(image()).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();

    await load();
    expect(frame()).toHaveAttribute("data-state", "revealing");
    expect(frame()).toHaveAttribute("aria-busy", "true");
    const pieces = document.querySelectorAll('[data-slot="grid-reveal-veil"] img');
    expect(pieces).toHaveLength(count);
    expect(pieces[0]).toHaveAttribute("alt", "");
    // The split froze: more progress adds nothing while revealing.
    rerender(
      <GridReveal
        alt="A lighthouse"
        progress={0.7}
        src="/lighthouse.png"
        onRevealComplete={onRevealComplete}
      />,
    );
    expect(cells()).toHaveLength(count);
    expect(onRevealComplete).not.toHaveBeenCalled();

    finish();
    expect(frame()).toHaveAttribute("data-state", "done");
    expect(frame()).not.toHaveAttribute("aria-busy");
    expect(cells()).toHaveLength(0);
    expect(screen.getByRole("img", { name: "A lighthouse" })).toHaveAttribute(
      "src",
      "/lighthouse.png",
    );
    expect(onRevealComplete).toHaveBeenCalledOnce();
  });

  it("maps each cell's piece onto its part of the picture", async () => {
    render(<GridReveal src="/a.png" progress={0} />);
    await load();
    const [first] = cells();
    const piece = first?.querySelector("img");
    // The top-left quadrant shows the frame-sized image from its origin.
    expect(first?.style.left).toBe("0%");
    expect(piece?.style.left).toBe("0%");
    expect(piece?.style.width).toBe("200%");
    const last = cells()[3]?.querySelector("img");
    expect(last?.style.left).toBe("-100%");
    expect(last?.style.top).toBe("-100%");
  });

  it("waits for the image to decode where the browser can", async () => {
    let resolve: () => void = () => {};
    const decode = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: decode,
    });
    try {
      render(<GridReveal src="/a.png" />);
      await load();
      expect(decode).toHaveBeenCalledOnce();
      expect(frame()).toHaveAttribute("data-state", "generating");
      resolve();
      await settle();
      expect(frame()).toHaveAttribute("data-state", "revealing");
    } finally {
      delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
    }
  });

  it("resolves the centre first when the pixels cannot be read", async () => {
    render(<GridReveal src="/a.png" progress={0.72 * (1 / 28)} />);
    await load();
    const order = cells().map((cell) =>
      Number(cell.style.getPropertyValue("--grid-reveal-order")),
    );
    expect([...order].sort((a, b) => a - b)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    // Of five cells, the one whose centre is nearest the frame's goes first.
    const first = cells()[order.indexOf(0)];
    const distance = (cell?: HTMLElement) => {
      const x =
        Number.parseFloat(cell?.style.left ?? "0") +
        Number.parseFloat(cell?.style.width ?? "0") / 2;
      const y =
        Number.parseFloat(cell?.style.top ?? "0") +
        Number.parseFloat(cell?.style.height ?? "0") / 2;
      return Math.hypot(x - 50, y - 50);
    };
    for (const cell of cells()) expect(distance(first)).toBeLessThanOrEqual(distance(cell));
  });

  it("resolves the busiest part of the picture first when it can read it", async () => {
    // A 48 × 48 copy whose bottom-right quadrant is a checkerboard and the rest flat.
    const pixels = new Uint8ClampedArray(48 * 48 * 4);
    for (let y = 0; y < 48; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        const value = x >= 24 && y >= 24 && (x + y) % 2 === 0 ? 255 : 80;
        pixels.fill(value, (y * 48 + x) * 4, (y * 48 + x) * 4 + 3);
      }
    }
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
      getImageData: () => ({ data: pixels }),
    } as never);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(200);
    vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(100);
    render(<GridReveal src="/a.png" progress={0} />);
    await load();
    // Cropped as object-fit: cover — the centre 100 × 100 of a 200 × 100 image.
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 50, 0, 100, 100, 0, 0, 48, 48);
    const bottomEnd = cells().find(
      (cell) => cell.style.left === "50%" && cell.style.top === "50%",
    );
    expect(bottomEnd?.style.getPropertyValue("--grid-reveal-order")).toBe("0");
  });

  it("reports a failed image and keeps waiting", async () => {
    const onError = vi.fn();
    render(<GridReveal src="/missing.png" onError={onError} />);
    const img = image();
    if (!img) throw new Error("no image");
    fireEvent.error(img);
    await settle();
    expect(onError).toHaveBeenCalledOnce();
    expect(frame()).toHaveAttribute("data-state", "generating");
    expect(frame()).toHaveAttribute("data-error");
    expect(frame()).toHaveAttribute("aria-busy", "true");
  });

  it("starts a new wait when the image is cleared or replaced", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<GridReveal src="/a.png" alt="First" progress={0.5} />);
    await load();
    finish();
    expect(frame()).toHaveAttribute("data-state", "done");

    rerender(<GridReveal src={null} alt="First" progress={0} />);
    expect(frame()).toHaveAttribute("data-state", "generating");
    expect(frame()).toHaveAttribute("aria-busy", "true");
    expect(cells()).toHaveLength(4);
    expect(image()).toBeNull();

    rerender(<GridReveal src="/b.png" alt="Second" progress={0} />);
    await load();
    finish();
    expect(screen.getByRole("img", { name: "Second" })).toHaveAttribute("src", "/b.png");

    rerender(<GridReveal src="/c.png" alt="Third" progress={0} />);
    expect(frame()).toHaveAttribute("data-state", "generating");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("reveals at once under reduced motion", async () => {
    vi.useFakeTimers();
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
    const onRevealComplete = vi.fn();
    render(<GridReveal src="/a.png" onRevealComplete={onRevealComplete} />);
    await load();
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onRevealComplete).toHaveBeenCalledOnce();
    expect(frame()).toHaveAttribute("data-state", "done");
  });

  it("shows a caption pill that changes with the text and leaves with the reveal", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<GridReveal caption="Composing…" progress={0.2} />);
    const pill = () => document.querySelector('[data-slot="grid-reveal-caption"]');
    expect(pill()).toHaveTextContent("Composing…");
    expect(pill()).toHaveAttribute("data-state", "visible");
    expect(pill()?.querySelector('[data-slot="shimmer-text"]')).toBeInTheDocument();

    rerender(<GridReveal caption="Adding detail…" progress={0.4} />);
    expect(pill()).toHaveTextContent("Adding detail…");

    rerender(<GridReveal caption="Adding detail…" progress={0.4} src="/a.png" />);
    await load();
    expect(pill()).toHaveAttribute("data-state", "hidden");
    finish();
    expect(pill()).toBeNull();
  });

  it("frames any aspect ratio and ignores a nonsensical one", () => {
    const { rerender } = render(<GridReveal aspect={16 / 9} />);
    expect(Number.parseFloat(frame().style.aspectRatio)).toBeCloseTo(16 / 9);
    rerender(<GridReveal aspect={0} />);
    expect(frame().style.aspectRatio).toMatch(/^1( \/ 1)?$/);
  });

  it("sets the gutter by variant", () => {
    const { rerender } = render(<GridReveal />);
    expect(frame()).toHaveClass("[--grid-reveal-gutter:1px]");
    rerender(<GridReveal gutter="none" />);
    expect(frame()).toHaveClass("[--grid-reveal-gutter:0px]");
    rerender(<GridReveal gutter="md" />);
    expect(frame()).toHaveClass("[--grid-reveal-gutter:2px]");
  });

  it("forwards crossOrigin to the image", () => {
    render(<GridReveal src="/a.png" crossOrigin="anonymous" />);
    expect(image()).toHaveAttribute("crossorigin", "anonymous");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <GridReveal ref={ref} data-testid="frame" id="art" className="rounded-none bg-card" />,
    );
    const root = screen.getByTestId("frame");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "art");
    expect(root).toHaveClass("rounded-none", "bg-card");
    expect(root).not.toHaveClass("rounded-xl");
    expect(root).not.toHaveClass("bg-muted/50");
  });

  it("has no accessibility violations while waiting and when done", async () => {
    const { container, rerender } = render(
      <GridReveal alt="A lighthouse" caption="Generating…" progress={0.4} />,
    );
    await expectNoA11yViolations(container);
    vi.useFakeTimers();
    rerender(
      <GridReveal alt="A lighthouse" caption="Generating…" progress={0.4} src="/a.png" />,
    );
    await load();
    finish();
    vi.useRealTimers();
    await expectNoA11yViolations(container);
  });
});
