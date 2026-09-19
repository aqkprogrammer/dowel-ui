import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TextEffect, textEffectPresetNames, type TextEffectPreset } from "./text-effect";

const SENTENCE = "Think different.";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="text-effect"]')!;
}
function content(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="text-effect-content"]')!;
}
function pieces(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="text-effect-piece"]')];
}
function stylesheet() {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}
/** The body of one @keyframes rule. */
function keyframes(name: string) {
  const match = new RegExp(`@keyframes ${name}\\{(.*)\\}`).exec(stylesheet());
  return match?.[1] ?? "";
}

/** A controllable IntersectionObserver. */
function mockIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];
  const disconnect = vi.fn();
  class MockObserver {
    constructor(public callback: IntersectionObserverCallback) {
      instances.push({ callback, disconnect });
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
  const enter = () => {
    act(() => {
      for (const instance of instances) {
        instance.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }
    });
  };
  return { enter, disconnect };
}

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TextEffect", () => {
  describe("accessibility", () => {
    it("reads the whole string once, with the split pieces hidden", () => {
      const { container } = render(<TextEffect preset="soft-blur-in">{SENTENCE}</TextEffect>);
      expect(screen.getByText(SENTENCE)).toHaveClass("sr-only");
      expect(content(container)).toHaveAttribute("aria-hidden", "true");
      expect(pieces(container)).toHaveLength(Array.from(SENTENCE).length);
    });

    it("keeps a heading's role and names it with the full text", () => {
      render(
        <TextEffect as="h2" preset="per-character-rise">
          {SENTENCE}
        </TextEffect>,
      );
      expect(screen.getByRole("heading", { level: 2, name: SENTENCE })).toBeInTheDocument();
    });

    it("joins lines into one readable string", () => {
      render(<TextEffect preset="mask-reveal-up">{"Designed for\nthe planet."}</TextEffect>);
      expect(screen.getByText("Designed for the planet.")).toBeInTheDocument();
    });

    it("announces nothing unless the consumer opts in, and then only the settled text", () => {
      const { container, rerender } = render(
        <TextEffect aria-live="polite">Hello there</TextEffect>,
      );
      expect(root(container)).toHaveAttribute("aria-live", "polite");
      // Pieces are aria-hidden, so the live region's text is only the sr-only copy.
      rerender(<TextEffect aria-live="polite">Goodbye now</TextEffect>);
      expect(screen.getByText("Goodbye now")).toHaveAttribute("data-slot", "text-effect-label");
      expect(screen.queryByText("Hello there")).not.toBeInTheDocument();

      const bare = render(<TextEffect>Quiet</TextEffect>);
      expect(root(bare.container)).not.toHaveAttribute("aria-live");
    });

    it("has no axe violations", async () => {
      const { container } = render(
        <div>
          <TextEffect as="h1" preset="soft-blur-in">
            {SENTENCE}
          </TextEffect>
          <TextEffect as="p" preset="line-by-line-slide">
            {"Beautiful by design.\nPowerful by nature."}
          </TextEffect>
          <TextEffect preset="kinetic-center-build">Words push left</TextEffect>
        </div>,
      );
      await expectNoA11yViolations(container);
    });
  });

  describe("presets", () => {
    it.each(textEffectPresetNames)("%s renders pieces and animates them", (preset) => {
      const { container } = render(<TextEffect preset={preset}>{SENTENCE}</TextEffect>);
      expect(root(container)).toHaveAttribute("data-preset", preset);
      expect(root(container)).toHaveAttribute("data-state", "playing");
      expect(pieces(container).length).toBeGreaterThan(0);
      const name = content(container).style.getPropertyValue("--text-effect-name");
      expect(name).toMatch(new RegExp(`^dowel-text-effect-${preset}`));
      expect(keyframes(name)).not.toBe("");
    });

    it("defines every keyframe it can reference", () => {
      for (const preset of textEffectPresetNames) {
        const { container, unmount } = render(<TextEffect preset={preset}>a b</TextEffect>);
        const node = content(container);
        for (const name of [
          node.style.getPropertyValue("--text-effect-name"),
          node.style.getPropertyValue("--text-effect-grow"),
          node.style.animationName,
        ]) {
          if (name && name !== "none") expect(keyframes(name), name).not.toBe("");
        }
        unmount();
      }
    });

    const units: [TextEffectPreset, string, number][] = [
      ["soft-blur-in", "character", Array.from(SENTENCE).length],
      ["blur-out-up", "word", 2],
      ["spring-scale-in", "word", 2],
      ["focus-blur-resolve", "whole", 1],
      ["micro-scale-fade", "whole", 1],
      ["wave-text", "character", Array.from(SENTENCE).length],
    ];
    it.each(units)("%s splits by %s by default", (preset, unit, count) => {
      const { container } = render(<TextEffect preset={preset}>{SENTENCE}</TextEffect>);
      expect(content(container)).toHaveAttribute("data-by", unit);
      expect(pieces(container)).toHaveLength(count);
    });

    it("splits line presets on newlines, and masks mask-reveal-up", () => {
      const { container } = render(
        <TextEffect preset="mask-reveal-up">{"One\nTwo\nThree"}</TextEffect>,
      );
      expect(pieces(container).map((piece) => piece.textContent)).toEqual([
        "One",
        "Two",
        "Three",
      ]);
      expect(container.querySelectorAll('[data-slot="text-effect-mask"]')).toHaveLength(3);
      expect(root(container)).toHaveClass("block");
    });

    it("lets `by` override the split of a staggered preset", () => {
      const { container } = render(
        <TextEffect preset="soft-blur-in" by="word">
          {SENTENCE}
        </TextEffect>,
      );
      expect(content(container)).toHaveAttribute("data-by", "word");
      expect(pieces(container).map((piece) => piece.textContent)).toEqual([
        "Think",
        "different.",
      ]);
    });

    it("keeps the phrase builders per word whatever `by` says", () => {
      const { container } = render(
        <TextEffect preset="kinetic-center-build" by="character">
          Words push left
        </TextEffect>,
      );
      expect(content(container)).toHaveAttribute("data-by", "word");
      expect(pieces(container)).toHaveLength(3);
    });

    it("groups letters per word so a line never breaks inside a word", () => {
      const { container } = render(<TextEffect preset="per-character-rise">ab cd</TextEffect>);
      const words = container.querySelectorAll('[data-slot="text-effect-word"]');
      expect([...words].map((word) => word.textContent)).toEqual(["ab", "cd"]);
      // The space is its own staggered piece, as in the source.
      expect(pieces(container).map((piece) => piece.style.getPropertyValue("--i"))).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4",
      ]);
    });

    it("staggers from the center outward, and from the edges inward", () => {
      const order = (preset: TextEffectPreset) => {
        const { container, unmount } = render(<TextEffect preset={preset}>abcde</TextEffect>);
        const values = pieces(container).map((piece) => piece.style.getPropertyValue("--i"));
        unmount();
        return values;
      };
      expect(order("stagger-from-center")).toEqual(["2", "1", "0", "1", "2"]);
      expect(order("stagger-from-edges")).toEqual(["0", "1", "2", "1", "0"]);
    });

    it("carries the source's timing and scales it through --motion-scale", () => {
      const { container } = render(<TextEffect preset="blur-out-up">{SENTENCE}</TextEffect>);
      const node = content(container);
      expect(node.style.getPropertyValue("--text-effect-duration")).toBe(
        "calc(560ms * var(--motion-scale, 1))",
      );
      expect(node.style.getPropertyValue("--text-effect-stagger")).toBe("28ms");
      expect(stylesheet()).toContain(
        "animation-delay:calc((var(--text-effect-delay) + var(--i, 0) * var(--text-effect-stagger)) * var(--motion-scale, 1))",
      );
      expect(keyframes("dowel-text-effect-blur-out-up")).toBe(
        "from{opacity:0;transform:translate(0,10px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}",
      );
    });

    it("accepts delay, stagger and duration overrides", () => {
      const { container } = render(
        <TextEffect preset="spring-scale-in" delay={400} stagger={10} duration={100}>
          {SENTENCE}
        </TextEffect>,
      );
      const node = content(container);
      expect(node.style.getPropertyValue("--text-effect-delay")).toBe("400ms");
      expect(node.style.getPropertyValue("--text-effect-stagger")).toBe("10ms");
      expect(node.style.getPropertyValue("--text-effect-duration")).toContain("100ms");
    });

    it("moves reveal-text in the requested direction, along the inline axis", () => {
      const { container } = render(
        <TextEffect preset="reveal-text" direction="start">
          Beautiful animations
        </TextEffect>,
      );
      const name = content(container).style.getPropertyValue("--text-effect-name");
      expect(name).toBe("dowel-text-effect-reveal-text-start");
      expect(keyframes(name)).toContain(
        "translate(calc(var(--text-effect-inline, 1) * 24px),0px)",
      );
      expect(stylesheet()).toContain(
        "[data-slot=text-effect]:dir(rtl){--text-effect-inline:-1}",
      );
    });

    it("builds kinetic-center-build word by word, growing each slot but the first", () => {
      const { container } = render(
        <TextEffect preset="kinetic-center-build">Type locks center</TextEffect>,
      );
      const node = content(container);
      expect(node).toHaveAttribute("data-layout", "row");
      expect(node.style.getPropertyValue("--text-effect-grow")).toBe(
        "dowel-text-effect-grow-inline",
      );
      const cells = container.querySelectorAll('[data-slot="text-effect-cell"]');
      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveAttribute("data-first");
      expect(cells[1]).not.toHaveAttribute("data-first");
      // The first word has nothing to push, so it settles faster.
      expect(pieces(container)[0]?.style.getPropertyValue("--text-effect-duration")).toContain(
        "340ms",
      );
      expect(keyframes("dowel-text-effect-kinetic-center-build")).toContain(
        "calc(var(--text-effect-inline, 1) * 88px)",
      );
    });

    it("glides short-slide-right as a phrase while its words fade in", () => {
      const { container } = render(
        <TextEffect preset="short-slide-right">Move with intent.</TextEffect>,
      );
      const node = content(container);
      expect(node.style.animationName).toBe("dowel-text-effect-short-slide-right-group");
      expect(node.style.getPropertyValue("--text-effect-stagger")).toBe("92ms");
      expect(root(container)).toHaveClass("overflow-hidden");
    });
  });

  describe("loops and reduced motion", () => {
    it("loops wave-text, and reports it as a loop rather than an entrance", () => {
      const { container } = render(<TextEffect preset="wave-text">Wave</TextEffect>);
      expect(root(container)).toHaveAttribute("data-mode", "loop");
      expect(content(container).style.getPropertyValue("--text-effect-count")).toBe("infinite");
      expect(content(container).style.getPropertyValue("--text-effect-amplitude")).toBe("8px");
    });

    it("stops the loop under reduced motion, in script and in CSS", () => {
      mockReducedMotion();
      const { container } = render(<TextEffect preset="wave-text">Wave</TextEffect>);
      expect(content(container).style.getPropertyValue("--text-effect-count")).toBe("1");
      expect(stylesheet()).toContain(
        "@media (prefers-reduced-motion: reduce){[data-slot=text-effect-piece]{animation-iteration-count:1}}",
      );
    });

    it("ends every entrance at rest, so a one-frame animation lands readable", () => {
      render(<TextEffect>x</TextEffect>);
      expect(stylesheet()).toContain("animation-fill-mode:both");
      const entrances = [...stylesheet().matchAll(/@keyframes (dowel-text-effect-[\w-]+)\{/g)]
        .map((match) => match[1]!)
        .filter((name) => !name.endsWith("-exit"));
      expect(entrances.length).toBeGreaterThan(19);
      for (const name of entrances) {
        const body = keyframes(name);
        const end = /(?:to|100%[^{]*)\{([^}]*)\}/.exec(body)?.[1] ?? body;
        expect(end, name).not.toMatch(/opacity:0\b/);
        if (name.includes("grow")) continue;
        expect(end, name).not.toMatch(/blur\([1-9]/);
      }
    });
  });

  describe("exit", () => {
    it("uses the phrase builders' own exit, all words at once", () => {
      const { container } = render(
        <TextEffect preset="short-slide-down" mode="exit">
          Words drop down
        </TextEffect>,
      );
      const node = content(container);
      expect(root(container)).toHaveAttribute("data-mode", "exit");
      expect(node.style.getPropertyValue("--text-effect-name")).toBe(
        "dowel-text-effect-short-slide-down-exit",
      );
      expect(node.style.getPropertyValue("--text-effect-stagger")).toBe("0ms");
      expect(node.style.getPropertyValue("--text-effect-grow")).toBe("none");
      expect(keyframes("dowel-text-effect-short-slide-down-exit")).toBe(
        "from{opacity:1;transform:none;filter:none}to{opacity:0;transform:translate(0,10px);filter:blur(1.2px)}",
      );
    });

    it("exits short-slide-right as a phrase", () => {
      const { container } = render(
        <TextEffect preset="short-slide-right" mode="exit">
          Move with intent.
        </TextEffect>,
      );
      const node = content(container);
      expect(node.style.animationName).toBe("dowel-text-effect-short-slide-right-exit");
      expect(node.style.getPropertyValue("--text-effect-name")).toBe("none");
    });

    it("plays other entrances backwards", () => {
      const { container } = render(
        <TextEffect preset="soft-blur-in" mode="exit">
          {SENTENCE}
        </TextEffect>,
      );
      const node = content(container);
      expect(node.style.getPropertyValue("--text-effect-name")).toBe(
        "dowel-text-effect-soft-blur-in",
      );
      expect(node.style.getPropertyValue("--text-effect-direction")).toBe("reverse");
    });

    it("ignores mode on the wave, which has no entrance to reverse", () => {
      const { container } = render(
        <TextEffect preset="wave-text" mode="exit">
          Wave
        </TextEffect>,
      );
      expect(root(container)).toHaveAttribute("data-mode", "loop");
      expect(content(container).style.getPropertyValue("--text-effect-direction")).toBe(
        "normal",
      );
    });
  });

  describe("trigger and replay", () => {
    it("waits for the text to scroll into view, then plays once", () => {
      const observer = mockIntersectionObserver();
      const { container } = render(
        <TextEffect trigger="in-view" preset="per-character-rise">
          {SENTENCE}
        </TextEffect>,
      );
      expect(root(container)).toHaveAttribute("data-state", "idle");
      expect(stylesheet()).toContain(
        "[data-slot=text-effect][data-state=idle] :is([data-slot=text-effect-piece]",
      );

      observer.enter();
      expect(root(container)).toHaveAttribute("data-state", "playing");
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it("renders at rest when IntersectionObserver is unavailable", () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      const { container } = render(
        <TextEffect trigger="in-view" preset="short-slide-right">
          {SENTENCE}
        </TextEffect>,
      );
      expect(root(container)).toHaveAttribute("data-state", "static");
      expect(content(container).style.getPropertyValue("--text-effect-name")).toBe("none");
      expect(content(container).style.animationName).toBe("");
    });

    it("replays when replayKey or children change", () => {
      const { container, rerender } = render(<TextEffect replayKey={0}>{SENTENCE}</TextEffect>);
      const first = content(container);

      rerender(<TextEffect replayKey={0}>{SENTENCE}</TextEffect>);
      expect(content(container)).toBe(first);

      rerender(<TextEffect replayKey={1}>{SENTENCE}</TextEffect>);
      const second = content(container);
      expect(second).not.toBe(first);

      rerender(<TextEffect replayKey={1}>Something else</TextEffect>);
      expect(content(container)).not.toBe(second);
    });

    it("calls onComplete once, when the last piece settles", () => {
      const onComplete = vi.fn();
      const { container } = render(
        <TextEffect preset="stagger-from-center" onComplete={onComplete}>
          abcde
        </TextEffect>,
      );
      const all = pieces(container);
      // Center-out: the edges finish last; the tie goes to the final piece.
      fireEvent.animationEnd(all[2]!);
      fireEvent.animationEnd(all[0]!);
      expect(onComplete).not.toHaveBeenCalled();
      expect(all[4]).toHaveAttribute("data-last");
      fireEvent.animationEnd(all[4]!);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("completes short-slide-right when the phrase glide ends", () => {
      const onComplete = vi.fn();
      const { container } = render(
        <TextEffect preset="short-slide-right" onComplete={onComplete}>
          a b
        </TextEffect>,
      );
      fireEvent.animationEnd(pieces(container)[1]!);
      expect(onComplete).not.toHaveBeenCalled();
      fireEvent.animationEnd(content(container));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("never marks a last piece on a loop", () => {
      const { container } = render(<TextEffect preset="wave-text">abc</TextEffect>);
      expect(container.querySelector("[data-last]")).toBeNull();
    });
  });

  describe("conventions", () => {
    it("lets a consumer className win a conflict", () => {
      const { container } = render(
        <TextEffect preset="line-by-line-slide" className="inline">
          {"a\nb"}
        </TextEffect>,
      );
      expect(root(container)).toHaveClass("inline");
      expect(root(container)).not.toHaveClass("block");
    });

    it("forwards its ref to the rendered element", () => {
      const ref = createRef<HTMLElement>();
      render(
        <TextEffect as="p" ref={ref}>
          {SENTENCE}
        </TextEffect>,
      );
      expect(ref.current?.tagName).toBe("P");
      expect(ref.current).toHaveAttribute("data-slot", "text-effect");
    });

    it("forwards other props to the root", () => {
      const { container } = render(
        <TextEffect id="hero" data-testid="effect" style={{ color: "currentcolor" }}>
          {SENTENCE}
        </TextEffect>,
      );
      expect(root(container)).toHaveAttribute("id", "hero");
      expect(screen.getByTestId("effect")).toBe(root(container));
      expect(root(container).style.color).toBe("currentcolor");
    });
  });
});
