import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NotificationBadge } from "./notification-badge";

function indicator(container: HTMLElement) {
  const found = container.querySelector<HTMLElement>(
    '[data-slot="notification-badge-indicator"]',
  );
  if (!found) throw new Error("no indicator");
  return found;
}

describe("NotificationBadge", () => {
  it("pins a dot to the top-end corner of its child, with screen-reader text", () => {
    const { container } = render(
      <NotificationBadge>
        <button type="button">Inbox</button>
      </NotificationBadge>,
    );
    const badge = indicator(container);
    expect(badge).toHaveAttribute("data-variant", "dot");
    expect(badge).toHaveClass("absolute", "-end-1", "-top-1", "size-2.5", "bg-primary");
    expect(badge).toHaveTextContent("New");
    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
  });

  it("renders inline when it wraps nothing", () => {
    const { container } = render(<NotificationBadge />);
    expect(indicator(container)).toHaveClass("relative");
    expect(indicator(container)).not.toHaveClass("absolute");
  });

  it.each([
    ["top-start", ["-start-1", "-top-1"]],
    ["bottom-end", ["-end-1", "-bottom-1"]],
    ["bottom-start", ["-start-1", "-bottom-1"]],
  ] as const)("places the badge at %s with logical insets", (position, classes) => {
    const { container } = render(
      <NotificationBadge position={position}>
        <span>Icon</span>
      </NotificationBadge>,
    );
    expect(indicator(container)).toHaveClass("absolute", ...classes);
  });

  describe("count", () => {
    it("shows the count, hiding the digits and naming the total", () => {
      const { container } = render(<NotificationBadge variant="count" count={3} />);
      const badge = indicator(container);
      expect(badge).toHaveAttribute("data-state", "visible");
      expect(screen.getByText("3 notifications")).toHaveClass("sr-only");
      expect(badge.querySelector('[data-slot="number-flow"]')?.parentElement).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("uses the singular for one", () => {
      render(<NotificationBadge variant="count" count={1} />);
      expect(screen.getByText("1 notification")).toBeInTheDocument();
    });

    it("caps the display at max with a plus", () => {
      const { container } = render(<NotificationBadge variant="count" count={150} max={99} />);
      const badge = indicator(container);
      expect(badge.querySelector('[data-slot="number-flow"]')).toHaveTextContent("99");
      expect(badge).toHaveTextContent("+");
      expect(screen.getByText("More than 99 notifications")).toBeInTheDocument();
    });

    it("hides at zero, and shows zero on request", () => {
      const { container, rerender } = render(<NotificationBadge variant="count" count={0} />);
      const badge = indicator(container);
      expect(badge).toHaveAttribute("data-state", "hidden");
      expect(badge).toHaveAttribute("aria-hidden", "true");
      expect(badge.querySelector(":scope > .sr-only")).toBeEmptyDOMElement();

      rerender(<NotificationBadge variant="count" count={0} showZero />);
      expect(badge).toHaveAttribute("data-state", "visible");
      expect(badge).not.toHaveAttribute("aria-hidden");
      expect(screen.getByText("0 notifications")).toBeInTheDocument();
    });

    it("rolls to a new value when the count changes", () => {
      const { container, rerender } = render(<NotificationBadge variant="count" count={4} />);
      rerender(<NotificationBadge variant="count" count={5} />);
      expect(indicator(container).querySelector('[data-slot="number-flow"]')).toHaveAttribute(
        "data-trend",
        "up",
      );
      expect(screen.getByText("5 notifications")).toBeInTheDocument();
    });
  });

  it.each([
    ["online", "bg-success", "Online"],
    ["away", "bg-warning", "Away"],
    ["busy", "bg-destructive", "Busy"],
    ["offline", "bg-muted-foreground", "Offline"],
  ] as const)("colours and names the %s status", (status, colour, name) => {
    const { container } = render(<NotificationBadge variant="status" status={status} />);
    const badge = indicator(container);
    expect(badge).toHaveClass(colour, "ring-2", "ring-background", "size-3");
    expect(badge).toHaveAttribute("data-status", status);
    expect(badge).toHaveTextContent(name);
  });

  it("takes a tone for dot and count", () => {
    const { container } = render(
      <NotificationBadge variant="count" count={2} tone="destructive" />,
    );
    expect(indicator(container)).toHaveClass("bg-destructive");
  });

  it("prefers an explicit label", () => {
    render(<NotificationBadge variant="count" count={2} label="2 unread messages" />);
    expect(screen.getByText("2 unread messages")).toBeInTheDocument();
    expect(screen.queryByText("2 notifications")).toBeNull();
  });

  it("renders a ping ring with its keyframes only when asked and visible", () => {
    const { container, rerender } = render(<NotificationBadge ping />);
    const ping = container.querySelector('[data-slot="notification-badge-ping"]');
    expect(ping).toHaveAttribute("aria-hidden", "true");
    expect(ping).toHaveClass("motion-reduce:hidden");
    const stylesheet = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(stylesheet).toContain("@keyframes dowel-notification-badge-ping");
    expect(stylesheet).toContain("var(--motion-scale, 1)");

    rerender(<NotificationBadge ping variant="count" count={0} />);
    expect(container.querySelector('[data-slot="notification-badge-ping"]')).toBeNull();
  });

  it("is a polite live region only when live", () => {
    const { container, rerender } = render(<NotificationBadge variant="count" count={1} />);
    expect(indicator(container)).not.toHaveAttribute("aria-live");
    rerender(<NotificationBadge variant="count" count={1} live />);
    expect(indicator(container)).toHaveAttribute("aria-live", "polite");
    expect(indicator(container)).toHaveAttribute("aria-atomic", "true");
  });

  it("lets consumer classes win on the wrapper and the badge", () => {
    const { container } = render(
      <NotificationBadge
        className="inline-block"
        badgeClassName="bg-info"
        data-testid="root"
      />,
    );
    expect(screen.getByTestId("root")).toHaveClass("inline-block");
    expect(screen.getByTestId("root")).not.toHaveClass("inline-flex");
    expect(indicator(container)).toHaveClass("bg-info");
    expect(indicator(container)).not.toHaveClass("bg-primary");
  });

  it("forwards a ref to the wrapper", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<NotificationBadge ref={ref} data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId("root"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <NotificationBadge variant="count" count={12} ping>
          <button type="button">Notifications</button>
        </NotificationBadge>
        <NotificationBadge variant="status" status="busy" />
        <NotificationBadge variant="count" count={0} />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
