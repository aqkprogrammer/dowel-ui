import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MagneticLetters, magneticOffset } from "./magnetic-letters";

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
  ...document.querySelectorAll<HTMLElement>("[data-slot=magnetic-letters-letter]"),
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

describe("magneticOffset", () => {
  it("pulls toward the pointer, strongest up close and gone at the radius", () => {
    const near = magneticOffset(10, 0, 100, 20, "attract");
    const far = magneticOffset(80, 0, 100, 20, "attract");
    expect(near.x).toBeGreaterThan(far.x);
    expect(far.x).toBeGreaterThan(0);
    expect(magneticOffset(100, 0, 100, 20, "attract")).toEqual({ x: 0, y: 0 });
  });

  it("pushes away in repel mode", () => {
    expect(magneticOffset(10, 0, 100, 20, "repel").x).toBeLessThan(0);
  });
});

describe("MagneticLetters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is read as written, its letters hidden from assistive technology", async () => {
    const { container } = render(
      <section>
        <MagneticLetters as="h2">Hello</MagneticLetters>
      </section>,
    );
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(letters()).toHaveLength(5);
    expect(letters()[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
    await expectNoA11yViolations(container);
  });

  it("moves the letters nearest the pointer toward it, listening on its parent", async () => {
    render(
      <section data-testid="section">
        <MagneticLetters radius={60}>Hello</MagneticLetters>
      </section>,
    );
    layOut();
    const section = screen.getByTestId("section");
    fireEvent.pointerEnter(section, { pointerType: "mouse" });
    await moveTo(section, 10, 10);

    const first = Number(letters()[0]?.style.getPropertyValue("--magnetic-y"));
    expect(first).toBeLessThan(0);
    expect(letters()[4]?.style.getPropertyValue("--magnetic-y")).toBe("0.00");
  });

  it("springs back when the pointer leaves", async () => {
    render(
      <section data-testid="section">
        <MagneticLetters>Hi</MagneticLetters>
      </section>,
    );
    layOut();
    const section = screen.getByTestId("section");
    await moveTo(section, 10, 10);
    await act(async () => {
      fireEvent.pointerLeave(section, { pointerType: "mouse" });
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(letters()[0]?.style.getPropertyValue("--magnetic-x")).toBe("0.00");
  });

  it("ignores touch", async () => {
    render(
      <section data-testid="section">
        <MagneticLetters>Hi</MagneticLetters>
      </section>,
    );
    layOut();
    await moveTo(screen.getByTestId("section"), 10, 10, "touch");
    expect(letters()[0]?.style.getPropertyValue("--magnetic-x")).toBe("");
  });

  it("stays still under reduced motion", async () => {
    mockReducedMotion(true);
    render(
      <section data-testid="section">
        <MagneticLetters>Hi</MagneticLetters>
      </section>,
    );
    layOut();
    await moveTo(screen.getByTestId("section"), 10, 10);
    expect(letters()[0]?.style.getPropertyValue("--magnetic-x")).toBe("");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    render(<MagneticLetters ref={ref}>Hi</MagneticLetters>);
    expect(ref.current).toHaveAttribute("data-slot", "magnetic-letters");
  });
});
