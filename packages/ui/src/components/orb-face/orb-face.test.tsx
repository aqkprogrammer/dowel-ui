import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { OrbFace, type OrbFaceState } from "./orb-face";

const STATES: OrbFaceState[] = [
  "idle",
  "listening",
  "thinking",
  "streaming",
  "speaking",
  "done",
  "error",
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function face(container: HTMLElement) {
  return container.querySelector<SVGSVGElement>('[data-slot="orb-face"]');
}

function eyes(container: HTMLElement) {
  return container.querySelector<SVGGElement>('[data-slot="orb-face-eyes"]');
}

function eyeHeight(container: HTMLElement) {
  return Number(container.querySelector("[data-part=eye]")?.getAttribute("height"));
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query.includes("reduce"),
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

describe("OrbFace", () => {
  it("is decorative by default", () => {
    const { container } = render(<OrbFace />);
    expect(face(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("becomes a labelled image when given an aria-label", () => {
    render(<OrbFace aria-label="Assistant is thinking" state="thinking" />);
    expect(screen.getByRole("img", { name: "Assistant is thinking" })).toBeInTheDocument();
  });

  it.each(STATES)("renders the %s state", (state) => {
    const { container } = render(<OrbFace state={state} />);
    expect(face(container)).toHaveAttribute("data-state", state);
    expect(container.querySelector('[data-slot="orb-face-mouth"]')).not.toBeNull();
  });

  it("swaps open eyes for happy arcs when done", () => {
    const { container } = render(<OrbFace state="done" />);
    expect(container.querySelectorAll("[data-part=eye]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-part=arc]")).toHaveLength(3);
  });

  it("keeps spiral eyes for as long as it is in error", () => {
    vi.useFakeTimers();
    const { container } = render(<OrbFace state="error" />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(container.querySelectorAll("[data-part=eye]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-part=spiral]")).toHaveLength(2);
  });

  it("squints while thinking and widens while listening", () => {
    const thinking = render(<OrbFace state="thinking" />);
    const streaming = render(<OrbFace state="streaming" />);
    const idle = render(<OrbFace state="idle" />);
    const listening = render(<OrbFace state="listening" />);
    expect(eyeHeight(thinking.container)).toBeLessThan(eyeHeight(streaming.container));
    expect(eyeHeight(streaming.container)).toBeLessThan(eyeHeight(idle.container));
    expect(eyeHeight(idle.container)).toBeLessThan(eyeHeight(listening.container));
  });

  it("talks while speaking and goes off-centre while thinking", () => {
    const speaking = render(<OrbFace state="speaking" />);
    expect(speaking.container.querySelector("[data-part=talk]")).not.toBeNull();
    const thinking = render(<OrbFace state="thinking" />);
    expect(thinking.container.querySelector("[data-part=hmm]")).not.toBeNull();
  });

  it("gives each instance its own gradient id", () => {
    const { container } = render(
      <>
        <OrbFace />
        <OrbFace />
      </>,
    );
    const ids = [...container.querySelectorAll("radialGradient")].map((node) => node.id);
    expect(new Set(ids).size).toBe(2);
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("fill")).toBe(`url(#${ids[0] ?? ""})`);
  });

  it("blinks now and then, and the blink clears itself", () => {
    vi.useFakeTimers();
    // 0.5: the first blink lands at 4.5s, and is a single.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { container } = render(<OrbFace />);
    expect(eyes(container)).not.toHaveAttribute("data-blink");
    act(() => {
      vi.advanceTimersByTime(4600);
    });
    expect(eyes(container)).toHaveAttribute("data-blink", "single");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(eyes(container)).not.toHaveAttribute("data-blink");
  });

  it("sometimes blinks twice", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const { container } = render(<OrbFace />);
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(eyes(container)).toHaveAttribute("data-blink", "double");
  });

  it("follows the pointer with its gaze", async () => {
    const { container } = render(<OrbFace />);
    fireEvent.pointerMove(window, { clientX: 440, clientY: 0 });
    await waitFor(() => {
      expect(eyes(container)?.style.transform).toContain("translateX(5.5px)");
    });
  });

  it("ignores the pointer when gaze is off", async () => {
    const { container } = render(<OrbFace gaze={false} />);
    fireEvent.pointerMove(window, { clientX: 440, clientY: 0 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(eyes(container)?.style.transform ?? "").not.toContain("5.5px");
  });

  it("looks away in saccades while thinking", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = render(<OrbFace state="thinking" />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    vi.useRealTimers();
    await waitFor(() => {
      expect(eyes(container)?.style.transform).toContain("translateY(-5.5px)");
    });
  });

  it("holds still under reduced motion: no blinking, no gaze", async () => {
    mockReducedMotion(true);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = render(<OrbFace state="listening" amplitude={0.8} />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    vi.useRealTimers();
    expect(eyes(container)).not.toHaveAttribute("data-blink");
    fireEvent.pointerMove(window, { clientX: 440, clientY: 0 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(eyes(container)?.style.transform ?? "").not.toContain("5.5px");
    expect(face(container)?.style.getPropertyValue("--face-amplitude")).toBe("0");
  });

  it("swells with the voice only while listening", () => {
    const listening = render(<OrbFace state="listening" amplitude={2} />);
    expect(face(listening.container)?.style.getPropertyValue("--face-amplitude")).toBe("1");
    const idle = render(<OrbFace state="idle" amplitude={0.5} />);
    expect(face(idle.container)?.style.getPropertyValue("--face-amplitude")).toBe("0");
  });

  it("colours from theme tokens, and accepts overrides", () => {
    const { container } = render(<OrbFace colors={{ feature: "var(--color-foreground)" }} />);
    expect(container.querySelector("[data-part=eye]")?.getAttribute("fill")).toBe(
      "var(--color-foreground)",
    );
    expect(container.querySelector("stop")?.getAttribute("stop-color")).toBe(
      "var(--color-primary)",
    );
  });

  it("defines every keyframe it uses, scaled by the motion scale", () => {
    render(<OrbFace />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    for (const name of ["blink", "hop", "wobble", "draw", "spin", "hmm", "talk"]) {
      expect(css).toContain(`@keyframes dowel-orb-face-${name}{`);
      expect(css).toMatch(
        new RegExp(`dowel-orb-face-${name} calc\\(\\d+ms \\* var\\(--motion-scale`),
      );
    }
  });

  it("merges className and style, and forwards ref and props", () => {
    const ref = createRef<SVGSVGElement>();
    const callback = vi.fn();
    const { container } = render(
      <>
        <OrbFace
          ref={ref}
          className="block"
          size="4rem"
          style={{ opacity: 0.5 }}
          data-testid="f"
        />
        <OrbFace ref={callback} />
      </>,
    );
    const element = face(container);
    expect(element).toHaveClass("block", "dowel-orb-face");
    expect(element?.style.width).toBe("4rem");
    expect(element?.style.opacity).toBe("0.5");
    expect(ref.current).toBe(element);
    expect(callback).toHaveBeenCalledWith(expect.any(SVGSVGElement));
    expect(screen.getByTestId("f")).toBe(element);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <OrbFace />
        <OrbFace aria-label="Assistant finished" state="done" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
