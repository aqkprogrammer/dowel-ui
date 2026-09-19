import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  PaletteGenerator,
  generateTokenPalette,
  type PaletteColor,
  type PaletteGenerate,
} from "./palette-generator";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function reduce(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query === "(prefers-reduced-motion: reduce)",
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

let round = 0;
const numbered: PaletteGenerate = (count) => {
  round += 1;
  return Array.from({ length: count }, (_, index) => ({
    value: `var(--color-primary)`,
    name: `colour ${String(round)}.${String(index + 1)}`,
  }));
};

function root() {
  return document.querySelector<HTMLElement>('[data-slot="palette-generator"]')!;
}

describe("generateTokenPalette", () => {
  it("builds a light-to-dark ramp between two neighbouring hue tokens", () => {
    const palette = generateTokenPalette(4, () => 0.45);
    expect(palette).toHaveLength(4);
    expect(palette[0]!.value).toContain("var(--color-background)");
    expect(palette[3]!.value).toContain("var(--color-foreground)");
    expect(palette[0]!.value).toContain("var(--color-success)");
    expect(palette[0]!.value).toContain("var(--color-info)");
    expect(palette.map((color) => color.name)).toEqual([
      "pale success",
      "success–info",
      "success–info",
      "deep info",
    ]);
  });

  it("wraps around the hue wheel and handles a single swatch", () => {
    const [only] = generateTokenPalette(1, () => 0.99);
    expect(only!.value).toContain("var(--color-primary)");
    expect(only!.value).toContain("var(--color-destructive)");
    expect(only!.name).toBe("primary–destructive");
  });
});

describe("PaletteGenerator", () => {
  it("renders a labelled list of named swatches and a named refresh button", () => {
    render(<PaletteGenerator />);
    expect(screen.getByRole("list", { name: "Palette" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Generate a new palette" })).toBeInTheDocument();
  });

  it("is deterministic on first paint", () => {
    const { unmount } = render(<PaletteGenerator count={3} />);
    const first = screen.getAllByRole("img").map((swatch) => swatch.getAttribute("aria-label"));
    unmount();
    render(<PaletteGenerator count={3} />);
    expect(
      screen.getAllByRole("img").map((swatch) => swatch.getAttribute("aria-label")),
    ).toEqual(first);
  });

  it("melts, swaps at the smallest point, pops back and announces", () => {
    vi.useFakeTimers();
    reduce(false);
    const onColorsChange = vi.fn();
    render(<PaletteGenerator generate={numbered} onColorsChange={onColorsChange} count={3} />);
    const before = screen.getAllByRole("img")[0]!.getAttribute("aria-label");
    act(() => {
      screen.getByRole("button").click();
    });
    expect(root()).toHaveAttribute("data-phase", "melt");
    expect(screen.getByRole("list").style.filter).toMatch(/^url\("?#dowel-palette-goo-/);
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("aria-label", before);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(root()).toHaveAttribute("data-phase", "pop");
    expect(onColorsChange).toHaveBeenCalledOnce();
    const names = (onColorsChange.mock.calls[0]![0] as PaletteColor[]).map(
      (color) => color.name,
    );
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("aria-label", names[0]);
    expect(screen.getByRole("status")).toHaveTextContent(`New palette: ${names.join(", ")}`);

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(root()).toHaveAttribute("data-phase", "idle");
    expect(screen.getByRole("list").style.filter).toBe("");
  });

  it("tweens the goo blur", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "requestAnimationFrame", "performance"] });
    reduce(false);
    const { container } = render(<PaletteGenerator generate={numbered} morph={100} />);
    const blur = container.querySelector("feGaussianBlur")!;
    act(() => {
      screen.getByRole("button").click();
    });
    act(() => {
      vi.advanceTimersByTime(290);
    });
    expect(Number(blur.getAttribute("stdDeviation"))).toBeCloseTo(5);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(Number(blur.getAttribute("stdDeviation"))).toBe(0);
  });

  it("swaps at once under reduced motion, and rotates the icon per press", async () => {
    reduce(true);
    const user = userEvent.setup();
    render(<PaletteGenerator generate={numbered} />);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(root()).toHaveAttribute("data-phase", "idle");
    expect(screen.getByRole("status")).toHaveTextContent("New palette:");
    await user.keyboard("{Enter}");
    expect(button.querySelector("svg")).toHaveStyle({ rotate: "360deg" });
  });

  it("follows controlled colours and starts from defaultColors", async () => {
    reduce(true);
    const fixed: PaletteColor[] = [{ value: "var(--color-muted)", name: "muted" }];
    function Controlled() {
      const [colors, setColors] = useState(fixed);
      return (
        <PaletteGenerator colors={colors} onColorsChange={setColors} generate={numbered} />
      );
    }
    const user = userEvent.setup();
    const { unmount } = render(<PaletteGenerator defaultColors={fixed} />);
    expect(screen.getByRole("img", { name: "muted" })).toHaveStyle({
      backgroundColor: "var(--color-muted)",
    });
    unmount();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByRole("img", { name: "muted" })).not.toBeInTheDocument();
  });

  it("clears pending timers when pressed again and on unmount", () => {
    vi.useFakeTimers();
    reduce(false);
    const onColorsChange = vi.fn();
    const { unmount } = render(
      <PaletteGenerator generate={numbered} onColorsChange={onColorsChange} />,
    );
    act(() => {
      screen.getByRole("button").click();
    });
    act(() => {
      screen.getByRole("button").click();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onColorsChange).toHaveBeenCalledOnce();
    act(() => {
      screen.getByRole("button").click();
    });
    unmount();
    act(() => {
      vi.runAllTimers();
    });
    expect(onColorsChange).toHaveBeenCalledOnce();
  });

  it("takes the radius, morph and labels", () => {
    render(
      <PaletteGenerator
        radius={4}
        morph={150}
        generateLabel="Shuffle"
        paletteLabel="Brand colours"
        stroke
      />,
    );
    expect(root().style.getPropertyValue("--palette-generator-radius")).toBe("4px");
    expect(root().style.getPropertyValue("--palette-generator-morph")).toBe("1");
    expect(screen.getByRole("button", { name: "Shuffle" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Brand colours" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PaletteGenerator ref={ref} className="w-full gap-4" data-testid="palette" />);
    const palette = screen.getByTestId("palette");
    expect(ref.current).toBe(palette);
    expect(palette).toHaveClass("w-full", "gap-4");
    expect(palette).not.toHaveClass("gap-1.5");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PaletteGenerator />);
    await expectNoA11yViolations(container);
  });
});
