import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FlipCard } from "./flip-card";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  motionPreference.reduced = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Faces(props: Partial<Parameters<typeof FlipCard>[0]>) {
  return (
    <FlipCard
      data-testid="card"
      front={
        <div>
          <h3>Front title</h3>
          <a href="#front">Front link</a>
        </div>
      }
      back={
        <div>
          <h3>Back title</h3>
          <button type="button">Back action</button>
        </div>
      }
      {...props}
    />
  );
}

function part(name: string) {
  return screen
    .getByTestId("card")
    .querySelector<HTMLElement>(`[data-slot="flip-card-${name}"]`);
}

/** Lays the card out at 200×100 from the origin. */
function layOut() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }),
  );
}

describe("FlipCard", () => {
  it("renders the front, with the back inert and hidden", () => {
    render(<Faces />);
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "flip-card");
    expect(card).toHaveAttribute("data-state", "front");
    expect(screen.getByRole("heading", { name: "Front title" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Back title" })).toBeNull();
    expect(part("back")).toHaveAttribute("inert");
    expect(part("back")).toHaveAttribute("aria-hidden", "true");
    expect(part("front")).not.toHaveAttribute("inert");
    expect(part("front")).not.toHaveAttribute("aria-hidden");
    const toggle = screen.getByRole("button", { name: "Show back" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("turns over with its corner toggle, keeping the toggle's name", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(<Faces onFlippedChange={onFlippedChange} />);
    const toggle = screen.getByRole("button", { name: "Show back" });

    await user.click(toggle);
    expect(screen.getByTestId("card")).toHaveAttribute("data-state", "back");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAccessibleName("Show back");
    expect(part("front")).toHaveAttribute("inert");
    expect(part("back")).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Back action" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Front link" })).toBeNull();
    expect(onFlippedChange).toHaveBeenLastCalledWith(true);

    await user.click(toggle);
    expect(screen.getByTestId("card")).toHaveAttribute("data-state", "front");
    expect(onFlippedChange).toHaveBeenLastCalledWith(false);
  });

  it("turns over from the keyboard, and the toggle keeps focus", async () => {
    const user = userEvent.setup();
    render(<Faces />);
    await user.tab();
    expect(screen.getByRole("link", { name: "Front link" })).toHaveFocus();
    // user-event's Tab order does not model `inert`, so the toggle is focused directly.
    const toggle = screen.getByRole("button", { name: "Show back" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveFocus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("starts on the back when asked, without animating", () => {
    render(<Faces defaultFlipped />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-state", "back");
    expect(part("inner")?.style.transform).toContain("rotateY(180deg)");
  });

  it("is controllable", async () => {
    function Controlled() {
      const [flipped, setFlipped] = useState(false);
      return (
        <>
          <Faces flipped={flipped} onFlippedChange={setFlipped} />
          <output>{flipped ? "back" : "front"}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Show back" }));
    expect(screen.getByRole("status")).toHaveTextContent("back");
    expect(screen.getByTestId("card")).toHaveAttribute("data-state", "back");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(<Faces flipped={false} onFlippedChange={onFlippedChange} />);
    await user.click(screen.getByRole("button", { name: "Show back" }));
    expect(onFlippedChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("card")).toHaveAttribute("data-state", "front");
  });

  it("springs the turn when the owner changes it", async () => {
    const { rerender } = render(<Faces flipped={false} />);
    rerender(<Faces flipped />);
    await waitFor(() => {
      expect(part("inner")?.style.transform).toMatch(/rotateY\((?!0deg)/);
    });
  });

  it("turns around the x axis", () => {
    render(<Faces axis="x" defaultFlipped />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-axis", "x");
    expect(part("inner")?.style.transform).toContain("rotateX(180deg)");
    expect(part("back")).toHaveClass("rotate-x-180");
  });

  it("turns while a mouse rests on it in hover mode, but not for touch", () => {
    render(<Faces trigger="hover" />);
    const card = screen.getByTestId("card");
    fireEvent.pointerEnter(card, { pointerType: "touch" });
    expect(card).toHaveAttribute("data-state", "front");
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    expect(card).toHaveAttribute("data-state", "back");
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    expect(card).toHaveAttribute("data-state", "front");
  });

  it("does not turn on hover in click mode", () => {
    render(<Faces />);
    const card = screen.getByTestId("card");
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    expect(card).toHaveAttribute("data-state", "front");
  });

  it("leans toward the pointer and settles back when it leaves", async () => {
    layOut();
    render(<Faces />);
    const card = screen.getByTestId("card");
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });
    await waitFor(() => {
      expect(part("lean")?.style.transform).toMatch(/rotateX\(\d/);
    });
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    await waitFor(() => {
      expect(part("lean")?.style.transform ?? "").not.toMatch(/rotateX\(\d/);
    });
  });

  it("does not lean for touch, when disabled, or with no lean", () => {
    layOut();
    const { rerender } = render(<Faces />);
    const card = screen.getByTestId("card");
    fireEvent.pointerMove(card, { pointerType: "touch", clientX: 200, clientY: 100 });
    rerender(<Faces lean={0} />);
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });
    rerender(<Faces disabled />);
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });
    expect(part("lean")?.style.transform ?? "").not.toMatch(/rotate/);
  });

  it("ignores an unmeasured card", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 }),
    );
    render(<Faces />);
    fireEvent.pointerMove(screen.getByTestId("card"), { pointerType: "mouse", clientX: 5 });
    expect(part("lean")?.style.transform ?? "").not.toMatch(/rotate/);
  });

  it("swaps faces instantly under reduced motion, with no lean", async () => {
    motionPreference.reduced = true;
    layOut();
    render(<Faces />);
    const card = screen.getByTestId("card");
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "Show back" }));
    expect(card).toHaveAttribute("data-state", "back");
    await waitFor(() => {
      expect(part("inner")?.style.transform).toContain("rotateY(180deg)");
    });
    expect(part("lean")?.style.transform ?? "").not.toMatch(/rotate/);
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onFlippedChange = vi.fn();
    render(<Faces disabled trigger="hover" onFlippedChange={onFlippedChange} />);
    const card = screen.getByTestId("card");
    expect(screen.getByRole("button", { name: "Show back" })).toBeDisabled();
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    await user.click(screen.getByRole("button", { name: "Show back" }));
    expect(onFlippedChange).not.toHaveBeenCalled();
    expect(card).toHaveAttribute("data-disabled");
  });

  it("can hide the button and rename it", () => {
    const { rerender } = render(<Faces hideButton trigger="hover" />);
    expect(screen.queryByRole("button", { name: "Show back" })).toBeNull();
    rerender(<Faces flipLabel="Show answer" />);
    expect(screen.getByRole("button", { name: "Show answer" })).toBeInTheDocument();
  });

  it.each([
    ["sm", "rounded-lg"],
    ["md", "rounded-xl"],
    ["lg", "rounded-2xl"],
  ] as const)("applies the %s size", (size, radius) => {
    render(<Faces size={size} />);
    expect(screen.getByTestId("card")).toHaveClass(radius);
  });

  it("styles each face", () => {
    render(<Faces frontClassName="bg-primary" backClassName="bg-secondary" />);
    expect(part("front")).toHaveClass("bg-primary");
    expect(part("front")).not.toHaveClass("bg-card");
    expect(part("back")).toHaveClass("bg-secondary");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const onPointerEnter = vi.fn();
    render(
      <Faces ref={ref} className="rounded-none" id="flip" onPointerEnter={onPointerEnter} />,
    );
    const card = screen.getByTestId("card");
    expect(ref.current).toBe(card);
    expect(card).toHaveAttribute("id", "flip");
    expect(card).toHaveClass("rounded-none");
    expect(card).not.toHaveClass("rounded-xl");
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    expect(onPointerEnter).toHaveBeenCalled();
  });

  it("has no accessibility violations on either face", async () => {
    const user = userEvent.setup();
    const { container } = render(<Faces />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Show back" }));
    await expectNoA11yViolations(container);
  });
});
