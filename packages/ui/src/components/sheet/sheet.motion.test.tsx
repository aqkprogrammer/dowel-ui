import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function Example({
  animation,
  side,
}: {
  animation?: "default" | "spring";
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent animation={animation} side={side}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow it down.</SheetDescription>
        </SheetHeader>
        <p>Body</p>
        <SheetFooter>
          <SheetClose>Apply</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-sheet"]');
}

describe("Sheet motion", () => {
  it("slides in as one piece by default", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Open"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveAttribute("data-animation");
    expect(dialog).toHaveClass("data-[state=open]:animate-slide-in");
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    'staggers its sections after the slide from the %s with animation="spring"',
    async (side) => {
      const user = userEvent.setup();
      render(<Example animation="spring" side={side} />);
      await user.click(screen.getByText("Open"));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAttribute("data-animation", "spring");
      // The panel keeps the shared slide: it never overshoots its edge.
      expect(dialog).toHaveClass("data-[state=open]:animate-slide-in");
      const css = stylesheet()?.textContent ?? "";
      expect(css).toContain(
        "[data-animation=spring][data-state=open]>:not([data-slot=sheet-close])",
      );
      expect(css).toContain(":nth-child(2){animation-delay:calc(170ms * var(--motion-scale))}");
    },
  );

  it("scales every duration and delay by --motion-scale, so reduced motion settles instantly", async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");

    const timings = stylesheet()?.textContent?.match(/calc\([^)]*\)/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) expect(timing).toContain("var(--motion-scale)");
    expect(document.querySelectorAll('style[data-href="dowel-sheet"]')).toHaveLength(1);
  });

  it("still closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    const trigger = screen.getByText("Open");
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("has no accessibility violations with the spring entrance", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
