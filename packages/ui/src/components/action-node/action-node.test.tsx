import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ActionNode, fanPositions, type ActionNodeAction } from "./action-node";
import { springEasing } from "./action-node-spring";

function actions(onSelect = vi.fn()): ActionNodeAction[] {
  return [
    { label: "Connect", icon: <svg />, onSelect },
    { label: "Add a step", icon: <svg /> },
    { label: "Duplicate", icon: <svg /> },
    { label: "Settings", icon: <svg /> },
  ];
}

function fan() {
  return document.querySelector<HTMLElement>('[data-slot="action-node-fan"]') as HTMLElement;
}

function zone() {
  return document.querySelector<HTMLElement>('[data-slot="action-node-zone"]') as HTMLElement;
}

function action(name: string) {
  return screen.getByRole("button", { name, hidden: true });
}

function items() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="action-node-item"]')];
}

describe("ActionNode", () => {
  it("renders the card with heading, description, people and a closed fan", () => {
    render(
      <ActionNode
        heading="Node 07"
        description="Reads the thread."
        icon={<svg data-testid="chip" />}
        people={[{ name: "Ada Lovelace" }, { name: "Grace", image: "/g.png" }]}
        extraCount={3}
        actions={actions()}
      />,
    );
    expect(screen.getByText("Node 07")).toBeInTheDocument();
    expect(screen.getByText("Reads the thread.")).toBeInTheDocument();
    expect(screen.getByTestId("chip").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("list", { name: "People" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toHaveClass("sr-only");
    expect(screen.getByText("AL")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("and 3 more")).toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "More actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", fan().id);
    expect(fan()).toHaveAttribute("inert");
    expect(fan()).toHaveAttribute("aria-hidden", "true");
    expect(action("Connect")).toHaveAttribute("tabindex", "-1");
    expect(items()[0]?.style.translate).toBe("-20px 20px");
    expect(items()[0]?.style.scale).toBe("0.82");
  });

  it("opens on hover, fanning the buttons out along the arc, and closes on leave", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ActionNode heading="Node" actions={actions()} onOpenChange={onOpenChange} />);
    await user.hover(screen.getByText("Node"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(fan()).not.toHaveAttribute("inert");
    expect(screen.getByRole("toolbar", { name: "Node actions" })).toBeInTheDocument();
    expect(zone()).toHaveAttribute("data-open");
    const [first, second] = items();
    expect(first?.style.translate).toBe("-51.4px -31.2px");
    expect(first?.style.scale).toBe("1");
    // Staggered: 55 × 0.9 ms per button.
    expect(second?.style.transitionDelay).toBe("calc(49.5ms * var(--motion-scale))");
    expect(action("Connect")).toHaveAttribute("tabindex", "0");

    await user.unhover(screen.getByText("Node"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(fan()).toHaveAttribute("inert");
  });

  it("ignores touch hover, which the trigger covers instead", () => {
    render(<ActionNode heading="Node" actions={actions()} />);
    fireEvent.pointerEnter(zone(), { pointerType: "touch" });
    expect(fan()).toHaveAttribute("inert");
    fireEvent.pointerEnter(zone(), { pointerType: "mouse" });
    expect(fan()).not.toHaveAttribute("inert");
    fireEvent.pointerLeave(zone(), { pointerType: "touch" });
    expect(fan()).not.toHaveAttribute("inert");
  });

  it("opens from the trigger with Enter, focuses the first action, and roves", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} />);
    await user.tab();
    const trigger = screen.getByRole("button", { name: "More actions" });
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(action("Connect")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(action("Add a step")).toHaveFocus();
    expect(action("Add a step")).toHaveAttribute("tabindex", "0");
    expect(action("Connect")).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{ArrowDown}");
    expect(action("Duplicate")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(action("Connect")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(action("Settings")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(action("Connect")).toHaveFocus();
    await user.keyboard("{End}");
    expect(action("Settings")).toHaveFocus();
    await user.keyboard("x");
    expect(action("Settings")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("opens with Space and ArrowDown too, and ArrowDown refocuses an open fan", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} />);
    await user.tab();
    await user.keyboard(" ");
    expect(action("Connect")).toHaveFocus();
    await user.keyboard("{Escape}");
    await user.keyboard("{ArrowDown}");
    expect(action("Connect")).toHaveFocus();
    await user.keyboard("{End}");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(action("Connect")).toHaveFocus();
    // Other keys on the trigger do nothing.
    await user.keyboard("{Shift>}{Tab}{/Shift}{ArrowUp}");
    expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
  });

  it("toggles from a pointer click on the trigger without moving focus", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} />);
    const trigger = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(trigger, { detail: 1 });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(action("Connect")).not.toHaveFocus();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when the pointer leaves a keyboard-opened fan", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} />);
    await user.tab();
    await user.keyboard("{Enter}");
    fireEvent.pointerLeave(zone(), { pointerType: "mouse" });
    expect(fan()).not.toHaveAttribute("inert");
    expect(action("Connect")).toHaveFocus();
  });

  it("returns focus to the trigger when a hover-opened fan closes under focus", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} />);
    fireEvent.pointerEnter(zone(), { pointerType: "mouse" });
    act(() => {
      action("Duplicate").focus();
    });
    fireEvent.pointerLeave(zone(), { pointerType: "mouse" });
    expect(fan()).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(fan()).toHaveAttribute("inert");
  });

  it("closes when focus or a press goes elsewhere", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ActionNode heading="Node" actions={actions()} />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
    expect(fan()).toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "More actions" }), { detail: 1 });
    expect(fan()).not.toHaveAttribute("inert");
    fireEvent.pointerDown(zone());
    expect(fan()).not.toHaveAttribute("inert");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(fan()).toHaveAttribute("inert");
  });

  it("calls an action's onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ActionNode heading="Node" actions={actions(onSelect)} defaultOpen />);
    await user.click(action("Connect"));
    expect(onSelect).toHaveBeenCalledOnce();
    await user.click(action("Settings"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("is controllable", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ActionNode
        heading="Node"
        actions={actions()}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(fan()).toHaveAttribute("inert");
    rerender(
      <ActionNode heading="Node" actions={actions()} open onOpenChange={onOpenChange} />,
    );
    expect(fan()).not.toHaveAttribute("inert");

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <ActionNode heading="Other" actions={actions()} open={open} onOpenChange={setOpen} />
      );
    }
    rerender(<Harness />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(action("Connect")).toHaveFocus();
  });

  it("mirrors the arc and the arrow keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(<ActionNode heading="Node" actions={actions()} dir="rtl" defaultOpen />);
    expect(items()[0]?.style.translate).toBe("51.4px -31.2px");
    const bridge = document.querySelector<HTMLElement>('[data-slot="action-node-bridge"]');
    expect(bridge?.style.right).toBe("-75px");
    await user.tab();
    await user.tab();
    expect(action("Connect")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(action("Add a step")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(action("Connect")).toHaveFocus();
  });

  it("follows the feel props", () => {
    const { container } = render(
      <ActionNode
        heading="Node"
        actions={actions().slice(0, 2)}
        defaultOpen
        bounce={0}
        stagger={100}
        reach={40}
        corner={8}
        stroke
        tone="inverted"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("--action-node-surface:var(--color-foreground)");
    expect(root.style.getPropertyValue("--action-node-spring")).toMatch(/^linear\(/);
    expect(items()).toHaveLength(2);
    expect(items()[1]?.style.transitionDelay).toBe("calc(90ms * var(--motion-scale))");
    expect(
      container.querySelector<HTMLElement>('[data-slot="action-node-card"]')?.style
        .borderRadius,
    ).toBe("8px");
    expect(action("Connect").className).toContain("ring-1");
  });

  it("places the default fan on bencho's arc", () => {
    const [connect, add, duplicate, settings] = fanPositions(4, 30);
    expect(connect?.x).toBeCloseTo(-51.7, 0);
    expect(add?.y).toBeCloseTo(-28.5, 0);
    expect(duplicate?.x).toBeCloseTo(28.5, 0);
    expect(settings?.y).toBeCloseTo(51.7, 0);
    expect(springEasing(1)).toMatch(/^linear\(/);
  });

  it("omits the optional rows", () => {
    render(<ActionNode heading="Node" actions={actions()} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    render(<ActionNode heading="Solo" actions={actions()} extraCount={2} />);
    expect(screen.getByText("and 2 more")).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ActionNode
        heading="Node"
        actions={actions()}
        ref={ref}
        className="py-2"
        data-testid="n"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("py-2");
    expect(root).not.toHaveClass("py-13");
    expect(root).toHaveAttribute("data-testid", "n");
  });

  it("has no axe violations, closed or open", async () => {
    const { container, rerender } = render(
      <ActionNode heading="Node" people={[{ name: "Ada" }]} actions={actions()} />,
    );
    await act(async () => {
      await expectNoA11yViolations(container);
    });
    rerender(<ActionNode heading="Node" people={[{ name: "Ada" }]} actions={actions()} open />);
    await act(async () => {
      await expectNoA11yViolations(container);
    });
  });
});
