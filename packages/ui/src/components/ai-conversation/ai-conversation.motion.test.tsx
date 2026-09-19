import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Conversation,
  ConversationMessages,
  ConversationScrollButton,
  ConversationStatus,
  type ConversationState,
} from "./ai-conversation";

function Example({ className }: { className?: string }) {
  return (
    <Conversation>
      <ConversationMessages>
        <li>One</li>
        <li>Two</li>
      </ConversationMessages>
      <ConversationScrollButton className={className} />
    </Conversation>
  );
}

function viewportOf(container: HTMLElement): HTMLElement {
  const viewport = container.querySelector<HTMLElement>("[data-slot='conversation-viewport']");
  if (!viewport) throw new Error("no viewport");
  return viewport;
}

function scrollAway(viewport: HTMLElement, scrollTop: number) {
  Object.defineProperty(viewport, "scrollHeight", { value: 1000, configurable: true });
  Object.defineProperty(viewport, "clientHeight", { value: 400, configurable: true });
  Object.defineProperty(viewport, "scrollTop", {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  fireEvent.scroll(viewport);
}

function stubReducedMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Conversation scrolling and reduced motion (regression)", () => {
  it("scrolls instantly when the reader prefers reduced motion", async () => {
    stubReducedMotion(true);
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const viewport = viewportOf(container);
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    scrollAway(viewport, 0);
    await user.click(await screen.findByRole("button", { name: "Jump to latest" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "auto" });
  });

  it("still scrolls smoothly when no reduction is asked for", async () => {
    stubReducedMotion(false);
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const viewport = viewportOf(container);
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    scrollAway(viewport, 0);
    await user.click(await screen.findByRole("button", { name: "Jump to latest" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });
  });

  it("falls back to scrollTop where Element.scrollTo does not exist", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const viewport = viewportOf(container);
    Object.defineProperty(viewport, "scrollTo", { value: undefined, configurable: true });

    scrollAway(viewport, 0);
    await user.click(await screen.findByRole("button", { name: "Jump to latest" }));

    expect(viewport.scrollTop).toBe(1000);
  });
});

describe("ConversationScrollButton motion", () => {
  it("is open while shown, then inert and closed while it leaves, then gone", async () => {
    const { container } = render(<Example />);
    const viewport = viewportOf(container);

    scrollAway(viewport, 0);
    const button = await screen.findByRole("button", { name: "Jump to latest" });
    expect(button).toHaveAttribute("data-state", "open");
    expect(button).not.toHaveAttribute("inert");

    scrollAway(viewport, 600);
    const leaving = container.querySelector("[data-slot='conversation-scroll-button']");
    expect(leaving).toHaveAttribute("data-state", "closed");
    expect(leaving).toHaveAttribute("inert");
    expect(leaving).toHaveAttribute("aria-hidden", "true");

    if (!leaving) throw new Error("no pill");
    fireEvent.animationEnd(leaving);
    expect(container.querySelector("[data-slot='conversation-scroll-button']")).toBeNull();
  });

  it("unmounts after a fallback delay when no animation reports ending", () => {
    vi.useFakeTimers();
    const { container } = render(<Example />);
    const viewport = viewportOf(container);

    scrollAway(viewport, 0);
    scrollAway(viewport, 600);
    expect(container.querySelector("[data-slot='conversation-scroll-button']")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(container.querySelector("[data-slot='conversation-scroll-button']")).toBeNull();
  });

  it("returns to open if the reader scrolls away again mid-exit", async () => {
    const { container } = render(<Example />);
    const viewport = viewportOf(container);

    scrollAway(viewport, 0);
    scrollAway(viewport, 600);
    scrollAway(viewport, 0);

    const button = await screen.findByRole("button", { name: "Jump to latest" });
    expect(button).toHaveAttribute("data-state", "open");
    expect(button).not.toHaveAttribute("inert");
  });

  it("ignores animation ends bubbling from its children", () => {
    const { container } = render(<Example />);
    const viewport = viewportOf(container);
    scrollAway(viewport, 0);
    scrollAway(viewport, 600);

    const icon = container.querySelector("[data-slot='conversation-scroll-button'] svg");
    if (!icon) throw new Error("no icon");
    fireEvent.animationEnd(icon);

    expect(container.querySelector("[data-slot='conversation-scroll-button']")).not.toBeNull();
  });

  it("forwards refs, as an object or a callback", async () => {
    const objectRef = createRef<HTMLButtonElement>();
    const callbackRef = vi.fn();
    const { container } = render(
      <Conversation>
        <ConversationScrollButton ref={objectRef} />
        <ConversationScrollButton ref={callbackRef} label="Latest" />
      </Conversation>,
    );
    scrollAway(viewportOf(container), 0);
    await screen.findByRole("button", { name: "Latest" });

    expect(objectRef.current).toBe(screen.getByRole("button", { name: "Jump to latest" }));
    expect(callbackRef).toHaveBeenCalledWith(screen.getByRole("button", { name: "Latest" }));
  });

  it("centres with logical properties and lets a className override win", async () => {
    const { container } = render(<Example className="bottom-8" />);
    scrollAway(viewportOf(container), 0);
    const button = await screen.findByRole("button", { name: "Jump to latest" });

    expect(button).toHaveClass("inset-x-0", "mx-auto", "w-fit", "bottom-8");
    expect(button).not.toHaveClass("bottom-3");
    expect(button.className).not.toMatch(/left-1\/2/);
  });

  it("ships its keyframes once, scaled by --motion-scale", async () => {
    const { container } = render(<Example />);
    scrollAway(viewportOf(container), 0);
    await screen.findByRole("button", { name: "Jump to latest" });

    const sheets = document.querySelectorAll("style[data-href='dowel-ai-conversation']");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.textContent).toContain("var(--motion-scale");
  });

  it("has no accessibility violations while shown", async () => {
    const { container } = render(<Example />);
    scrollAway(viewportOf(container), 0);
    await screen.findByRole("button", { name: "Jump to latest" });
    await expectNoA11yViolations(container);
  });
});

describe("ConversationStatus state", () => {
  it("renders default wording for a state", () => {
    render(<ConversationStatus state="streaming" />);
    expect(screen.getByRole("status")).toHaveTextContent("Generating response");
  });

  it.each<[ConversationState, string]>([
    ["listening", "Listening"],
    ["thinking", "Thinking"],
    ["done", "Response complete"],
    ["error", "Response failed"],
  ])("words %s as %s", (state, text) => {
    render(<ConversationStatus state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("renders nothing for idle, so first paint announces nothing", () => {
    render(<ConversationStatus state="idle" />);
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("lets children win over state", () => {
    render(<ConversationStatus state="streaming">Writing code</ConversationStatus>);
    expect(screen.getByRole("status")).toHaveTextContent("Writing code");
  });

  it("takes per-state label overrides", () => {
    render(<ConversationStatus state="done" stateLabels={{ done: "Finished" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Finished");
  });

  it("keeps the same live region node across state changes", () => {
    const { rerender } = render(<ConversationStatus state="idle" />);
    const before = screen.getByRole("status");
    rerender(<ConversationStatus state="streaming" />);
    rerender(<ConversationStatus state="done" />);
    const after = screen.getByRole("status");

    expect(after).toBe(before);
    expect(after).toHaveAttribute("aria-live", "polite");
    expect(after).toHaveTextContent("Response complete");
  });
});
