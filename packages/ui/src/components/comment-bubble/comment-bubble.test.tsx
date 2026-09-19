import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  CommentBubble,
  type CommentBubbleComment,
  type CommentBubbleProps,
} from "./comment-bubble";

const THREAD: CommentBubbleComment[] = [
  {
    id: "1",
    author: { name: "Edu Calvo", avatarUrl: "/edu.jpg" },
    timestamp: "Just now",
    message: "What happens if we adjust this for dark mode?",
  },
  { id: "2", author: { name: "Sam Lee" }, message: "On it." },
];

function Example(props: Partial<CommentBubbleProps>) {
  return (
    <>
      <CommentBubble comments={THREAD} {...props} />
      <button type="button">Outside</button>
    </>
  );
}

function surface() {
  return document.querySelector<HTMLElement>('[data-slot="comment-bubble-surface"]')!;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CommentBubble", () => {
  it("renders a collapsed avatar disclosure with a hidden, inert thread", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Comment by Edu Calvo, 1 reply" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const thread = document.getElementById(trigger.getAttribute("aria-controls")!);
    expect(thread).toHaveAttribute("inert");
    expect(surface()).toHaveStyle({ width: "32px", height: "32px" });
    expect(screen.getByText("EC")).toBeInTheDocument();
  });

  it("expands on click to show the thread, and collapses again", async () => {
    const user = userEvent.setup();
    render(<Example width={200} />);
    const trigger = screen.getByRole("button", { name: /Comment by Edu Calvo/ });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const group = screen.getByRole("group", { name: "Comment thread by Edu Calvo" });
    expect(group).not.toHaveAttribute("inert");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(group).toHaveTextContent("Just now");
    expect(surface()).toHaveStyle({ width: "200px" });
    expect(surface().style.height).toBe("auto");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens from the keyboard, collapses on Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(<Example onReply={() => undefined} />);
    const trigger = screen.getByRole("button", { name: /Comment by/ });
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Reply" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses on an outside press but not an inside one", async () => {
    const user = userEvent.setup();
    render(<Example defaultOpen />);
    await user.click(screen.getByText("On it."));
    expect(surface()).toHaveAttribute("data-state", "open");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(surface()).toHaveAttribute("data-state", "closed");
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
  });

  it("sends trimmed replies and ignores empty ones", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<Example defaultOpen onReply={onReply} replyLabel="Answer" />);
    const field = screen.getByRole("textbox", { name: "Answer" });
    await user.click(screen.getByRole("button", { name: "Send reply" }));
    expect(onReply).not.toHaveBeenCalled();
    await user.type(field, "  Looks good {Enter}");
    expect(onReply).toHaveBeenCalledWith("Looks good");
    expect(field).toHaveValue("");
  });

  it("supports controlled state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: /Comment by/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(surface()).toHaveAttribute("data-state", "closed");
    rerender(<Example open onOpenChange={onOpenChange} />);
    expect(surface()).toHaveAttribute("data-state", "open");
  });

  it("uses the measured thread height", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(88);
    const callbacks: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Example defaultOpen />);
    act(() => callbacks.forEach((callback) => callback()));
    expect(surface()).toHaveStyle({ height: "88px" });
  });

  it("names a single comment without replies, and renders nothing for an empty thread", () => {
    const { rerender, container } = render(<CommentBubble comments={[THREAD[0]!]} />);
    expect(screen.getByRole("button", { name: "Comment by Edu Calvo" })).toBeInTheDocument();
    rerender(
      <CommentBubble
        comments={[...THREAD, { id: "3", author: { name: "Al" }, message: "+1" }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Comment by Edu Calvo, 2 replies" }),
    ).toBeInTheDocument();
    rerender(<CommentBubble comments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("forwards ref and props, and lets className win", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CommentBubble ref={ref} comments={THREAD} id="pin" className="size-10" />);
    expect(ref.current).toHaveAttribute("id", "pin");
    expect(ref.current).toHaveClass("size-10");
    expect(ref.current).not.toHaveClass("size-8");
  });

  it("has no accessibility violations, closed or open", async () => {
    const { container, rerender } = render(<CommentBubble comments={THREAD} />);
    await expectNoA11yViolations(container);
    rerender(<CommentBubble comments={THREAD} open onReply={() => undefined} />);
    await expectNoA11yViolations(container);
  });
});
