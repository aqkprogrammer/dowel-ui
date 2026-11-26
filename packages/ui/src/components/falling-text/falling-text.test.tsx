import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  FallingText,
  fallingStep,
  separate,
  splitPieces,
  type FallingTextHandle,
} from "./falling-text";

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

const box = () => document.querySelector<HTMLElement>("[data-slot=falling-text]")!;
const pieces = () => [
  ...document.querySelectorAll<HTMLElement>("[data-slot=falling-text-piece]"),
];

function body(left: number, top: number) {
  return { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, left, top, width: 10, height: 10 };
}

describe("splitPieces", () => {
  it("keeps the spaces between words", () => {
    expect(splitPieces("hello  big world", "word")).toEqual([
      "hello",
      "  ",
      "big",
      " ",
      "world",
    ]);
  });
  it("splits letters", () => {
    expect(splitPieces("hi!", "letter")).toEqual(["h", "i", "!"]);
  });
});

describe("separate", () => {
  it("stacks a box on another along the shallower overlap", () => {
    const top = body(0, 0);
    const bottom = body(2, 8);
    expect(separate(top, bottom)).toBe(true);
    expect(top.top + top.y + 10).toBeLessThanOrEqual(bottom.top + bottom.y + 0.001);
    expect(bottom.y).toBe(0);
  });
  it("leaves boxes that do not touch alone", () => {
    expect(separate(body(0, 0), body(50, 50))).toBe(false);
  });
});

describe("fallingStep", () => {
  const world = { floor: 100, wall: 200, gravity: 2400, bounce: 0.35 };

  it("lands a body on the floor and keeps it there", () => {
    const list = [body(10, 0)];
    for (let i = 0; i < 200; i++) fallingStep(list, 1 / 60, world);
    const piece = list[0]!;
    expect(piece.top + piece.y + piece.height).toBeCloseTo(100, 0);
    expect(Math.abs(piece.vy)).toBeLessThan(5);
  });

  it("keeps bodies inside the walls", () => {
    const list = [{ ...body(190, 0), vx: 900 }];
    for (let i = 0; i < 60; i++) fallingStep(list, 1 / 60, world);
    const piece = list[0]!;
    expect(piece.left + piece.x + piece.width).toBeLessThanOrEqual(200.001);
  });

  it("stacks one body on another instead of passing through", () => {
    const list = [body(50, 0), body(52, -40)];
    for (let i = 0; i < 240; i++) fallingStep(list, 1 / 60, world);
    const [lower, upper] = list;
    const lowerTop = lower!.top + lower!.y;
    const upperBottom = upper!.top + upper!.y + upper!.height;
    expect(upperBottom).toBeLessThanOrEqual(lowerTop + 1);
  });
});

describe("FallingText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads as its text, with the pieces hidden", async () => {
    const { container } = render(<FallingText>Hold on tight</FallingText>);
    expect(screen.getByText("Hold on tight")).toHaveClass("sr-only");
    expect(pieces()).toHaveLength(3);
    expect(pieces()[0]?.parentElement).toHaveAttribute("aria-hidden", "true");
    await expectNoA11yViolations(container);
  });

  it("falls on hover", async () => {
    render(<FallingText>Down we go</FallingText>);
    expect(box()).toHaveAttribute("data-state", "resting");
    await act(async () => {
      fireEvent.pointerEnter(box());
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(box()).toHaveAttribute("data-state", "fallen");
  });

  it("is a toggle button with trigger click", async () => {
    const user = userEvent.setup();
    render(<FallingText trigger="click">Click me</FallingText>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("is driven by drop and reset through handleRef", () => {
    const handle = createRef<FallingTextHandle>();
    render(
      <FallingText trigger="manual" handleRef={handle}>
        Manual
      </FallingText>,
    );
    act(() => handle.current?.drop());
    expect(box()).toHaveAttribute("data-state", "fallen");
    act(() => handle.current?.reset());
    expect(box()).toHaveAttribute("data-state", "resting");
  });

  it("follows a controlled fallen prop", () => {
    const { rerender } = render(<FallingText fallen={false}>Controlled</FallingText>);
    expect(box()).toHaveAttribute("data-state", "resting");
    rerender(<FallingText fallen>Controlled</FallingText>);
    expect(box()).toHaveAttribute("data-state", "fallen");
  });

  it("does not move anything under reduced motion", async () => {
    mockReducedMotion(true);
    render(<FallingText>Stay put</FallingText>);
    await act(async () => {
      fireEvent.pointerEnter(box());
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(box()).toHaveAttribute("data-state", "fallen");
    expect(pieces()[0]?.style.transform).toBe("");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FallingText ref={ref}>Ref</FallingText>);
    expect(ref.current).toBe(box());
  });
});
