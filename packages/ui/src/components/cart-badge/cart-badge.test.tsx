import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CartBadge } from "./cart-badge";

function badge(container: HTMLElement) {
  return container.querySelector('[data-slot="cart-badge-count"]');
}

function landAll(container: HTMLElement) {
  for (const flight of container.querySelectorAll('[data-slot="cart-badge-flight"]')) {
    fireEvent.animationEnd(flight);
  }
}

describe("CartBadge", () => {
  it("renders a named add button and a polite count", () => {
    render(<CartBadge defaultCount={2} />);
    expect(screen.getByRole("button", { name: "Add to bag" })).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("2 items in bag");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("hides the badge while the bag is empty", () => {
    const { container } = render(<CartBadge />);
    expect(badge(container)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("0 items in bag");
  });

  it("flies a dot and updates the badge only when it lands", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCountChange = vi.fn();
    const { container } = render(
      <CartBadge defaultCount={1} onAdd={onAdd} onCountChange={onCountChange} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onCountChange).toHaveBeenCalledWith(2);
    expect(container.querySelectorAll('[data-slot="cart-badge-flight"]')).toHaveLength(1);
    expect(badge(container)).toHaveAttribute("data-value", "1");

    landAll(container);
    expect(container.querySelector('[data-slot="cart-badge-flight"]')).toBeNull();
    expect(badge(container)).toHaveAttribute("data-value", "2");
    expect(badge(container)).toHaveAttribute("data-animate");
    expect(screen.getByRole("status")).toHaveTextContent("2 items in bag");
  });

  it("lands quick presses one number at a time", async () => {
    const user = userEvent.setup();
    const { container } = render(<CartBadge />);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    const flights = container.querySelectorAll('[data-slot="cart-badge-flight"]');
    expect(flights).toHaveLength(2);
    fireEvent.animationEnd(flights[0] as Element);
    expect(badge(container)).toHaveAttribute("data-value", "1");
    fireEvent.animationEnd(flights[1] as Element);
    expect(badge(container)).toHaveAttribute("data-value", "2");
  });

  it("adds from the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<CartBadge />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    landAll(container);
    expect(screen.getByRole("status")).toHaveTextContent("2 items in bag");
  });

  it("follows a controlled count", async () => {
    function Controlled() {
      const [count, setCount] = useState(5);
      return <CartBadge count={count} onCountChange={setCount} />;
    }
    const user = userEvent.setup();
    const { container } = render(<Controlled />);
    await user.click(screen.getByRole("button"));
    landAll(container);
    expect(badge(container)).toHaveAttribute("data-value", "6");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onCountChange = vi.fn();
    const { container } = render(<CartBadge count={1} onCountChange={onCountChange} />);
    await user.click(screen.getByRole("button"));
    landAll(container);
    expect(onCountChange).toHaveBeenCalledWith(2);
    expect(badge(container)).toHaveAttribute("data-value", "1");
  });

  it("uses custom words for the live region", () => {
    render(<CartBadge defaultCount={3} formatStatus={(count) => `Cart: ${String(count)}`} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cart: 3");
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<CartBadge disabled onAdd={onAdd} />);
    await user.click(screen.getByRole("button"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CartBadge ref={ref} className="gap-2" data-testid="cart" />);
    const element = screen.getByTestId("cart");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("gap-2");
    expect(element).not.toHaveClass("gap-[1.5em]");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<CartBadge defaultCount={1} />);
    await expectNoA11yViolations(container);
  });
});
