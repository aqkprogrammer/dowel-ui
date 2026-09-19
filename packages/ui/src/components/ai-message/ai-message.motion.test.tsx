import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Message,
  MessageActions,
  MessageBody,
  MessageFooter,
  MessageTimestamp,
} from "./ai-message";

function Turn({ from = "assistant" as const }: { from?: "assistant" | "user" }) {
  return (
    <Message from={from}>
      <MessageBody from={from}>
        Hello
        <MessageFooter>
          <MessageTimestamp dateTime="2026-09-19T09:30:00Z">09:30</MessageTimestamp>
          <MessageActions>
            <button type="button">Copy</button>
            <button type="button">Retry</button>
          </MessageActions>
        </MessageFooter>
      </MessageBody>
    </Message>
  );
}

describe("MessageActions motion", () => {
  it("slides out of the bubble's edge through a custom property, with no stagger overrides", () => {
    const { container } = render(
      <ol>
        <Turn />
      </ol>,
    );
    const actions = container.querySelector("[data-slot='message-actions']");
    expect(actions).toHaveClass(
      "translate-x-(--dowel-message-slide)",
      "scale-90",
      "opacity-0",
      "group-hover/message:translate-x-0",
      "group-focus-within/message:opacity-100",
    );

    const sheet = document.querySelector("style[data-href='dowel-ai-message']")?.textContent;
    expect(sheet).toContain("[data-slot=message-actions]{--dowel-message-slide:-6px}");
    expect(sheet).toContain(
      "[data-from=user] [data-slot=message-actions]{--dowel-message-slide:6px}",
    );
    // RTL flips the direction for both speakers.
    expect(sheet).toContain("[data-slot=message-actions]:dir(rtl){--dowel-message-slide:6px}");
    expect(sheet).toContain(
      "[data-from=user] [data-slot=message-actions]:dir(rtl){--dowel-message-slide:-6px}",
    );
  });

  it("is always visible on devices that cannot hover", () => {
    const { container } = render(
      <ol>
        <Turn />
      </ol>,
    );
    expect(container.querySelector("[data-slot='message-actions']")).toHaveClass(
      "[@media(hover:none)]:opacity-100",
      "[@media(hover:none)]:translate-x-0",
      "[@media(hover:none)]:scale-100",
    );
  });

  it("emits one stylesheet for many messages", () => {
    render(
      <ol>
        <Turn />
        <Turn from="user" />
        <Turn />
      </ol>,
    );
    expect(document.querySelectorAll("style[data-href='dowel-ai-message']")).toHaveLength(1);
  });

  it("is reached by Tab, which is what reveals it", async () => {
    const user = userEvent.setup();
    render(
      <ol>
        <Turn />
      </ol>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
  });

  it("lets a consumer className win", () => {
    const { container } = render(
      <ol>
        <Message>
          <MessageActions className="scale-100 opacity-100" />
        </Message>
      </ol>,
    );
    const actions = container.querySelector("[data-slot='message-actions']");
    expect(actions).toHaveClass("opacity-100", "scale-100");
    expect(actions).not.toHaveClass("opacity-0");
    expect(actions).not.toHaveClass("scale-90");
  });
});

describe("MessageTimestamp", () => {
  it("renders a <time> with dateTime and a data-slot", () => {
    render(
      <ol>
        <Turn />
      </ol>,
    );
    const time = screen.getByText("09:30");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-09-19T09:30:00Z");
    expect(time).toHaveAttribute("data-slot", "message-timestamp");
    expect(time).toHaveClass("tabular-nums");
  });

  it("forwards its ref and merges a className", () => {
    const ref = createRef<HTMLTimeElement>();
    render(
      <MessageTimestamp ref={ref} className="text-sm">
        now
      </MessageTimestamp>,
    );
    expect(ref.current).toBe(screen.getByText("now"));
    expect(ref.current).toHaveClass("text-sm");
    expect(ref.current).not.toHaveClass("text-xs");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ol>
        <Turn />
        <Turn from="user" />
      </ol>,
    );
    await expectNoA11yViolations(container);
  });
});
