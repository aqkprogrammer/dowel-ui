import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NotificationList, type NotificationListItem } from "./notification-list";

const ITEMS: NotificationListItem[] = [
  {
    id: "1",
    title: "Ada approved your PR",
    body: "feat: notification list",
    time: "2m",
    icon: <svg data-testid="ada" />,
  },
  { id: "2", title: "Deploy finished", body: "Production is live", time: "10m" },
  { id: "3", title: "Grace commented", time: "1h" },
  { id: "4", title: "Weekly digest" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
// jsdom lays nothing out; layout animations need a real box to finish.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 320, height: 64 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

function toggle() {
  return screen.getByRole("button", { name: /^Notifications, \d+$/ });
}

function rows() {
  return within(screen.getByRole("list", { name: "Notifications" })).getAllByRole("listitem");
}

describe("NotificationList", () => {
  it("renders a named region and list of every notification, collapsed", () => {
    render(<NotificationList defaultItems={ITEMS} />);
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveAttribute(
      "data-state",
      "closed",
    );
    expect(rows()).toHaveLength(4);
    expect(toggle()).toHaveAccessibleName("Notifications, 4");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveAttribute(
      "aria-controls",
      screen.getByRole("list", { name: "Notifications" }).id,
    );
    // Cards behind the top one are stacked.
    const [first, second] = rows();
    expect(first).not.toHaveAttribute("data-stacked");
    expect(second).toHaveAttribute("data-stacked");
    expect(second).toHaveClass("absolute");
    // The deepest card is out of the deck.
    expect(rows()[3]).toHaveClass("pointer-events-none");
    expect(screen.getByTestId("ada").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("fans out from the toggle and folds back with it", async () => {
    const user = userEvent.setup();
    render(<NotificationList defaultItems={ITEMS} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(rows()[1]).not.toHaveAttribute("data-stacked");
    expect(rows()[3]).not.toHaveClass("pointer-events-none");
    await user.keyboard(" ");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("folds a hover-opened deck when the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<NotificationList defaultItems={ITEMS} />);
    // Moving the mouse onto the toggle has already fanned the deck out.
    await user.hover(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("fans out on mouse hover only, and folds on leave", () => {
    render(<NotificationList defaultItems={ITEMS} />);
    const region = screen.getByRole("region");
    fireEvent.pointerEnter(region, { pointerType: "touch" });
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerLeave(region, { pointerType: "mouse" });
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("fans out when focus moves into the list and folds on Escape", async () => {
    const user = userEvent.setup();
    render(<NotificationList defaultItems={ITEMS} />);
    await user.tab();
    expect(toggle()).toHaveFocus();
    // The toggle itself is a plain disclosure: focusing it opens nothing.
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(screen.getByRole("button", { name: "Dismiss Ada approved your PR" })).toHaveFocus();
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    // It stays folded until focus leaves and comes back.
    await user.tab();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens again once focus leaves and returns", async () => {
    const user = userEvent.setup();
    render(
      <>
        <NotificationList defaultItems={ITEMS.slice(0, 1)} />
        <button type="button">Outside</button>
      </>,
    );
    await user.tab();
    await user.tab();
    await user.keyboard("{Escape}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("dismisses a card, moves focus on and announces it", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<NotificationList defaultItems={ITEMS} defaultExpanded onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Dismiss Deploy finished" }));
    expect(onDismiss).toHaveBeenCalledWith("2", ITEMS[1]);
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.queryByText("Deploy finished")).toBeNull();
    expect(screen.getByRole("button", { name: "Dismiss Grace commented" })).toHaveFocus();
    expect(toggle()).toHaveAccessibleName("Notifications, 3");
    expect(screen.getByRole("status")).toHaveTextContent("Dismissed Deploy finished");
  });

  it("moves focus to the previous card, then the toggle, as the list empties", async () => {
    const user = userEvent.setup();
    render(<NotificationList defaultItems={ITEMS.slice(0, 2)} defaultExpanded />);
    await user.click(screen.getByRole("button", { name: "Dismiss Deploy finished" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Dismiss Ada approved your PR" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{Enter}");
    await waitFor(() => expect(toggle()).toHaveFocus());
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(toggle()).toHaveAccessibleName("Notifications, 0");
  });

  it("leaves focus alone when the dismissed card did not have it", () => {
    render(<NotificationList defaultItems={ITEMS} defaultExpanded />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Weekly digest" }));
    expect(document.body).toHaveFocus();
  });

  it("works controlled", async () => {
    function Controlled() {
      const [items, setItems] = useState(ITEMS);
      return (
        <NotificationList
          items={items}
          defaultExpanded
          onDismiss={(id) => {
            setItems((current) => current.filter((item) => item.id !== id));
          }}
        />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Dismiss Grace commented" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
  });

  it("only requests a dismissal when controlled", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<NotificationList items={ITEMS} defaultExpanded onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Dismiss Grace commented" }));
    expect(onDismiss).toHaveBeenCalledWith("3", ITEMS[2]);
    expect(rows()).toHaveLength(4);
  });

  it("makes the top card draggable, and every card once open", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NotificationList defaultItems={ITEMS} />);
    expect(rows()[0]?.getAttribute("draggable")).not.toBe("true");
    await user.click(toggle());
    rerender(<NotificationList defaultItems={ITEMS} swipeToDismiss={false} />);
    expect(rows()).toHaveLength(4);
  });

  it("takes custom labels and messages", async () => {
    const user = userEvent.setup();
    render(
      <NotificationList
        defaultItems={ITEMS.slice(0, 1)}
        defaultExpanded
        label="Inbox"
        dismissLabel={(item) => `Clear ${item.title}`}
        announceDismiss={(item) => `${item.title} cleared`}
        emptyMessage="Nothing new"
      />,
    );
    expect(screen.getByRole("region", { name: "Inbox" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear Ada approved your PR" }));
    await waitFor(() => expect(screen.getByText("Nothing new")).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Ada approved your PR cleared");
  });

  it("shows a shallower deck with a smaller depth", () => {
    render(<NotificationList defaultItems={ITEMS} depth={2} />);
    expect(rows()[2]).toHaveClass("pointer-events-none");
    expect(rows()[1]).not.toHaveClass("pointer-events-none");
  });

  it("applies each variant", () => {
    const { rerender } = render(<NotificationList defaultItems={ITEMS} variant="card" />);
    expect(screen.getByRole("region")).toHaveClass("border");
    rerender(<NotificationList defaultItems={ITEMS} variant="plain" />);
    expect(screen.getByRole("region")).not.toHaveClass("border");
  });

  it("lets a consumer className win", () => {
    render(<NotificationList defaultItems={ITEMS} className="p-8" />);
    expect(screen.getByRole("region")).toHaveClass("p-8");
    expect(screen.getByRole("region")).not.toHaveClass("p-3");
  });

  it("forwards its ref, spreads props and chains handlers", () => {
    const ref = createRef<HTMLElement>();
    const onPointerEnter = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <NotificationList
        ref={ref}
        defaultItems={ITEMS}
        id="inbox"
        onPointerEnter={onPointerEnter}
        onKeyDown={onKeyDown}
      />,
    );
    expect(ref.current).toHaveAttribute("id", "inbox");
    expect(ref.current).toHaveAttribute("data-slot", "notification-list");
    fireEvent.pointerEnter(ref.current as HTMLElement, { pointerType: "mouse" });
    expect(onPointerEnter).toHaveBeenCalled();
    fireEvent.keyDown(ref.current as HTMLElement, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalled();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("dismisses toward the start in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <NotificationList defaultItems={ITEMS} defaultExpanded />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Dismiss Weekly digest" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
  });

  it("has no accessibility violations, collapsed or open", async () => {
    const { container, rerender } = render(<NotificationList defaultItems={ITEMS} />);
    await expectNoA11yViolations(container);
    rerender(<NotificationList defaultItems={ITEMS} defaultExpanded />);
    await expectNoA11yViolations(container);
  });
});
