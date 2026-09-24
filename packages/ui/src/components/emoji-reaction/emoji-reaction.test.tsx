import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { EmojiReaction, type EmojiReactionProps } from "./emoji-reaction";

function trigger() {
  return screen.getByRole("button", { name: /^React/ });
}

function bar() {
  return screen.getByRole("toolbar", { name: "Reactions" });
}

function queryBar() {
  return screen.queryByRole("toolbar");
}

function item(name: string) {
  return screen.getByRole("button", { name });
}

function particles() {
  return document.querySelectorAll('[data-slot="emoji-reaction-particle"]');
}

function layer(slot: string) {
  return document.querySelector(`[data-slot="emoji-reaction-${slot}"]`);
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

/**
 * Ends an animation by name. jsdom has no AnimationEvent, so the name is set on
 * a plain event — and without it React listens for the WebKit-prefixed event
 * instead, so both names are sent.
 */
function ended(element: Element, animationName: string) {
  for (const type of ["animationend", "webkitAnimationEnd"]) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "animationName", { value: animationName });
    fireEvent(element, event);
  }
}

function setup(props: Partial<EmojiReactionProps> = {}) {
  const onReact = vi.fn();
  const onValueChange = vi.fn();
  const utils = render(
    <EmojiReaction onReact={onReact} onValueChange={onValueChange} {...props} />,
  );
  return { ...utils, onReact, onValueChange };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EmojiReaction", () => {
  it("renders a closed disclosure trigger showing a smiley", () => {
    setup();
    const button = trigger();
    expect(button).toHaveAccessibleName("React");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).not.toHaveAttribute("aria-haspopup");
    expect(button).toHaveAttribute("data-slot", "emoji-reaction");
    expect(layer("icon")).toHaveAttribute("data-state", "visible");
    expect(queryBar()).toBeNull();
  });

  it("opens a toolbar of the default emoji from a click, keeping focus on the trigger", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    expect(bar()).toHaveAttribute("aria-orientation", "horizontal");
    expect(bar()).toHaveAttribute("data-side", "top");
    expect(
      ["Thumbs up", "Heart", "Laughing", "Surprised", "Sad"].map(
        (name) => item(name).textContent,
      ),
    ).toEqual(["👍", "❤️", "😂", "😮", "😢"]);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", bar().id);
    expect(trigger()).toHaveFocus();
    expect(layer("close")).toHaveAttribute("data-state", "visible");
    expect(layer("icon")).toHaveAttribute("data-state", "hidden");
  });

  it("picks an emoji: reacts, remembers it, and floats copies up", async () => {
    const user = userEvent.setup();
    const { onReact, onValueChange } = setup();
    await user.click(trigger());
    await user.click(item("Heart"));

    expect(onReact).toHaveBeenCalledWith("❤️");
    expect(onValueChange).toHaveBeenCalledWith("❤️");
    expect(item("Heart")).toHaveAttribute("aria-current", "true");
    expect(bar()).toBeInTheDocument();
    expect(particles()).toHaveLength(5);
    const layerRoot = document.querySelector('[data-slot="emoji-reaction-particles"]');
    expect(layerRoot).toHaveAttribute("aria-hidden", "true");
    expect(layerRoot?.parentElement).toBe(document.body);

    // Picking it again reacts again, but the value has not changed.
    await user.click(item("Heart"));
    expect(onReact).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(particles()).toHaveLength(10);

    await user.click(trigger());
    expect(queryBar()).toBeNull();
    expect(trigger()).toHaveAccessibleName("React, Heart");
    expect(layer("value")).toHaveAttribute("data-state", "visible");
    expect(layer("value")).toHaveTextContent("❤️");
  });

  it("removes a copy when its animation ends", async () => {
    const user = userEvent.setup();
    setup({ defaultOpen: true });
    await user.click(item("Laughing"));
    const copy = (particles()[0] as HTMLElement).firstElementChild as HTMLElement;
    ended(copy, "dowel-emoji-reaction-rise");
    expect(particles()).toHaveLength(5);
    ended(copy, "dowel-emoji-reaction-drift");
    expect(particles()).toHaveLength(4);
  });

  it("makes no copies under reduced motion", async () => {
    reduceMotion();
    const user = userEvent.setup();
    const { onReact } = setup({ defaultOpen: true });
    await user.click(item("Sad"));
    expect(onReact).toHaveBeenCalledWith("😢");
    expect(particles()).toHaveLength(0);
  });

  it("keeps reacting while an emoji is held, and not again on release", () => {
    vi.useFakeTimers();
    const { onReact, onValueChange } = setup({ defaultOpen: true });
    const heart = item("Heart");

    fireEvent.pointerDown(heart, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onReact).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(onReact).toHaveBeenCalledOnce();
    act(() => {
      vi.advanceTimersByTime(440);
    });
    expect(onReact).toHaveBeenCalledTimes(3);
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(particles()).toHaveLength(5 + 3 + 3);

    fireEvent.pointerUp(heart);
    fireEvent.click(heart, { detail: 1 });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onReact).toHaveBeenCalledTimes(3);

    // The next plain click is a pick again.
    fireEvent.pointerDown(heart, { button: 0 });
    fireEvent.pointerUp(heart);
    fireEvent.click(heart, { detail: 1 });
    expect(onReact).toHaveBeenCalledTimes(4);
  });

  it("abandons a hold when the pointer slides off", () => {
    vi.useFakeTimers();
    const { onReact } = setup({ defaultOpen: true });
    fireEvent.pointerDown(item("Heart"), { button: 0 });
    fireEvent.pointerLeave(item("Heart"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onReact).not.toHaveBeenCalled();
  });

  it("picks in one gesture: press the trigger, drag onto an emoji, release", () => {
    const { onReact } = setup();
    const button = trigger();
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    expect(bar()).toBeInTheDocument();

    const surprised = item("Surprised");
    vi.spyOn(surprised, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 40, width: 40, height: 40 }),
    );
    fireEvent.pointerMove(button, { clientX: 60, clientY: 60 });
    expect(surprised).not.toHaveAttribute("data-hot");
    fireEvent.pointerMove(button, { clientX: 120, clientY: 60 });
    expect(surprised).toHaveAttribute("data-hot");

    fireEvent.pointerUp(button, { clientX: 120, clientY: 60 });
    fireEvent.click(button, { detail: 1 });
    expect(onReact).toHaveBeenCalledWith("😮");
    expect(surprised).not.toHaveAttribute("data-hot");
    expect(bar()).toBeInTheDocument();
  });

  it("releasing a drag anywhere else just leaves the bar open", () => {
    const { onReact } = setup();
    fireEvent.pointerDown(trigger(), { button: 0 });
    fireEvent.pointerMove(trigger(), { clientX: 500, clientY: 500 });
    fireEvent.pointerCancel(trigger());
    fireEvent.pointerUp(trigger(), { clientX: 500, clientY: 500 });
    expect(onReact).not.toHaveBeenCalled();
    expect(bar()).toBeInTheDocument();
  });

  it("opens from the keyboard into the bar and moves along it with arrows", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Thumbs up")).toHaveFocus();
    });
    expect(item("Thumbs up")).toHaveAttribute("tabindex", "0");
    expect(item("Heart")).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowRight}");
    expect(item("Heart")).toHaveFocus();
    expect(item("Heart")).toHaveAttribute("tabindex", "0");
    await user.keyboard("{End}");
    expect(item("Sad")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Thumbs up")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Sad")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Thumbs up")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(item("Thumbs up")).toHaveAttribute("aria-current", "true");
  });

  it("mirrors the arrow keys right to left", async () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
      const style = real(element, pseudo);
      return new Proxy(style, {
        get: (target, key): unknown =>
          key === "direction" ? "rtl" : (Reflect.get(target, key) as unknown),
      });
    });
    const user = userEvent.setup();
    setup({ defaultOpen: true });
    item("Heart").focus();
    await user.keyboard("{ArrowRight}");
    expect(item("Thumbs up")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Heart")).toHaveFocus();
  });

  it("opens from ArrowUp on the trigger, and ArrowDown moves into an open bar", async () => {
    const user = userEvent.setup();
    setup({ defaultValue: "😂" });
    await user.tab();
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(item("Laughing")).toHaveFocus();
    });
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(item("Laughing")).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Thumbs up")).toHaveFocus();
    });
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(queryBar()).toBeNull();
    });
    await waitFor(() => {
      expect(trigger()).toHaveFocus();
    });
  });

  it("closes on an outside click without stranding focus", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <EmojiReaction />
        <p>Elsewhere</p>
      </div>,
    );
    await user.click(trigger());
    expect(bar()).toBeInTheDocument();
    await user.click(screen.getByText("Elsewhere"));
    await waitFor(() => {
      expect(queryBar()).toBeNull();
    });
    await waitFor(() => {
      expect(trigger()).toHaveFocus();
    });
  });

  it("leaves focus where an outside click put it", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <EmojiReaction />
        <input aria-label="Reply" />
      </div>,
    );
    await user.click(trigger());
    await user.click(screen.getByRole("textbox"));
    await waitFor(() => {
      expect(queryBar()).toBeNull();
    });
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("closes when Tab leaves the bar, carrying on from the trigger", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <EmojiReaction />
        <button type="button">After</button>
      </div>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Thumbs up")).toHaveFocus();
    });
    await user.tab();
    await waitFor(() => {
      expect(queryBar()).toBeNull();
    });
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: "😂", defaultOpen: true });
    expect(trigger()).toHaveAccessibleName("React, Laughing");
    expect(item("Laughing")).toHaveAttribute("aria-current", "true");
    await user.click(item("Sad"));
    expect(onValueChange).toHaveBeenCalledWith("😢");
    expect(item("Laughing")).toHaveAttribute("aria-current", "true");
  });

  it("follows a controlled open state, and can close itself from onReact", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Show reactions
          </button>
          <EmojiReaction
            open={open}
            onOpenChange={setOpen}
            onReact={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Show reactions" }));
    expect(bar()).toBeInTheDocument();
    await user.click(item("Thumbs up"));
    await waitFor(() => {
      expect(queryBar()).toBeNull();
    });
  });

  it("takes emoji as strings named through labels, or as objects", () => {
    setup({
      defaultOpen: true,
      emojis: ["🎉", { emoji: "🔥", label: "Fire" }, "🚀"],
      labels: { "🎉": "Party" },
    });
    expect(item("Party")).toHaveTextContent("🎉");
    expect(item("Fire")).toHaveTextContent("🔥");
    expect(item("🚀")).toBeInTheDocument();
    expect(bar().querySelectorAll("button")).toHaveLength(3);
  });

  it("uses a consumer element as the trigger with asChild", async () => {
    const user = userEvent.setup();
    render(
      <EmojiReaction asChild className="rounded-lg">
        <button type="button">Message from Ada: see you at noon</button>
      </EmojiReaction>,
    );
    const message = screen.getByRole("button", { name: "Message from Ada: see you at noon" });
    expect(message).toHaveAttribute("data-slot", "emoji-reaction");
    expect(message).toHaveAttribute("aria-expanded", "false");
    expect(message).toHaveClass("rounded-lg");
    expect(message).not.toHaveClass("bg-card");
    await user.click(message);
    expect(bar()).toBeInTheDocument();
  });

  it.each([
    ["sm", "size-8", "text-lg"],
    ["md", "size-10", "text-2xl"],
    ["lg", "size-12", "text-3xl"],
  ] as const)("scales trigger and bar together at %s", (size, triggerSize, emojiSize) => {
    setup({ size, defaultOpen: true });
    expect(trigger()).toHaveClass(triggerSize);
    expect(item("Heart")).toHaveClass(emojiSize);
  });

  it("aligns the bar", () => {
    setup({ align: "end", defaultOpen: true });
    expect(bar()).toHaveAttribute("data-align", "end");
  });

  it("does not open while disabled", async () => {
    const user = userEvent.setup();
    setup({ disabled: true });
    await user.click(trigger());
    fireEvent.pointerDown(trigger(), { button: 0 });
    expect(queryBar()).toBeNull();
    expect(trigger()).toBeDisabled();
  });

  it("calls the consumer's handlers and respects a prevented press", () => {
    const onPointerDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    setup({ onPointerDown, onClick, onKeyDown });
    fireEvent.pointerDown(trigger(), { button: 0 });
    fireEvent.click(trigger(), { detail: 1 });
    fireEvent.keyDown(trigger(), { key: "x" });
    expect(onPointerDown).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(queryBar()).toBeNull();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <EmojiReaction
        ref={ref}
        className="size-14 bg-primary"
        barClassName="gap-3"
        data-testid="reaction"
        aria-describedby="hint"
        defaultOpen
      />,
    );
    const button = screen.getByTestId("reaction");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("size-14", "bg-primary");
    expect(button).not.toHaveClass("size-10", "bg-card");
    expect(button).toHaveAttribute("aria-describedby", "hint");
    expect(bar()).toHaveClass("gap-3");
    expect(bar()).not.toHaveClass("gap-1", "w-72");
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { baseElement } = setup({ defaultValue: "👍" });
    await expectNoA11yViolations(baseElement);
    await user.click(trigger());
    await user.click(item("Heart"));
    await expectNoA11yViolations(baseElement);
  });
});
