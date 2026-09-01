import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function Example({ delayDuration = 0 }: { delayDuration?: number } = {}) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <Button size="icon" aria-label="Add item">
          +
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add item</TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("is hidden until the trigger is hovered", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "Add item" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Add item");
  });

  it("opens on keyboard focus, not only on hover", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Add item" })).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    // disableHoverableContent removes the grace area that normally lets the
    // pointer travel from trigger to tooltip. That grace area is a polygon
    // computed from measured rects, and jsdom reports every rect as zero-sized,
    // so leaving it enabled would exercise the stub rather than the behaviour.
    render(
      <Tooltip delayDuration={0} disableHoverableContent>
        <TooltipTrigger>Trigger</TooltipTrigger>
        <TooltipContent>Hint</TooltipContent>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    await user.hover(trigger);
    await screen.findByRole("tooltip");

    await user.unhover(trigger);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("works without an explicit provider", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.hover(screen.getByRole("button", { name: "Add item" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("works inside a shared provider", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Example />
      </TooltipProvider>,
    );

    await user.hover(screen.getByRole("button", { name: "Add item" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("merges a consumer className", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip delayDuration={0}>
        <TooltipTrigger>Trigger</TooltipTrigger>
        <TooltipContent className="max-w-xs">Hint</TooltipContent>
      </Tooltip>,
    );

    await user.hover(screen.getByText("Trigger"));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveClass("max-w-xs");
    expect(tooltip).not.toHaveClass("max-w-64");
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.hover(screen.getByRole("button", { name: "Add item" }));
    await screen.findByRole("tooltip");

    await expectNoA11yViolations(baseElement);
  });
});
