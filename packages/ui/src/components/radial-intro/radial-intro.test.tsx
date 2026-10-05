import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  RadialIntro,
  radialIntroOffset,
  type RadialIntroHandle,
  type RadialIntroItem,
} from "./radial-intro";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const ITEMS: RadialIntroItem[] = [
  { id: "ada", src: "/ada.png", alt: "Ada Lovelace" },
  { id: "grace", src: "/grace.png", alt: "Grace Hopper" },
  { id: "katherine", src: "/katherine.png", alt: "Katherine Johnson" },
  { id: "margaret", src: "/margaret.png", alt: "Margaret Hamilton" },
];

/** A controllable IntersectionObserver. */
let observed: ((visible: boolean) => void) | null = null;
class FakeObserver {
  constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {
    observed = (visible) => {
      this.callback([{ isIntersecting: visible }]);
    };
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  motionPreference.reduced = false;
  observed = null;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function root() {
  return screen.getByRole("list").parentElement as HTMLElement;
}

function items() {
  return [...root().querySelectorAll<HTMLElement>('[data-slot="radial-intro-item"]')];
}

describe("RadialIntro", () => {
  it("renders a list of images with alt text", () => {
    render(<RadialIntro items={ITEMS} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("img", { name: "Grace Hopper" })).toHaveAttribute(
      "src",
      "/grace.png",
    );
    expect(root()).toHaveAttribute("data-slot", "radial-intro");
    const label = root().querySelector('[data-slot="radial-intro-label"]');
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(label).toHaveTextContent("Ada Lovelace");
  });

  it("plays on mount, spiralling out from the stack", async () => {
    render(<RadialIntro items={ITEMS} />);
    expect(root()).toHaveAttribute("data-state", "playing");
    const first = items()[0] as HTMLElement;
    const start = first.style.transform;
    await waitFor(() => {
      expect(first.style.transform).not.toBe(start);
    });
  });

  it("settles every avatar and reports it", async () => {
    const onSettled = vi.fn();
    render(<RadialIntro items={ITEMS.slice(0, 2)} stagger={0} onSettled={onSettled} />);
    await waitFor(
      () => {
        expect(root()).toHaveAttribute("data-state", "settled");
      },
      { timeout: 8000 },
    );
    expect(onSettled).toHaveBeenCalledTimes(1);
  }, 10000);

  it("waits until it is in view with trigger inView", () => {
    render(<RadialIntro items={ITEMS} trigger="inView" />);
    expect(root()).toHaveAttribute("data-state", "waiting");
    act(() => {
      observed?.(false);
    });
    expect(root()).toHaveAttribute("data-state", "waiting");
    act(() => {
      observed?.(true);
    });
    expect(root()).toHaveAttribute("data-state", "playing");
  });

  it("plays at once without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<RadialIntro items={ITEMS} trigger="inView" />);
    expect(root()).toHaveAttribute("data-state", "playing");
  });

  it("renders the finished ring under reduced motion, with no orbit", async () => {
    motionPreference.reduced = true;
    const onSettled = vi.fn();
    render(
      <RadialIntro items={ITEMS} onSettled={onSettled}>
        <p>Team</p>
      </RadialIntro>,
    );
    expect(root()).toHaveAttribute("data-state", "settled");
    expect(onSettled).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Pause rotation" })).toBeNull();
    await waitFor(() => {
      // The first seat is straight up: no x, a full radius up.
      expect(items()[0]?.style.transform).toContain(
        "translateY(calc(var(--radial-intro-radius) * -1))",
      );
    });
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("replays through its handle", () => {
    motionPreference.reduced = true;
    const handle = createRef<RadialIntroHandle>();
    const onSettled = vi.fn();
    render(<RadialIntro items={ITEMS} handleRef={handle} onSettled={onSettled} />);
    expect(onSettled).toHaveBeenCalledTimes(1);
    act(() => {
      handle.current?.replay();
    });
    expect(root()).toHaveAttribute("data-state", "settled");
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it("replay restarts the spiral", async () => {
    const handle = createRef<RadialIntroHandle>();
    render(<RadialIntro items={ITEMS} trigger="inView" handleRef={handle} />);
    expect(root()).toHaveAttribute("data-state", "waiting");
    act(() => {
      handle.current?.replay();
    });
    expect(root()).toHaveAttribute("data-state", "playing");
    const first = items()[0] as HTMLElement;
    const start = first.style.transform;
    await waitFor(() => {
      expect(first.style.transform).not.toBe(start);
    });
  });

  it("orbits once settled, pausing on hover and with its toggle", async () => {
    motionPreference.reduced = false;
    const user = userEvent.setup();
    render(<RadialIntro items={ITEMS.slice(0, 2)} stagger={0} orbitDuration={1} />);
    await waitFor(
      () => {
        expect(root()).toHaveAttribute("data-state", "settled");
      },
      { timeout: 8000 },
    );
    const first = items()[0] as HTMLElement;
    let before = first.style.transform;
    await waitFor(() => {
      expect(first.style.transform).not.toBe(before);
    });

    const pause = screen.getByRole("button", { name: "Pause rotation" });
    expect(pause).toHaveAttribute("aria-pressed", "false");
    await user.click(pause);
    expect(pause).toHaveAttribute("aria-pressed", "true");
    await new Promise((resolve) => setTimeout(resolve, 60));
    before = first.style.transform;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(first.style.transform).toBe(before);
    await user.click(pause);
    expect(pause).toHaveAttribute("aria-pressed", "false");

    fireEvent.pointerEnter(first);
    await new Promise((resolve) => setTimeout(resolve, 60));
    before = first.style.transform;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(first.style.transform).toBe(before);
    fireEvent.pointerLeave(first);
    fireEvent.pointerLeave(first);
    await waitFor(() => {
      expect(first.style.transform).not.toBe(before);
    });
  }, 12000);

  it("has no orbit toggle when the orbit is off or there is one avatar", () => {
    const { rerender } = render(<RadialIntro items={ITEMS} orbit={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<RadialIntro items={ITEMS.slice(0, 1)} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("settles at once with no items", () => {
    const { container } = render(<RadialIntro items={[]} data-testid="empty" />);
    expect(container.querySelector('[data-slot="radial-intro"]')).toHaveAttribute(
      "data-state",
      "settled",
    );
  });

  it("names the pause toggle", () => {
    render(<RadialIntro items={ITEMS} pauseLabel="Stop the ring" />);
    expect(screen.getByRole("button", { name: "Stop the ring" })).toBeInTheDocument();
  });

  it.each([
    ["sm", "[--radial-intro-size:14rem]"],
    ["md", "[--radial-intro-size:19rem]"],
    ["lg", "[--radial-intro-size:24rem]"],
  ] as const)("applies the %s size", (size, token) => {
    render(<RadialIntro items={ITEMS} size={size} />);
    expect(root()).toHaveClass(token);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<RadialIntro items={ITEMS} ref={ref} className="size-80" id="team" />);
    expect(ref.current).toBe(root());
    expect(root()).toHaveAttribute("id", "team");
    expect(root()).toHaveClass("size-80");
    expect(root()).not.toHaveClass("size-(--radial-intro-size)");
  });

  it("calls a ref callback", () => {
    const ref = vi.fn();
    render(<RadialIntro items={ITEMS} ref={ref} />);
    expect(ref).toHaveBeenCalledWith(root());
  });

  it("places seats around the ring and unwinds the spiral", () => {
    expect(radialIntroOffset(0, 0, 1)).toEqual({ x: 0, y: -1 });
    expect(radialIntroOffset(90, 0, 1)).toEqual({ x: 1, y: 0 });
    expect(radialIntroOffset(0, 90, 1)).toEqual({ x: 1, y: 0 });
    expect(radialIntroOffset(0, 0, 0)).toEqual({ x: 0, y: 0 });
    const halfway = radialIntroOffset(0, 0, 0.5);
    expect(Math.hypot(halfway.x, halfway.y)).toBeCloseTo(0.5);
  });

  it("has no accessibility violations", async () => {
    motionPreference.reduced = false;
    const { container } = render(
      <RadialIntro items={ITEMS}>
        <p>Our team</p>
      </RadialIntro>,
    );
    await expectNoA11yViolations(container);
  });
});
