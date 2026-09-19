import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

function Example({ side }: { side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger>Trigger</TooltipTrigger>
      <TooltipContent side={side}>Hint</TooltipContent>
    </Tooltip>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-tooltip"]');
}

describe("Tooltip motion", () => {
  it("pops in with the overshoot keyframe on a delayed open, and keeps the shared exit", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example side="right" />);
    await user.hover(screen.getByText("Trigger"));
    await screen.findByRole("tooltip");

    const content = baseElement.querySelector("[data-slot='tooltip-content']");
    expect(content).toHaveAttribute("data-side", "right");
    expect(content).toHaveClass(
      "data-[state=delayed-open]:animate-[dowel-tooltip-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
      "data-[state=closed]:animate-float-out",
    );
  });

  it("travels away from the trigger on every side", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.hover(screen.getByText("Trigger"));
    await screen.findByRole("tooltip");

    const css = stylesheet()?.textContent ?? "";
    expect(css).toContain("[data-side=top]{--dowel-tooltip-y:4px}");
    expect(css).toContain("[data-side=bottom]{--dowel-tooltip-y:-4px}");
    expect(css).toContain("[data-side=left]{--dowel-tooltip-x:4px}");
    expect(css).toContain("[data-side=right]{--dowel-tooltip-x:-4px}");
    expect(document.querySelectorAll('style[data-href="dowel-tooltip"]')).toHaveLength(1);
  });

  it("times the pop from --motion-scale, so reduced motion settles instantly", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.hover(screen.getByText("Trigger"));
    await screen.findByRole("tooltip");

    const content = baseElement.querySelector("[data-slot='tooltip-content']");
    const animations = content?.className.match(/animate-\[[^\]]*\]/g) ?? [];
    expect(animations.length).toBeGreaterThan(0);
    for (const animation of animations) expect(animation).toContain("var(--motion-scale)");
  });

  it("still opens on keyboard focus and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.hover(screen.getByText("Trigger"));
    await screen.findByRole("tooltip");
    await expectNoA11yViolations(baseElement);
  });
});
