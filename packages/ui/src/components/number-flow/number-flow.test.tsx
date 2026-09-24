import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NumberFlow, PriceFlow } from "./number-flow";

function root(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('[data-slot="number-flow"]');
  if (!element) throw new Error("no number-flow root");
  return element;
}

function digits(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="number-flow-digit"]')];
}

function reels(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="number-flow-reel"]')];
}

/** The digits currently shown, read from the reels, as a string. */
function shown(container: HTMLElement) {
  return digits(container)
    .map((digit) => digit.dataset.digit)
    .join("");
}

function endTransition(reel: HTMLElement) {
  fireEvent.transitionEnd(reel, { propertyName: "transform" });
}

describe("NumberFlow", () => {
  it("exposes the formatted value once, as text, and hides the reels", () => {
    const { container } = render(
      <NumberFlow
        value={1234.5}
        locales="en-US"
        format={{ style: "currency", currency: "USD" }}
      />,
    );
    expect(screen.getByText("$1,234.50")).toHaveClass("sr-only");
    expect(container.querySelector('[data-slot="number-flow-display"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(shown(container)).toBe("123450");
  });

  it("formats percent, compact, signed and other locales through Intl", () => {
    const { rerender } = render(
      <NumberFlow value={0.256} locales="en-US" format={{ style: "percent" }} />,
    );
    expect(screen.getByText("26%")).toBeInTheDocument();

    rerender(<NumberFlow value={1520} locales="en-US" format={{ notation: "compact" }} />);
    expect(screen.getByText("1.5K")).toBeInTheDocument();

    rerender(<NumberFlow value={3} locales="en-US" format={{ signDisplay: "always" }} />);
    expect(screen.getByText("+3")).toBeInTheDocument();

    rerender(
      <NumberFlow value={1234.5} locales="de-DE" format={{ minimumFractionDigits: 2 }} />,
    );
    expect(screen.getByText("1.234,50")).toBeInTheDocument();
  });

  it("rolls digits in another numbering system", () => {
    const { container } = render(<NumberFlow value={42} locales="ar-EG" />);
    expect(shown(container)).toBe("42");
    const reel = reels(container)[0];
    expect(reel?.textContent).toContain("٤");
  });

  it("rests each reel in the middle band on first render", () => {
    const { container } = render(<NumberFlow value={37} />);
    const [tens, ones] = reels(container);
    expect(tens).toHaveAttribute("data-position", "13");
    expect(ones).toHaveAttribute("data-position", "17");
    expect(ones?.style.transform).toBe("translateY(-1700%)");
    expect(root(container)).not.toHaveAttribute("data-trend", "down");
  });

  it("rolls up on a rise, wrapping 9 → 0 into the upper band, then snaps back", () => {
    const { container, rerender } = render(<NumberFlow value={19} />);
    rerender(<NumberFlow value={20} />);

    expect(root(container)).toHaveAttribute("data-trend", "up");
    const [tens, ones] = reels(container);
    expect(tens).toHaveAttribute("data-position", "12");
    // 9 → 0 keeps travelling up rather than rolling back through 8…1.
    expect(ones).toHaveAttribute("data-position", "20");
    expect(ones).toHaveClass("duration-[var(--duration-slow)]");

    if (!ones) throw new Error("no ones reel");
    endTransition(ones);
    expect(ones).toHaveAttribute("data-position", "10");
    expect(ones).toHaveAttribute("data-snapping");
    expect(ones).toHaveClass("transition-none");
  });

  it("rolls down on a fall, wrapping 0 → 9 into the lower band", () => {
    const { container, rerender } = render(<NumberFlow value={20} />);
    rerender(<NumberFlow value={19} />);

    expect(root(container)).toHaveAttribute("data-trend", "down");
    const [tens, ones] = reels(container);
    expect(tens).toHaveAttribute("data-position", "11");
    expect(ones).toHaveAttribute("data-position", "9");
  });

  it("follows a forced trend whatever the change", () => {
    const { container, rerender } = render(<NumberFlow value={3} trend="down" />);
    rerender(<NumberFlow value={4} trend="down" />);
    expect(root(container)).toHaveAttribute("data-trend", "down");
    expect(reels(container)[0]).toHaveAttribute("data-position", "4");
  });

  it("ignores transition ends from other properties and children", () => {
    const { container, rerender } = render(<NumberFlow value={1} />);
    rerender(<NumberFlow value={2} />);
    const reel = reels(container)[0];
    if (!reel) throw new Error("no reel");

    fireEvent.transitionEnd(reel, { propertyName: "opacity" });
    const cell = reel.firstElementChild;
    if (cell) fireEvent.transitionEnd(cell, { propertyName: "transform" });
    expect(reel).toHaveAttribute("data-position", "12");
  });

  it("marks only the destination cell visible, so the old digit fades out", () => {
    const { container, rerender } = render(<NumberFlow value={5} />);
    rerender(<NumberFlow value={8} />);
    const reel = reels(container)[0];
    const active = reel?.querySelectorAll("[data-active]");
    expect(active).toHaveLength(1);
    expect(active?.[0]).toHaveTextContent("8");
    expect(active?.[0]).toHaveStyle({ top: "1800%" });
  });

  it("adds a reel for a new leading digit and keeps the existing ones", () => {
    const { container, rerender } = render(<NumberFlow value={99} />);
    const [tensBefore] = digits(container);

    rerender(<NumberFlow value={100} />);
    expect(shown(container)).toBe("100");
    expect(digits(container)[1]).toBe(tensBefore);

    rerender(<NumberFlow value={99} />);
    expect(shown(container)).toBe("99");
    expect(screen.getByText("99")).toHaveClass("sr-only");
  });

  it("renders signs and separators as their own tokens", () => {
    const { container, rerender } = render(
      <NumberFlow value={999} locales="en-US" format={{ signDisplay: "exceptZero" }} />,
    );
    rerender(
      <NumberFlow value={-1000} locales="en-US" format={{ signDisplay: "exceptZero" }} />,
    );
    const tokens = [...container.querySelectorAll('[data-slot="number-flow-token"]')].map(
      (token) =>
        token.querySelector<HTMLElement>('[data-slot="number-flow-digit"]')?.dataset.digit ??
        token.textContent,
    );
    expect(tokens).toEqual(["-", "1", ",", "0", "0", "0"]);
    expect(screen.getByText("-1,000")).toBeInTheDocument();
  });

  it("enables entrance transitions only after the first paint", () => {
    const { container } = render(<NumberFlow value={1} />);
    // Effects have flushed under render(); the hoisted sheet keys off this.
    expect(container.querySelector('[data-slot="number-flow-display"]')).toHaveAttribute(
      "data-ready",
    );
    expect(root(container).style.getPropertyValue("--dowel-number-flow-enter")).toBe("100%");
  });

  it("hoists its stylesheet once for many instances", () => {
    render(
      <>
        <NumberFlow value={1} />
        <NumberFlow value={2} />
      </>,
    );
    expect(document.head.querySelectorAll('style[data-href="dowel-number-flow"]').length).toBe(
      1,
    );
  });

  it("staggers digits from the leading one, scaled for reduced motion", () => {
    const { container } = render(<NumberFlow value={123} stagger={50} />);
    const delays = reels(container).map((reel) => reel.style.transitionDelay);
    expect(delays).toEqual([
      "calc(0ms * var(--motion-scale, 1))",
      "calc(50ms * var(--motion-scale, 1))",
      "calc(100ms * var(--motion-scale, 1))",
    ]);
  });

  it("settles on the readable value under reduced motion", () => {
    // Reduced motion collapses the transition; the value is what the reel
    // rests on either way, and transitionend still snaps it home.
    const { container, rerender } = render(<NumberFlow value={8} />);
    rerender(<NumberFlow value={9} />);
    const reel = reels(container)[0];
    if (!reel) throw new Error("no reel");
    act(() => {
      endTransition(reel);
    });
    expect(reel).toHaveAttribute("data-position", "19");
    expect(reel.querySelector("[data-active]")).toHaveTextContent("9");
    expect(root(container).querySelector(".sr-only")).toHaveTextContent(/^9$/);
  });

  it("keeps spinning one way through rapid updates, rendering cells wherever it heads", () => {
    const { container, rerender } = render(<NumberFlow value={0} />);
    // No transition gets to finish, so the reel never snaps home. It must not
    // run out of reel and lurch back the other way.
    for (let next = 1; next <= 25; next += 1) rerender(<NumberFlow value={next} />);
    const [tens, ones] = reels(container);
    expect(ones).toHaveAttribute("data-position", "35");
    expect(tens).toHaveAttribute("data-position", "12");
    const active = ones?.querySelector("[data-active]");
    expect(active).toHaveTextContent("5");
    expect(active).toHaveStyle({ top: "3500%" });

    for (let next = 24; next >= 19; next -= 1) rerender(<NumberFlow value={next} />);
    expect(ones).toHaveAttribute("data-position", "29");
    expect(ones?.querySelector("[data-active]")).toHaveTextContent("9");
  });

  it("shows each reel through a window that bleeds past the line and fades at its edges", () => {
    const { container, rerender } = render(<NumberFlow value={4} />);
    const digit = digits(container)[0];
    const window = digit?.querySelector('[data-slot="number-flow-window"]');
    expect(window).toHaveClass(
      "overflow-hidden",
      "top-[calc(var(--dowel-number-flow-bleed)*-1)]",
    );
    expect(window?.querySelector('[data-slot="number-flow-reel"]')).toHaveClass(
      "top-[var(--dowel-number-flow-bleed)]",
    );
    expect(digit).toHaveClass("[--dowel-number-flow-bleed:0.25em]");
    expect(digit).not.toHaveClass("overflow-hidden");

    // A tile clips to its own box, so its fade sits inside it instead.
    rerender(<NumberFlow value={4} variant="tiles" />);
    expect(digits(container)[0]).toHaveClass(
      "overflow-hidden",
      "[--dowel-number-flow-bleed:0em]",
    );
  });

  describe("width", () => {
    function exits(container: HTMLElement) {
      return [...container.querySelectorAll<HTMLElement>('[data-slot="number-flow-exit"]')];
    }

    /** Every character on screen, current and leaving, in order. */
    function row(container: HTMLElement) {
      const display = container.querySelector('[data-slot="number-flow-display"]');
      return [...(display?.children ?? [])].map(
        (child) =>
          (child.getAttribute("data-slot") === "number-flow-exit" ? "~" : "") +
          ((child as HTMLElement).querySelector<HTMLElement>('[data-slot="number-flow-digit"]')
            ?.dataset.digit ?? child.textContent),
      );
    }

    it("gives every character a column that can open and close", () => {
      const { container } = render(<NumberFlow value={12} />);
      const token = container.querySelector('[data-slot="number-flow-token"]');
      expect(token).toHaveClass("inline-grid", "grid-cols-[1fr]", "overflow-x-clip");
    });

    it("fades a lost place out where it stood, on its last glyph, then drops it", () => {
      const { container, rerender } = render(
        <NumberFlow
          value={100}
          locales="en-US"
          format={{ style: "currency", currency: "USD" }}
        />,
      );
      rerender(
        <NumberFlow
          value={99}
          locales="en-US"
          format={{ style: "currency", currency: "USD" }}
        />,
      );
      expect(shown(container)).toBe("9900");
      expect(row(container)).toEqual(["$", "~1", "9", "9", ".", "0", "0"]);
      const [leaving] = exits(container);
      expect(leaving?.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(leaving?.querySelector('[data-slot="number-flow-digit"]')).toBeNull();

      if (!leaving) throw new Error("no exit");
      // Only its own opacity transition ends it.
      fireEvent.transitionEnd(leaving, { propertyName: "grid-template-columns" });
      if (leaving.firstElementChild) {
        fireEvent.transitionEnd(leaving.firstElementChild, { propertyName: "opacity" });
      }
      expect(exits(container)).toHaveLength(1);
      fireEvent.transitionEnd(leaving, { propertyName: "opacity" });
      expect(exits(container)).toHaveLength(0);
      expect(row(container)).toEqual(["$", "9", "9", ".", "0", "0"]);
    });

    it("keeps leaving characters in order as they finish", () => {
      const format = { maximumFractionDigits: 1 };
      const { container, rerender } = render(
        <NumberFlow value={1.5} locales="en-US" format={format} />,
      );
      rerender(<NumberFlow value={2} locales="en-US" format={format} />);
      expect(row(container)).toEqual(["2", "~.", "~5"]);

      // The point finishes first; the digit that followed it stays after the 2.
      const [point] = exits(container);
      if (!point) throw new Error("no exit");
      fireEvent.transitionEnd(point, { propertyName: "opacity" });
      expect(row(container)).toEqual(["2", "~5"]);
    });

    it("reclaims a place that comes back while it is leaving", () => {
      const { container, rerender } = render(<NumberFlow value={100} />);
      const hundreds = container.querySelector('[data-slot="number-flow-token"]');
      rerender(<NumberFlow value={99} />);
      expect(exits(container)).toHaveLength(1);

      rerender(<NumberFlow value={101} />);
      expect(exits(container)).toHaveLength(0);
      expect(shown(container)).toBe("101");
      // The same element, so it turns around from wherever its fade had got to.
      expect(container.querySelector('[data-slot="number-flow-token"]')).toBe(hundreds);
    });
  });

  it("renders a prefix and suffix outside the reels, as readable text", () => {
    const { container } = render(
      <NumberFlow as="h2" value={42} prefix={<span>≈</span>} suffix=" users" />,
    );
    const prefix = container.querySelector('[data-slot="number-flow-prefix"]');
    const suffix = container.querySelector('[data-slot="number-flow-suffix"]');
    expect(prefix).toHaveTextContent("≈");
    expect(suffix).toHaveTextContent("users");
    expect(prefix?.closest("[aria-hidden]")).toBeNull();
    expect(prefix?.querySelector('[data-slot="number-flow-reel"]')).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveAccessibleName(/^≈\s?42\s?users$/);
    // Before and after the number, around the rolling display.
    const display = container.querySelector('[data-slot="number-flow-display"]');
    expect(display?.previousElementSibling?.previousElementSibling).toBe(prefix);
    expect(display?.nextElementSibling).toBe(suffix);
  });

  it("renders no prefix or suffix slots by default", () => {
    const { container } = render(<NumberFlow value={1} />);
    expect(container.querySelector('[data-slot="number-flow-prefix"]')).toBeNull();
    expect(container.querySelector('[data-slot="number-flow-suffix"]')).toBeNull();
  });

  it("takes a duration in milliseconds, scaled by the motion scale", () => {
    const { container, rerender } = render(<NumberFlow value={1} />);
    expect(root(container)).not.toHaveAttribute("data-duration");
    expect(root(container).style.getPropertyValue("--dowel-number-flow-duration")).toBe("");

    rerender(<NumberFlow value={1} duration={120} />);
    expect(root(container)).toHaveAttribute("data-duration");
    expect(root(container).style.getPropertyValue("--dowel-number-flow-duration")).toBe(
      "calc(120ms * var(--motion-scale, 1))",
    );
  });

  it("pads and groups through Intl, including Indian grouping", () => {
    const { rerender } = render(<NumberFlow value={1234567} locales="en-IN" />);
    expect(screen.getByText("12,34,567")).toBeInTheDocument();
    rerender(<NumberFlow value={7} format={{ minimumIntegerDigits: 3 }} />);
    expect(screen.getByText("007")).toBeInTheDocument();
  });

  it("renders the tiles variant", () => {
    const { container } = render(<NumberFlow value={7} variant="tiles" />);
    expect(root(container)).toHaveAttribute("data-variant", "tiles");
    expect(digits(container)[0]).toHaveClass("rounded-lg", "border", "bg-primary");
  });

  it("does not announce changes unless asked to", () => {
    const { container, rerender } = render(<NumberFlow value={1} />);
    expect(root(container)).not.toHaveAttribute("aria-live");
    expect(root(container)).not.toHaveAttribute("aria-atomic");

    rerender(<NumberFlow value={1} aria-live="polite" />);
    expect(root(container)).toHaveAttribute("aria-live", "polite");
    expect(root(container)).toHaveAttribute("aria-atomic", "true");
  });

  it("renders as another element", () => {
    render(<NumberFlow as="h2" value={5} />);
    expect(screen.getByRole("heading", { level: 2, name: "5" })).toBeInTheDocument();
  });

  it("lets a consumer className win", () => {
    const { container } = render(<NumberFlow value={1} className="inline-flex" />);
    expect(root(container)).toHaveClass("inline-flex");
    expect(root(container)).not.toHaveClass("inline-block");
  });

  it("forwards its ref and native props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<NumberFlow ref={ref} value={1} id="total" title="Total" />);
    expect(ref.current).toHaveAttribute("data-slot", "number-flow");
    expect(ref.current).toHaveAttribute("id", "total");
    expect(ref.current).toHaveAttribute("title", "Total");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <NumberFlow value={1234.56} format={{ style: "currency", currency: "USD" }} />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("PriceFlow", () => {
  it("pads to two digits and staggers by 50ms, as the source", () => {
    const { container } = render(<PriceFlow value={5} />);
    expect(shown(container)).toBe("05");
    expect(reels(container)[1]?.style.transitionDelay).toBe(
      "calc(50ms * var(--motion-scale, 1))",
    );
  });

  it("takes a currency format and keeps the stagger", () => {
    const { container } = render(
      <PriceFlow value={16} locales="en-US" format={{ style: "currency", currency: "EUR" }} />,
    );
    expect(screen.getByText("€16.00")).toBeInTheDocument();
    expect(reels(container)[1]?.style.transitionDelay).toBe(
      "calc(50ms * var(--motion-scale, 1))",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<PriceFlow value={25} />);
    await expectNoA11yViolations(container);
  });
});
