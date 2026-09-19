import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ScrambleText, scrambleFrame } from "./scramble-text";

function glyphs(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-slot="scramble-text-glyphs"]');
  if (!element) throw new Error("no glyphs");
  return element;
}

function root(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-slot="scramble-text"]');
  if (!element) throw new Error("no root");
  return element;
}

/** A device with a fine hover pointer, optionally asking for reduced motion. */
function mockMedia({ reduce = false, hover = true } = {}) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduced-motion") ? reduce : hover,
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

function hover(element: Element, pointerType = "mouse") {
  // jsdom's PointerEvent drops pointerType; a plain event carrying it is enough.
  const event = new Event("pointerenter", { bubbles: false });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => {
    element.dispatchEvent(event);
  });
}

function leave(element: Element) {
  act(() => {
    element.dispatchEvent(new Event("pointerleave"));
  });
}

beforeEach(() => {
  // Every random glyph is the last character, "?", so frames are predictable.
  vi.spyOn(Math, "random").mockReturnValue(0.999);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scrambleFrame", () => {
  it("keeps settled characters and whitespace, scrambling the rest", () => {
    expect(scrambleFrame("Hi there", 0)).toBe("?? ?????");
    expect(scrambleFrame("Hi there", 4)).toBe("Hi t????");
    expect(scrambleFrame("Hi there", 8)).toBe("Hi there");
    expect(scrambleFrame("abc", 1, "x")).toBe("axx");
  });
});

describe("ScrambleText", () => {
  it("renders the real text, readable once by assistive technology", () => {
    const { container } = render(<ScrambleText>Hover over this text!</ScrambleText>);
    expect(glyphs(container)).toHaveAttribute("aria-hidden", "true");
    expect(glyphs(container)).toHaveTextContent("Hover over this text!");
    expect(
      screen.getByText("Hover over this text!", { selector: ".sr-only" }),
    ).toBeInTheDocument();
    expect(root(container)).toHaveTextContent("Hover over this text!Hover over this text!");
  });

  it("renders the real text on the server, with no randomness", () => {
    const html = renderToString(<ScrambleText>Stable markup</ScrambleText>);
    expect(html).toContain('aria-hidden="true">Stable markup</span>');
    expect(Math.random).not.toHaveBeenCalled();
  });

  it("scrambles on hover, resolves from the start, and settles after the duration", () => {
    vi.useFakeTimers();
    mockMedia();
    const { container } = render(
      <ScrambleText duration={600} speed={30}>
        Watch this
      </ScrambleText>,
    );
    hover(root(container));
    expect(root(container)).toHaveAttribute("data-state", "scrambling");
    expect(glyphs(container)).toHaveTextContent("????? ????");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Halfway: the first five characters have resolved.
    expect(glyphs(container)).toHaveTextContent("Watch ????");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(glyphs(container)).toHaveTextContent("Watch this");
    expect(root(container)).toHaveAttribute("data-state", "idle");
    // The accessible copy never changed.
    expect(screen.getByText("Watch this", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("snaps back to the text when the pointer leaves", () => {
    vi.useFakeTimers();
    mockMedia();
    const { container } = render(<ScrambleText>Leave early</ScrambleText>);
    hover(root(container));
    expect(glyphs(container)).not.toHaveTextContent("Leave early");
    leave(root(container));
    expect(glyphs(container)).toHaveTextContent("Leave early");
    expect(root(container)).toHaveAttribute("data-state", "idle");
  });

  it("does not scramble for touch or on devices without hover", () => {
    mockMedia();
    const { container, unmount } = render(<ScrambleText>Touch</ScrambleText>);
    hover(root(container), "touch");
    expect(root(container)).toHaveAttribute("data-state", "idle");
    unmount();

    vi.restoreAllMocks();
    mockMedia({ hover: false });
    const second = render(<ScrambleText>Coarse</ScrambleText>);
    hover(root(second.container));
    expect(root(second.container)).toHaveAttribute("data-state", "idle");
  });

  it("does not scramble under reduced motion", () => {
    mockMedia({ reduce: true });
    const { container } = render(<ScrambleText trigger="mount">Calm</ScrambleText>);
    hover(root(container));
    expect(root(container)).toHaveAttribute("data-state", "idle");
    expect(glyphs(container)).toHaveTextContent("Calm");
  });

  it("scrambles on keyboard focus of the link that wraps it", async () => {
    mockMedia();
    const user = userEvent.setup();
    render(
      <a href="#docs">
        <ScrambleText>Read the docs</ScrambleText>
      </a>,
    );
    const link = screen.getByRole("link", { name: "Read the docs" });
    await user.tab();
    expect(link).toHaveFocus();
    expect(link.querySelector('[data-slot="scramble-text"]')).toHaveAttribute(
      "data-state",
      "scrambling",
    );
    await user.tab();
    expect(link.querySelector('[data-slot="scramble-text"]')).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("plays once on mount when asked", () => {
    vi.useFakeTimers();
    mockMedia();
    const { container } = render(<ScrambleText trigger="mount">Hello</ScrambleText>);
    expect(root(container)).toHaveAttribute("data-state", "scrambling");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(glyphs(container)).toHaveTextContent("Hello");
  });

  it("plays once the text scrolls into view", () => {
    mockMedia();
    let fire: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          fire = () => {
            callback(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
          };
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { container } = render(<ScrambleText trigger="in-view">Later</ScrambleText>);
    expect(root(container)).toHaveAttribute("data-state", "idle");
    act(() => fire?.());
    expect(root(container)).toHaveAttribute("data-state", "scrambling");
    expect(disconnect).toHaveBeenCalled();
  });

  it("plays at once for in-view when IntersectionObserver is unavailable", () => {
    mockMedia();
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<ScrambleText trigger="in-view">Now</ScrambleText>);
    expect(root(container)).toHaveAttribute("data-state", "scrambling");
  });

  it("clears its timers on unmount", () => {
    vi.useFakeTimers();
    mockMedia();
    const { container, unmount } = render(<ScrambleText>Bye</ScrambleText>);
    hover(root(container));
    expect(vi.getTimerCount()).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles on a new string mid-scramble", () => {
    vi.useFakeTimers();
    mockMedia();
    const { container, rerender } = render(<ScrambleText>First</ScrambleText>);
    hover(root(container));
    rerender(<ScrambleText>Second</ScrambleText>);
    expect(glyphs(container)).toHaveTextContent("Second");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the monospace variant when asked, and lets consumer classes win", () => {
    const { container } = render(
      <ScrambleText font="mono" className="font-sans">
        Mono
      </ScrambleText>,
    );
    expect(root(container)).toHaveClass("font-sans");
    expect(root(container)).not.toHaveClass("font-mono");
  });

  it("renders as the element asked for, named by the real text", () => {
    render(<ScrambleText as="h2">Section title</ScrambleText>);
    expect(
      screen.getByRole("heading", { level: 2, name: "Section title" }),
    ).toBeInTheDocument();
  });

  it("forwards its ref and native props", () => {
    const ref = createRef<HTMLElement>();
    const onClick = vi.fn();
    const { container } = render(
      <ScrambleText ref={ref} id="scramble" onClick={onClick}>
        Text
      </ScrambleText>,
    );
    expect(ref.current).toBe(root(container));
    expect(ref.current).toHaveAttribute("id", "scramble");
    fireEvent.click(root(container));
    expect(onClick).toHaveBeenCalled();
  });

  it("has no accessibility violations, mid-scramble included", async () => {
    mockMedia();
    const { container } = render(
      <div>
        <ScrambleText as="h1">Scramble Hover Examples</ScrambleText>
        <a href="#x">
          <ScrambleText>Hover over this text!</ScrambleText>
        </a>
      </div>,
    );
    hover(container.querySelectorAll('[data-slot="scramble-text"]')[0] as Element);
    await expectNoA11yViolations(container);
  });
});
