import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SwipeActions, type SwipeAction } from "./swipe-actions";

const icon = <svg aria-hidden="true" />;

function actions(overrides: Partial<Record<string, () => void>> = {}): SwipeAction[] {
  return [
    { id: "archive", label: "Archive", icon, tone: "contrast", onSelect: overrides.archive },
    { id: "delete", label: "Delete", icon, onSelect: overrides.delete },
  ];
}

function root() {
  return screen.getByRole("group");
}

function row(container: HTMLElement) {
  return container.querySelector('[data-slot="swipe-actions-row"]') as HTMLElement;
}

describe("SwipeActions", () => {
  it("is a named group with named action buttons, closed by default", () => {
    render(
      <SwipeActions aria-label="Message" actions={actions()}>
        Row
      </SwipeActions>,
    );
    expect(screen.getByRole("group", { name: "Message" })).toHaveAttribute(
      "data-state",
      "closed",
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens when an action receives keyboard focus and closes when focus leaves", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SwipeActions aria-label="Message" actions={actions()}>
          Row
        </SwipeActions>
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
    expect(root()).toHaveAttribute("data-state", "open");
    await user.tab();
    expect(root()).toHaveAttribute("data-state", "open");
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("closes on Escape and returns focus to the row", async () => {
    const user = userEvent.setup();
    render(
      <SwipeActions aria-label="Message" actions={actions()}>
        Row
      </SwipeActions>,
    );
    await user.tab();
    await user.keyboard("{Escape}");
    expect(root()).toHaveAttribute("data-state", "closed");
    expect(root()).toHaveFocus();
  });

  it("runs an action from the keyboard and closes", async () => {
    const user = userEvent.setup();
    const archive = vi.fn();
    render(
      <SwipeActions aria-label="Message" actions={actions({ archive })}>
        Row
      </SwipeActions>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(archive).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("drags open past halfway and springs shut short of it", () => {
    const { container } = render(
      <SwipeActions aria-label="Message" actions={actions()}>
        Row
      </SwipeActions>,
    );
    const target = row(container);
    // Two 2.25em buttons, a 0.4em gap and 1em of padding: 5.9em, 94.4px at 16px.
    fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 200 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 150 });
    expect(root()).toHaveAttribute("data-dragging");
    expect(root().style.getPropertyValue("--swipe-actions-reveal")).toBe("50px");
    fireEvent.pointerUp(target, { pointerId: 1, clientX: 150 });
    expect(root()).toHaveAttribute("data-state", "open");
    expect(root()).not.toHaveAttribute("data-dragging");
    expect(root().style.getPropertyValue("--swipe-actions-reveal")).toBe(
      "var(--swipe-actions-width)",
    );

    fireEvent.pointerDown(target, { pointerId: 2, button: 0, clientX: 100 });
    fireEvent.pointerMove(target, { pointerId: 2, clientX: 130 });
    fireEvent.pointerUp(target, { pointerId: 2, clientX: 130 });
    expect(root()).toHaveAttribute("data-state", "open");

    fireEvent.pointerDown(target, { pointerId: 3, button: 0, clientX: 100 });
    fireEvent.pointerMove(target, { pointerId: 3, clientX: 180 });
    fireEvent.pointerUp(target, { pointerId: 3, clientX: 180 });
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("resists a drag past the full width, and the wrong way", () => {
    const { container } = render(
      <SwipeActions aria-label="Message" actions={actions()}>
        Row
      </SwipeActions>,
    );
    const target = row(container);
    fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 100 });
    const reveal = Number.parseFloat(root().style.getPropertyValue("--swipe-actions-reveal"));
    expect(reveal).toBeGreaterThan(94.4);
    expect(reveal).toBeLessThan(200);
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 400 });
    expect(root().style.getPropertyValue("--swipe-actions-reveal")).toBe("-35px");
    fireEvent.pointerCancel(target, { pointerId: 1 });
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("closes an open row on a tap", () => {
    const { container } = render(
      <SwipeActions aria-label="Message" actions={actions()} defaultOpen>
        Row
      </SwipeActions>,
    );
    fireEvent.pointerDown(row(container), { pointerId: 1, button: 0, clientX: 100 });
    fireEvent.pointerUp(row(container), { pointerId: 1, clientX: 100 });
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("follows a controlled open state", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <SwipeActions
            aria-label="Message"
            actions={actions()}
            open={open}
            onOpenChange={setOpen}
          >
            Row
          </SwipeActions>
          <span data-testid="state">{String(open)}</span>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(root()).toHaveAttribute("data-state", "open");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SwipeActions
        aria-label="Message"
        actions={actions()}
        open={false}
        onOpenChange={onOpenChange}
      >
        Row
      </SwipeActions>,
    );
    await user.tab();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("shows the label as text when an action has no icon", () => {
    render(
      <SwipeActions aria-label="Message" actions={[{ id: "pin", label: "Pin" }]}>
        Row
      </SwipeActions>,
    );
    expect(screen.getByRole("button", { name: "Pin" })).toHaveTextContent("Pin");
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SwipeActions
        ref={ref}
        aria-label="Message"
        actions={actions()}
        className="rounded-none"
        data-testid="swipe"
      >
        Row
      </SwipeActions>,
    );
    const element = screen.getByTestId("swipe");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("rounded-none");
    expect(element).not.toHaveClass("rounded-[1.1em]");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SwipeActions aria-label="Message" actions={actions()}>
        Row
      </SwipeActions>,
    );
    await expectNoA11yViolations(container);
  });
});
