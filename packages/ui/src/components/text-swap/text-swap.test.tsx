import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TextRotate } from "./text-rotate";
import { TextSwap, textSwapTransitionNames, type TextSwapTransition } from "./text-swap";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function root(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('[data-slot="text-swap"]')!;
}

function layers(container: HTMLElement, state?: "enter" | "exit" | "idle"): HTMLElement[] {
  const selector = state
    ? `[data-slot="text-swap-layer"][data-state="${state}"]`
    : '[data-slot="text-swap-layer"]';
  return [...container.querySelectorAll<HTMLElement>(selector)];
}

/** Every element carrying an animation, with its keyframe name. */
function animated(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[style]")].filter((node) =>
    node.style.animationName.startsWith("dowel-text-swap-"),
  );
}

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("TextSwap", () => {
  it("renders the value as accessible text, without animating the first render", () => {
    const { container } = render(<TextSwap>Ship faster.</TextSwap>);
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();
    expect(layers(container)).toHaveLength(1);
    expect(layers(container, "idle")).toHaveLength(1);
    expect(animated(container)).toHaveLength(0);
  });

  it("accepts numbers", () => {
    render(<TextSwap>{42}</TextSwap>);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  describe.each(textSwapTransitionNames)("%s", (transition: TextSwapTransition) => {
    it("animates the new value in and keeps it as the accessible text", () => {
      const { container, rerender } = render(
        <TextSwap transition={transition}>Move with purpose.</TextSwap>,
      );
      rerender(<TextSwap transition={transition}>Direction matters.</TextSwap>);

      expect(root(container)).toHaveAttribute("data-transition", transition);
      expect(screen.getByText("Direction matters.")).toBeInTheDocument();
      expect(layers(container, "enter")).toHaveLength(1);

      const names = animated(container).map((node) => node.style.animationName);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(stylesheet()).toContain(`@keyframes ${name}{`);

      // Readable end state: fill both, and every timing scales with motion.
      for (const node of animated(container)) {
        expect(node.style.animationFillMode).toBe("both");
        expect(node.style.animationDelay).toContain("var(--motion-scale");
        expect(node.style.animationDuration).toContain("var(--motion-scale");
      }
      expect(stylesheet()).toMatch(/to\{opacity:1[;}]/);
    });
  });

  it.each(["fade-through", "shared-axis-x", "shared-axis-z"] as const)(
    "%s keeps the outgoing text aria-hidden only until its exit ends",
    (transition) => {
      const { container, rerender } = render(<TextSwap transition={transition}>Old</TextSwap>);
      rerender(<TextSwap transition={transition}>New</TextSwap>);

      const [leaving] = layers(container, "exit");
      expect(leaving).toHaveTextContent("Old");
      expect(leaving).toHaveAttribute("aria-hidden", "true");
      expect(leaving?.style.animationName).toMatch(/-out$/);
      expect(
        screen.queryByText("Old", { ignore: "[aria-hidden] *, [aria-hidden]" }),
      ).toBeNull();

      fireEvent.animationEnd(leaving!, { animationName: leaving!.style.animationName });
      expect(layers(container, "exit")).toHaveLength(0);
      expect(container).not.toHaveTextContent("Old");
    },
  );

  it("waits for the exit before the entrance begins (mode=wait)", () => {
    const { container, rerender } = render(<TextSwap transition="shared-axis-x">A</TextSwap>);
    rerender(<TextSwap transition="shared-axis-x">B</TextSwap>);
    const [entering] = layers(container, "enter");
    expect(entering?.style.animationDelay).toBe("calc(360ms * var(--motion-scale, 1))");
    expect(entering?.style.animationDuration).toBe("calc(500ms * var(--motion-scale, 1))");
  });

  it("removes the outgoing text on a timer when animationend never fires", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<TextSwap>Old</TextSwap>);
    rerender(<TextSwap>New</TextSwap>);
    expect(layers(container, "exit")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(layers(container, "exit")).toHaveLength(0);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("never stacks ghosts on rapid changes", () => {
    const { container, rerender } = render(<TextSwap>One</TextSwap>);
    rerender(<TextSwap>Two</TextSwap>);
    rerender(<TextSwap>Three</TextSwap>);
    rerender(<TextSwap>Four</TextSwap>);

    expect(layers(container)).toHaveLength(2);
    expect(layers(container, "exit")[0]).toHaveTextContent("One");
    expect(layers(container, "enter")[0]).toHaveTextContent("Four");
    expect(container).not.toHaveTextContent(/Two|Three/);
  });

  it("per-word-crossfade drops the old text at once and staggers the words in", () => {
    const { container, rerender } = render(
      <TextSwap transition="per-word-crossfade">Think different.</TextSwap>,
    );
    rerender(<TextSwap transition="per-word-crossfade">Per-word crossfade reveal.</TextSwap>);

    expect(layers(container)).toHaveLength(1);
    expect(screen.getByText("Per-word crossfade reveal.")).toHaveClass("sr-only");
    const words = [...container.querySelectorAll<HTMLElement>('[data-slot="text-swap-word"]')];
    expect(words.map((word) => word.textContent)).toEqual(["Per-word", "crossfade", "reveal."]);
    expect(words[0]?.closest("[aria-hidden]")).not.toBeNull();
    expect(words.map((word) => word.style.animationDelay)).toEqual([
      "calc(0ms * var(--motion-scale, 1))",
      "calc(70ms * var(--motion-scale, 1))",
      "calc(140ms * var(--motion-scale, 1))",
    ]);
    expect(words[1]?.style.getPropertyValue("--i")).toBe("1");
  });

  it("shared-axis-y cuts word by word, 78ms apart, entering after the old words leave", () => {
    const { container, rerender } = render(
      <TextSwap transition="shared-axis-y">Layered navigation.</TextSwap>,
    );
    rerender(<TextSwap transition="shared-axis-y">Hierarchy made clear.</TextSwap>);

    const [leaving] = layers(container, "exit");
    const out = [...leaving!.querySelectorAll<HTMLElement>('[data-slot="text-swap-word"]')];
    expect(out.map((word) => word.style.animationDelay)).toEqual([
      "calc(0ms * var(--motion-scale, 1))",
      "calc(78ms * var(--motion-scale, 1))",
    ]);

    const [entering] = layers(container, "enter");
    const incoming = [
      ...entering!.querySelectorAll<HTMLElement>('[data-slot="text-swap-word"]'),
    ];
    expect(incoming.map((word) => word.style.animationDelay)).toEqual([
      "calc(78ms * var(--motion-scale, 1))",
      "calc(156ms * var(--motion-scale, 1))",
      "calc(234ms * var(--motion-scale, 1))",
    ]);

    // The staircase finishes on its last word, which is what removes the layer.
    fireEvent.animationEnd(out[0]!);
    expect(layers(container, "exit")).toHaveLength(1);
    fireEvent.animationEnd(out[1]!);
    expect(layers(container, "exit")).toHaveLength(0);
  });

  it("backward reverses the staircase and the direction sign", () => {
    const { container, rerender } = render(
      <TextSwap transition="shared-axis-y" direction="backward" stagger={10}>
        a b
      </TextSwap>,
    );
    rerender(
      <TextSwap transition="shared-axis-y" direction="backward" stagger={10}>
        c d e
      </TextSwap>,
    );
    expect(root(container)).toHaveAttribute("data-direction", "backward");
    expect(root(container).style.getPropertyValue("--text-swap-dir")).toBe("-1");
    const incoming = [
      ...layers(container, "enter")[0]!.querySelectorAll<HTMLElement>(
        '[data-slot="text-swap-word"]',
      ),
    ];
    expect(incoming.map((word) => word.style.animationDelay)).toEqual([
      "calc(30ms * var(--motion-scale, 1))",
      "calc(20ms * var(--motion-scale, 1))",
      "calc(10ms * var(--motion-scale, 1))",
    ]);
  });

  it("mirrors shared-axis-x in RTL so forward arrives from the inline end", () => {
    render(<TextSwap transition="shared-axis-x">x</TextSwap>);
    const css = stylesheet();
    expect(css).toContain("[data-slot=text-swap]:dir(rtl){--text-swap-inline:-1}");
    expect(css).toContain("[dir=rtl] [data-slot=text-swap]");
    expect(css).toContain(
      "axis-x-in{from{opacity:0;transform:translateX(calc(24px * var(--text-swap-dir,1) * var(--text-swap-inline,1)))",
    );
  });

  it("adds the delay prop to the entrance", () => {
    const { container } = render(
      <TextSwap transition="per-word-crossfade" appear delay={400}>
        Hi there
      </TextSwap>,
    );
    const words = container.querySelectorAll<HTMLElement>('[data-slot="text-swap-word"]');
    expect(words[1]?.style.animationDelay).toBe("calc(470ms * var(--motion-scale, 1))");
  });

  describe("appear", () => {
    it("animates the first value when set", () => {
      const { container } = render(<TextSwap appear>Hello</TextSwap>);
      expect(layers(container, "enter")).toHaveLength(1);
      expect(animated(container)[0]?.style.animationPlayState).not.toBe("paused");
    });

    it("waits for the element to scroll into view", () => {
      let callback: IntersectionObserverCallback = () => {};
      const observe = vi.fn();
      const disconnect = vi.fn();
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(cb: IntersectionObserverCallback) {
            callback = cb;
          }
          observe = observe;
          disconnect = disconnect;
          unobserve = vi.fn();
        },
      );
      const { container } = render(
        <TextSwap transition="per-word-crossfade" appear="in-view">
          Think different.
        </TextSwap>,
      );
      expect(observe).toHaveBeenCalledWith(root(container));
      expect(animated(container)[0]?.style.animationPlayState).toBe("paused");

      act(() =>
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
      expect(animated(container)[0]?.style.animationPlayState).toBe("");
      expect(disconnect).toHaveBeenCalled();
    });

    it("plays at once where IntersectionObserver does not exist", () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      const { container } = render(<TextSwap appear="in-view">Hello</TextSwap>);
      expect(animated(container)[0]?.style.animationPlayState).toBe("");
    });
  });

  it("is not a live region unless the consumer opts in", () => {
    const { container, rerender } = render(<TextSwap>a</TextSwap>);
    expect(root(container)).not.toHaveAttribute("aria-live");
    rerender(<TextSwap aria-live="polite">a</TextSwap>);
    expect(root(container)).toHaveAttribute("aria-live", "polite");
  });

  it("renders the chosen element, as a block grid for block elements", () => {
    const { container } = render(<TextSwap as="h2">Title</TextSwap>);
    expect(screen.getByRole("heading", { level: 2, name: "Title" })).toBe(root(container));
    expect(root(container)).toHaveClass("grid");
    expect(root(container)).not.toHaveClass("inline-grid");
  });

  it("clips the travelling transitions like the sources", () => {
    const { container, rerender } = render(<TextSwap transition="shared-axis-x">a</TextSwap>);
    expect(root(container)).toHaveClass("overflow-x-clip");
    rerender(<TextSwap transition="shared-axis-z">a</TextSwap>);
    expect(root(container)).toHaveClass("overflow-clip");
  });

  it("lets a consumer className win and forwards props and style", () => {
    const { container } = render(
      <TextSwap className="grid" data-testid="swap" style={{ color: "currentcolor" }}>
        a
      </TextSwap>,
    );
    expect(root(container)).toHaveClass("grid");
    expect(root(container)).not.toHaveClass("inline-grid");
    expect(screen.getByTestId("swap").style.color).toBe("currentcolor");
  });

  it("forwards object and callback refs", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<TextSwap ref={ref}>a</TextSwap>);
    expect(ref.current).toBe(root(container));

    const callback = vi.fn();
    render(<TextSwap ref={callback}>b</TextSwap>);
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLSpanElement));
  });

  it("has no axe violations mid-transition", async () => {
    const { container, rerender } = render(
      <TextSwap transition="per-word-crossfade" aria-live="polite">
        One two
      </TextSwap>,
    );
    rerender(
      <TextSwap transition="per-word-crossfade" aria-live="polite">
        Three four
      </TextSwap>,
    );
    await expectNoA11yViolations(container);

    const swap = render(<TextSwap as="h1">Old</TextSwap>);
    swap.rerender(<TextSwap as="h1">New</TextSwap>);
    await expectNoA11yViolations(swap.container);
  });
});

describe("TextRotate", () => {
  const items = ["Ship faster.", "Build smarter.", "Scale further."];

  it("cycles through the items every interval, wrapping around", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    render(<TextRotate items={items} interval={3000} onIndexChange={onIndexChange} />);
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Build smarter.")).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("defaults to the sources' 2500ms", () => {
    vi.useFakeTimers();
    render(<TextRotate items={items} />);
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Build smarter.")).toBeInTheDocument();
  });

  it("passes the transition through", () => {
    vi.useFakeTimers();
    const { container } = render(<TextRotate items={items} transition="shared-axis-z" />);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(layers(container, "enter")[0]?.style.animationName).toBe(
      "dowel-text-swap-axis-z-in",
    );
  });

  it("stops when paused", () => {
    vi.useFakeTimers();
    render(<TextRotate items={items} paused />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();
  });

  it("stops under reduced motion, leaving the current phrase readable", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    render(<TextRotate items={items} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Ship faster.")).toBeInTheDocument();
  });

  it("forwards its ref and handles an empty list", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<TextRotate items={[]} ref={ref} />);
    expect(ref.current).toBe(root(container));
  });

  it("has no axe violations", async () => {
    const { container } = render(<TextRotate items={items} aria-live="polite" />);
    await expectNoA11yViolations(container);
  });
});
