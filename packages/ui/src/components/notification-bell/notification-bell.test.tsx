import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { animate } from "motion/react";
import type * as MotionModule from "motion/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NotificationBell, notificationBellLabel, swingImpulse } from "./notification-bell";

// The swing is a spring driven by `animate`; jsdom cannot run it, so the test
// observes the pushes it is given rather than the angles it would produce.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof MotionModule>();
  return { ...actual, animate: vi.fn(() => ({ stop: () => {} })) };
});

function badge(container: HTMLElement) {
  const found = container.querySelector<HTMLElement>(
    '[data-slot="notification-badge-indicator"]',
  );
  if (!found) throw new Error("no badge");
  return found;
}

function reduceMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  vi.mocked(animate).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("swingImpulse", () => {
  it("pushes along the swing already under way, so quick pushes build", () => {
    expect(swingImpulse(0, 0)).toBe(300);
    expect(swingImpulse(200, 5)).toBe(500);
    expect(swingImpulse(-200, -5)).toBe(-500);
  });

  it("pushes back toward upright from the top of a swing", () => {
    expect(swingImpulse(0, 12)).toBe(-300);
    expect(swingImpulse(0, -12)).toBe(300);
  });

  it("caps how hard it can swing", () => {
    expect(swingImpulse(700, 0)).toBe(760);
    expect(swingImpulse(-700, 0)).toBe(-760);
  });
});

describe("notificationBellLabel", () => {
  it("names the unread count", () => {
    expect(notificationBellLabel(0)).toBe("Notifications");
    expect(notificationBellLabel(1)).toBe("Notifications, 1 unread");
    expect(notificationBellLabel(120, 99)).toBe("Notifications, more than 99 unread");
  });
});

describe("NotificationBell", () => {
  it("is a round button named with its unread count, with a rolling badge", () => {
    const { container } = render(<NotificationBell count={3} />);
    const button = screen.getByRole("button", { name: "Notifications, 3 unread" });
    expect(button).toHaveAttribute("data-state", "unread");
    expect(button).toHaveClass("rounded-full", "bg-secondary");
    const indicator = badge(container);
    expect(indicator).toHaveAttribute("data-state", "visible");
    expect(indicator).toHaveClass("bg-destructive");
    expect(indicator.querySelector('[data-slot="number-flow"]')).not.toBeNull();
    expect(button.querySelector('[data-slot="notification-bell-icon"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("hides the badge at zero, faster than it arrives", () => {
    const { container } = render(<NotificationBell count={0} />);
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveAttribute(
      "data-state",
      "read",
    );
    expect(badge(container)).toHaveAttribute("data-state", "hidden");
    expect(badge(container)).toHaveClass("scale-0", "duration-[var(--duration-fast)]");
  });

  it("does not pop the badge in on first paint", () => {
    const { container } = render(<NotificationBell count={2} />);
    expect(badge(container)).toHaveClass("starting:scale-100");
    expect(badge(container)).not.toHaveClass("starting:scale-0");
  });

  it("caps the count at max", () => {
    const { container } = render(<NotificationBell count={120} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Notifications, more than 99 unread",
    );
    expect(badge(container)).toHaveTextContent("+");
  });

  it.each([
    [2.7, "Notifications, 2 unread"],
    [-4, "Notifications"],
    [Number.NaN, "Notifications"],
  ])("floors a count of %s", (count, name) => {
    render(<NotificationBell count={count} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(name);
  });

  it("shows a dot that appears and leaves on the same counts", () => {
    const { container, rerender } = render(<NotificationBell variant="dot" count={1} />);
    expect(badge(container)).toHaveAttribute("data-variant", "dot");
    expect(badge(container)).not.toHaveClass("scale-0");
    rerender(<NotificationBell variant="dot" count={0} />);
    expect(badge(container)).toHaveClass("scale-0", "opacity-0");
  });

  it("swings when the count rises, never on first paint", () => {
    const { rerender } = render(<NotificationBell count={1} />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<NotificationBell count={2} />);
    expect(animate).toHaveBeenCalledOnce();
    expect(vi.mocked(animate).mock.calls[0]?.[2]).toMatchObject({
      type: "spring",
      velocity: 300,
    });
  });

  it("does not swing when the count falls or stays", () => {
    const { rerender } = render(<NotificationBell count={5} />);
    rerender(<NotificationBell count={4} />);
    rerender(<NotificationBell count={4} />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<NotificationBell count={5} />);
    expect(animate).toHaveBeenCalledOnce();
  });

  it("does not swing under reduced motion", () => {
    reduceMotion();
    const { rerender } = render(<NotificationBell count={1} />);
    rerender(<NotificationBell count={2} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it("scales everything from its size", () => {
    render(<NotificationBell size={56} count={1} />);
    const button = screen.getByRole("button");
    expect(button.style.width).toBe("56px");
    expect(button.style.height).toBe("56px");
    expect(button.style.getPropertyValue("--notification-bell-size")).toBe("56px");
  });

  it.each(["default", "info", "success", "warning"] as const)("takes the %s tone", (tone) => {
    const { container } = render(<NotificationBell count={1} tone={tone} />);
    expect(badge(container)).toHaveClass(tone === "default" ? "bg-primary" : `bg-${tone}`);
  });

  it.each([
    ["soft", "bg-secondary"],
    ["ghost", "text-foreground"],
    ["outline", "border-border"],
  ] as const)("has a %s appearance", (appearance, className) => {
    render(<NotificationBell appearance={appearance} />);
    expect(screen.getByRole("button")).toHaveClass(className);
  });

  it("takes a label, or a function of the count", () => {
    const { rerender } = render(<NotificationBell count={2} label="Alerts" />);
    expect(screen.getByRole("button", { name: "Alerts" })).toBeInTheDocument();
    rerender(<NotificationBell count={2} label={(count) => `${String(count)} alertes`} />);
    expect(screen.getByRole("button", { name: "2 alertes" })).toBeInTheDocument();
  });

  it("is silent unless live, then announces the settled count once", () => {
    vi.useFakeTimers();
    const { rerender } = render(<NotificationBell count={1} />);
    expect(screen.queryByRole("status")).toBeNull();

    rerender(<NotificationBell count={1} live />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();

    rerender(<NotificationBell count={2} live />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender(<NotificationBell count={3} live />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(status).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(status).toHaveTextContent("Notifications, 3 unread");
  });

  it("is a button that clicks, focuses and can be disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<NotificationBell onClick={onClick} />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<NotificationBell onClick={onClick} disabled />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  describe("asChild", () => {
    it("puts the badge on the consumer's element, which keeps its name", () => {
      const { container } = render(
        <NotificationBell asChild count={4} className="rounded-full">
          <a href="#inbox">Inbox</a>
        </NotificationBell>,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAccessibleName("Inbox, 4 unread");
      expect(link).toHaveAttribute("data-slot", "notification-bell");
      expect(link).toHaveClass("relative", "rounded-full");
      expect(link.style.getPropertyValue("--notification-bell-size")).toBe("40px");
      expect(link).toContainElement(badge(container));
    });

    it("never swings", () => {
      const { rerender } = render(
        <NotificationBell asChild count={1}>
          <a href="#inbox">Inbox</a>
        </NotificationBell>,
      );
      rerender(
        <NotificationBell asChild count={2}>
          <a href="#inbox">Inbox</a>
        </NotificationBell>,
      );
      expect(animate).not.toHaveBeenCalled();
    });

    it("has no accessibility violations", async () => {
      const { container } = render(
        <NotificationBell asChild count={4} live>
          <a href="#inbox">Inbox</a>
        </NotificationBell>,
      );
      await expectNoA11yViolations(container);
    });
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <NotificationBell
        ref={ref}
        count={1}
        className="rounded-lg bg-primary"
        data-testid="bell"
        aria-describedby="hint"
      />,
    );
    const button = screen.getByTestId("bell");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("rounded-lg", "bg-primary");
    expect(button).not.toHaveClass("rounded-full", "bg-secondary");
    expect(button).toHaveAttribute("aria-describedby", "hint");
  });

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<NotificationBell count={0} />);
    await expectNoA11yViolations(container);
    rerender(<NotificationBell count={120} live />);
    await expectNoA11yViolations(container);
    rerender(<NotificationBell count={3} variant="dot" />);
    await expectNoA11yViolations(container);
  });
});
