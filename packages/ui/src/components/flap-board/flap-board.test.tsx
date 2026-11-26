import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FLAP_BOARD_CHARSET, FlapBoard, flapSteps, toCells } from "./flap-board";

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

/** What each cell shows at rest: the top half's character. */
function shown(container: HTMLElement) {
  return [...container.querySelectorAll("[data-slot=flap-board-cell]")]
    .map((cell) => cell.firstElementChild?.textContent?.replace(" ", " ") ?? "")
    .join("");
}

describe("flapSteps", () => {
  it("steps forward through the set and lands on the target", () => {
    expect(flapSteps("A", "D", FLAP_BOARD_CHARSET, 10)).toEqual(["B", "C", "D"]);
  });

  it("wraps round the set", () => {
    const steps = flapSteps("@", "A", FLAP_BOARD_CHARSET, 10);
    expect(steps.at(-1)).toBe("A");
  });

  it("caps a long trip at maxFlips", () => {
    const steps = flapSteps("A", "Z", FLAP_BOARD_CHARSET, 4);
    expect(steps).toHaveLength(4);
    expect(steps.at(-1)).toBe("Z");
  });

  it("does nothing when already there", () => {
    expect(flapSteps("Q", "Q", FLAP_BOARD_CHARSET, 10)).toEqual([]);
  });
});

describe("toCells", () => {
  it("pads, trims, upper-cases and blanks unknown characters", () => {
    expect(toCells("ab~", 5, FLAP_BOARD_CHARSET)).toEqual(["A", "B", " ", " ", " "]);
    expect(toCells("ABCDEF", 3, FLAP_BOARD_CHARSET)).toEqual(["A", "B", "C"]);
  });
});

describe("FlapBoard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads as its value once, with the cells hidden", async () => {
    const { container, getByText } = render(<FlapBoard value="GATE 12" />);
    expect(getByText("GATE 12")).toHaveAttribute("aria-live", "polite");
    const cells = container.querySelectorAll("[data-slot=flap-board-cell]");
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveAttribute("aria-hidden", "true");
    await expectNoA11yViolations(container);
  });

  it("flips each cell over to the new value", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<FlapBoard value="AAA" speed={50} stagger={0} />);
    expect(shown(container)).toBe("AAA");

    rerender(<FlapBoard value="ACE" speed={50} stagger={0} />);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    // Mid-trip: the third cell has flipped once, not yet to E.
    expect(shown(container)).toBe("ACC");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown(container)).toBe("ACE");
  });

  it("uses a fixed number of cells", () => {
    const { container } = render(<FlapBoard value="HI" length={5} />);
    expect(container.querySelectorAll("[data-slot=flap-board-cell]")).toHaveLength(5);
  });

  it("changes at once under reduced motion", () => {
    mockReducedMotion(true);
    const { container, rerender } = render(<FlapBoard value="AAA" />);
    rerender(<FlapBoard value="XYZ" />);
    expect(shown(container)).toBe("XYZ");
  });
});
