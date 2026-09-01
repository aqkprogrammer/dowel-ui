import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ActivityContent,
  ActivityDescription,
  ActivityFeed,
  ActivityIndicator,
  ActivityItem,
  ActivityTime,
  ActivityTitle,
} from "./activity-feed";

const EVENTS = [
  { id: "1", title: "Deployed to production", at: "2026-09-01T09:00:00Z" },
  { id: "2", title: "Opened a pull request", at: "2026-08-31T17:20:00Z" },
  { id: "3", title: "Created the project", at: "2026-08-30T11:05:00Z" },
];

function Example() {
  return (
    <ActivityFeed>
      {EVENTS.map((event, index) => (
        <ActivityItem key={event.id} last={index === EVENTS.length - 1}>
          <ActivityIndicator>
            <svg />
          </ActivityIndicator>
          <ActivityContent>
            <ActivityTitle>{event.title}</ActivityTitle>
            <ActivityTime dateTime={event.at}>Recently</ActivityTime>
          </ActivityContent>
        </ActivityItem>
      ))}
    </ActivityFeed>
  );
}

describe("ActivityFeed", () => {
  it("renders an ordered list, so position and count are announced", () => {
    render(<Example />);
    expect(screen.getByRole("list").tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders each event", () => {
    render(<Example />);
    for (const event of EVENTS) {
      expect(screen.getByText(event.title)).toBeInTheDocument();
    }
  });

  it("hides the indicator from assistive technology", () => {
    const { container } = render(<Example />);
    for (const indicator of container.querySelectorAll("[data-slot='activity-indicator']")) {
      expect(indicator).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("carries a machine-readable timestamp", () => {
    const { container } = render(<Example />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-09-01T09:00:00Z");
  });

  it("marks the last item so no rail is drawn past it", () => {
    const { container } = render(<Example />);
    const items = container.querySelectorAll("[data-slot='activity-item']");
    expect(items[items.length - 1]).toHaveAttribute("data-last", "true");
    expect(items[0]).not.toHaveAttribute("data-last");
  });

  it("renders the indicator as another element with asChild", () => {
    render(
      <ActivityFeed>
        <ActivityItem>
          <ActivityIndicator asChild>
            <span data-testid="custom">A</span>
          </ActivityIndicator>
          <ActivityContent>
            <ActivityTitle>Event</ActivityTitle>
          </ActivityContent>
        </ActivityItem>
      </ActivityFeed>,
    );
    expect(screen.getByTestId("custom")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a description when given one", () => {
    render(
      <ActivityFeed>
        <ActivityItem last>
          <ActivityIndicator />
          <ActivityContent>
            <ActivityTitle>Deployed</ActivityTitle>
            <ActivityDescription>Build 1420 is live.</ActivityDescription>
          </ActivityContent>
        </ActivityItem>
      </ActivityFeed>,
    );
    expect(screen.getByText("Build 1420 is live.")).toBeInTheDocument();
  });

  it("lets a consumer className override a conflicting utility", () => {
    const { container } = render(
      <ActivityFeed className="gap-4">
        <ActivityItem last className="pb-0">
          <ActivityIndicator />
          <ActivityContent>
            <ActivityTitle>Event</ActivityTitle>
          </ActivityContent>
        </ActivityItem>
      </ActivityFeed>,
    );

    const item = container.querySelector("[data-slot='activity-item']");
    expect(item).toHaveClass("pb-0");
    expect(item).not.toHaveClass("pb-6");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
