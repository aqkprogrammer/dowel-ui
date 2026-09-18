import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TypewriterText } from "./typewriter-text";

function part(container: HTMLElement, slot: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-slot="typewriter-text${slot}"]`);
  if (!element) throw new Error(`no typewriter-text${slot}`);
  return element;
}

/** The visibly typed characters: the typed span minus its invisible remainder. */
function typed(container: HTMLElement): string {
  const whole = part(container, "-typed").textContent;
  const rest = part(container, "-rest").textContent;
  return whole.slice(0, whole.length - rest.length);
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function mockReducedMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduced-motion"),
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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("TypewriterText", () => {
  it("exposes the full string once, never the partially typed one", () => {
    const { container } = render(<TypewriterText>Welcome to Dowel</TypewriterText>);
    expect(typed(container)).toBe("W");
    expect(part(container, "-typed")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Welcome to Dowel", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("renders the finished text on the server", () => {
    vi.useRealTimers();
    const html = renderToString(<TypewriterText>Server text</TypewriterText>);
    expect(html).toContain("Server text<span");
    expect(html).toContain('data-state="complete"');
  });

  it("types a character every `speed` milliseconds, then stops", () => {
    const { container } = render(<TypewriterText speed={100}>Hello</TypewriterText>);
    expect(part(container, "")).toHaveAttribute("data-state", "typing");
    advance(100);
    expect(typed(container)).toBe("He");
    advance(300);
    expect(typed(container)).toBe("Hello");
    expect(part(container, "")).toHaveAttribute("data-state", "complete");
    advance(5000);
    expect(typed(container)).toBe("Hello");
  });

  it("reserves the untyped remainder invisibly, so nothing reflows", () => {
    const { container } = render(<TypewriterText>Hello</TypewriterText>);
    expect(part(container, "-rest")).toHaveTextContent("ello");
    expect(part(container, "-rest")).toHaveClass("invisible");
  });

  it("retypes a single string after the pause when looping, as the source did", () => {
    const { container } = render(
      <TypewriterText loop speed={50}>
        Hey
      </TypewriterText>,
    );
    advance(100);
    expect(typed(container)).toBe("Hey");
    advance(999);
    expect(typed(container)).toBe("Hey");
    advance(1);
    expect(typed(container)).toBe("H");
  });

  it("types, holds, deletes and cycles through a list", () => {
    const { container } = render(
      <TypewriterText speed={100} deleteSpeed={50} pause={500}>
        {["ab", "cd"]}
      </TypewriterText>,
    );
    expect(typed(container)).toBe("a");
    advance(100);
    expect(typed(container)).toBe("ab");
    advance(500);
    // The first deletion lands as the pause ends.
    expect(typed(container)).toBe("a");
    advance(50);
    expect(typed(container)).toBe("");
    advance(50);
    advance(100);
    expect(typed(container)).toBe("c");
    advance(100);
    expect(typed(container)).toBe("cd");
    advance(500 + 50 + 50 + 100);
    // Lists loop by default: back to the first.
    expect(typed(container)).toBe("a");
  });

  it("stops on the last item of a list when loop is false", () => {
    const { container } = render(
      <TypewriterText loop={false} speed={10} pause={10}>
        {["a", "b"]}
      </TypewriterText>,
    );
    advance(1000);
    expect(typed(container)).toBe("b");
    expect(part(container, "")).toHaveAttribute("data-state", "complete");
  });

  it("names every item of a list for assistive technology", () => {
    render(<TypewriterText>{["Fast", "Accessible", "Typed"]}</TypewriterText>);
    expect(
      screen.getByText("Fast, Accessible, Typed", { selector: ".sr-only" }),
    ).toBeInTheDocument();
  });

  it("waits for startDelay before typing", () => {
    const { container } = render(<TypewriterText startDelay={400}>Go</TypewriterText>);
    expect(typed(container)).toBe("");
    advance(400);
    expect(typed(container)).toBe("G");
  });

  it("shows the full text at once under reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<TypewriterText loop>{["First", "Second"]}</TypewriterText>);
    expect(typed(container)).toBe("First");
    advance(10_000);
    expect(typed(container)).toBe("First");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the theme caret, in bar, block or none", () => {
    const { container, rerender } = render(<TypewriterText>Hi</TypewriterText>);
    expect(part(container, "-caret")).toHaveClass("animate-caret", "w-0.5");
    rerender(<TypewriterText caret="block">Hi</TypewriterText>);
    expect(part(container, "-caret")).toHaveClass("animate-caret", "w-[0.55em]");
    rerender(<TypewriterText caret="none">Hi</TypewriterText>);
    expect(part(container, "-caret")).toHaveClass("hidden");
    // Decoration: the reduced-motion blanket stops the blink.
    expect(part(container, "-caret")).not.toHaveAttribute("data-motion");
  });

  it("restarts when the text changes, and clears its timer on unmount", () => {
    const { container, rerender, unmount } = render(<TypewriterText>One</TypewriterText>);
    advance(100);
    rerender(<TypewriterText>Two</TypewriterText>);
    expect(typed(container)).toBe("T");
    // A new array with the same strings does not restart.
    rerender(<TypewriterText>{["Two"]}</TypewriterText>);
    advance(50);
    expect(typed(container)).toBe("Tw");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders as the element asked for", () => {
    render(<TypewriterText as="h1">Headline</TypewriterText>);
    expect(screen.getByRole("heading", { level: 1, name: "Headline" })).toBeInTheDocument();
  });

  it("merges className, forwards its ref and native props", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <TypewriterText ref={ref} className="text-lg" id="tw">
        Hi
      </TypewriterText>,
    );
    expect(ref.current).toBe(part(container, ""));
    expect(ref.current).toHaveClass("text-lg");
    expect(ref.current).toHaveAttribute("id", "tw");
  });

  it("has no accessibility violations", async () => {
    vi.useRealTimers();
    const { container } = render(
      <div>
        <TypewriterText as="p">Welcome to Dowel! This is a typewriter effect.</TypewriterText>
        <TypewriterText>{["Fast", "Accessible"]}</TypewriterText>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
