import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ProximityText, proximityStrength } from "./proximity-text";

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

const letters = () => [
  ...document.querySelectorAll<HTMLElement>("[data-slot=proximity-text-letter]"),
];

/** Lays the letters out 20px apart along y = 50. */
function layOut() {
  letters().forEach((letter, i) => {
    letter.getBoundingClientRect = () => new DOMRect(i * 20, 40, 20, 20);
  });
}

async function moveTo(target: Element, x: number, y: number, pointerType = "mouse") {
  await act(async () => {
    fireEvent.pointerMove(target, { clientX: x, clientY: y, pointerType });
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
}

describe("ProximityText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is read as written, its letters hidden from assistive technology", async () => {
    const { container } = render(
      <section>
        <ProximityText as="h2">Hello</ProximityText>
      </section>,
    );
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(letters()).toHaveLength(5);
    expect(letters()[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
    await expectNoA11yViolations(container);
  });

  it("swells the letters nearest the pointer, listening on its parent", async () => {
    render(
      <section data-testid="section">
        <ProximityText radius={60}>abcde</ProximityText>
      </section>,
    );
    layOut();
    // Over the first letter's centre.
    await moveTo(screen.getByTestId("section"), 10, 50);
    const strengths = letters().map((letter) =>
      Number(letter.style.getPropertyValue("--proximity")),
    );
    expect(strengths[0]).toBeCloseTo(1);
    expect(strengths[1]).toBeGreaterThan(0);
    expect(strengths[1]).toBeLessThan(strengths[0] ?? 0);
    expect(strengths[4]).toBe(0);
    fireEvent.pointerLeave(screen.getByTestId("section"));
    await moveTo(document.body, 0, 0);
    expect(letters()[0]?.style.getPropertyValue("--proximity")).toBe("0.000");
  });

  it("listens only on itself with scope self", async () => {
    render(
      <section data-testid="section">
        <ProximityText scope="self">ab</ProximityText>
      </section>,
    );
    layOut();
    await moveTo(screen.getByTestId("section"), 10, 50);
    expect(letters()[0]?.style.getPropertyValue("--proximity")).toBe("");
  });

  it("ignores touch", async () => {
    render(
      <section data-testid="section">
        <ProximityText>ab</ProximityText>
      </section>,
    );
    layOut();
    await moveTo(screen.getByTestId("section"), 10, 50, "touch");
    expect(letters()[0]?.style.getPropertyValue("--proximity")).toBe("");
  });

  it("does nothing under reduced motion", async () => {
    mockReducedMotion(true);
    render(
      <section data-testid="section">
        <ProximityText>ab</ProximityText>
      </section>,
    );
    layOut();
    await moveTo(screen.getByTestId("section"), 10, 50);
    expect(letters()[0]?.style.getPropertyValue("--proximity")).toBe("");
  });

  it("keeps the text's own weight at rest and reaches `weight` at the pointer", () => {
    render(
      <section>
        <ProximityText weight={900} scale={1.5} accent="info" style={{ fontWeight: 700 }}>
          x
        </ProximityText>
      </section>,
    );
    const root = document.querySelector<HTMLElement>("[data-slot=proximity-text]");
    expect(root?.style.getPropertyValue("--proximity-base")).toBe("700");
    expect(root?.style.getPropertyValue("--proximity-weight")).toBe("900");
    expect(root?.style.getPropertyValue("--proximity-scale")).toBe("0.5");
    expect(root?.style.getPropertyValue("--proximity-accent")).toBe("var(--color-info)");
  });

  it("lets className win and forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <ProximityText ref={ref} className="block" id="p">
        hi
      </ProximityText>,
    );
    expect(ref.current).toHaveClass("block");
    expect(ref.current).not.toHaveClass("inline-block");
    expect(ref.current).toHaveAttribute("id", "p");
  });
});

describe("proximityStrength", () => {
  it("is full at the pointer and gone at the radius", () => {
    expect(proximityStrength(0, 100)).toBe(1);
    expect(proximityStrength(50, 100)).toBe(0.25);
    expect(proximityStrength(100, 100)).toBe(0);
    expect(proximityStrength(10, 0)).toBe(0);
  });
});
