import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StackingCard, StackingCards, stackingCoverage } from "./stacking-cards";

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

function Stack(props: Partial<Parameters<typeof StackingCards>[0]>) {
  return (
    <StackingCards data-testid="stack" {...props}>
      <StackingCard>
        <h3>One</h3>
      </StackingCard>
      <StackingCard>
        <h3>Two</h3>
      </StackingCard>
      <StackingCard>
        <h3>Three</h3>
      </StackingCard>
    </StackingCards>
  );
}

const cards = () => [...document.querySelectorAll<HTMLElement>("[data-slot=stacking-card]")];

/** Lays the cards out: each 300px tall, with tops as given. */
function layOut(tops: number[]) {
  cards().forEach((card, i) => {
    card.getBoundingClientRect = () => new DOMRect(0, tops[i] ?? 0, 400, 300);
  });
}

describe("StackingCards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps every card in the document, in order, each sticking a step lower", async () => {
    const { container } = render(<Stack offset={96} gap={20} />);
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "One",
      "Two",
      "Three",
    ]);
    expect(cards().map((card) => card.style.getPropertyValue("--stacking-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(cards()[0]).toHaveClass("sticky");
    expect(cards()[0]?.className).toContain("scroll-mt-");
    const stack = screen.getByTestId("stack");
    expect(stack.style.getPropertyValue("--stacking-offset")).toBe("96px");
    expect(stack.style.getPropertyValue("--stacking-step")).toBe("20px");
    await expectNoA11yViolations(container);
  });

  it("eases covered cards back as the next ones slide over them", async () => {
    render(<Stack offset={80} gap={16} shrink={0.05} />);
    // Card two has fully reached its sticking point over card one; card three
    // is halfway up over card two.
    layOut([80, 96, 112 + 150]);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    const [one, two, three] = cards();
    expect(one?.style.transform).toBe("scale(0.9250)");
    expect(two?.style.transform).toBe("scale(0.9750)");
    expect(three?.style.transform).toBe("");
  });

  it("stacks without easing back under reduced motion", async () => {
    mockReducedMotion(true);
    render(<Stack />);
    layOut([80, 96, 112]);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    for (const card of cards()) expect(card.style.transform).toBe("");
    expect(cards()[0]).toHaveClass("sticky");
  });

  it("refuses a card outside a stack", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StackingCard>x</StackingCard>)).toThrow(
      "<StackingCard> must be used inside <StackingCards>.",
    );
  });

  it("lets className win, forwards its ref and merges styles", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <StackingCards ref={ref} className="gap-0" style={{ paddingTop: 8 }}>
        <StackingCard className="rounded-none" style={{ minHeight: 200 }}>
          x
        </StackingCard>
      </StackingCards>,
    );
    expect(ref.current).toHaveClass("gap-0");
    expect(ref.current?.style.paddingTop).toBe("8px");
    expect(cards()[0]).toHaveClass("rounded-none");
    expect(cards()[0]).not.toHaveClass("rounded-2xl");
    expect(cards()[0]?.style.minHeight).toBe("200px");
  });
});

describe("stackingCoverage", () => {
  it("adds up how much of a card the later ones have slid over", () => {
    const card = { top: 80, height: 300 };
    expect(stackingCoverage(card, [])).toBe(0);
    expect(stackingCoverage(card, [{ top: 96, stickyTop: 96 }])).toBe(1);
    expect(stackingCoverage(card, [{ top: 96 + 150, stickyTop: 96 }])).toBe(0.5);
    expect(stackingCoverage(card, [{ top: 2000, stickyTop: 96 }])).toBe(0);
    expect(
      stackingCoverage(card, [
        { top: 96, stickyTop: 96 },
        { top: 112, stickyTop: 112 },
      ]),
    ).toBe(2);
    expect(stackingCoverage({ top: 0, height: 0 }, [{ top: 0, stickyTop: 0 }])).toBe(0);
  });
});
