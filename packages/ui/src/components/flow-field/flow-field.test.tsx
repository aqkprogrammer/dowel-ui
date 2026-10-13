import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import {
  createFlowRandom,
  FLOW_FIELD_MAX_PARTICLES,
  FLOW_STRIDE,
  FlowField,
  flowAngle,
  flowFieldParticleCount,
  respawnParticle,
  stepFlowField,
} from "./flow-field";

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
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

/** The streaks' start points in the last frame. */
function starts(mock: CanvasMock) {
  return mock.calls
    .filter((call) => call.method === "moveTo")
    .map((call) => call.args as number[]);
}

function frame(mock: CanvasMock) {
  mock.reset();
  act(() => void mock.flush(1));
}

describe("FlowField", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 330, height: 200 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("renders children above an aria-hidden canvas that ignores the pointer", async () => {
    const { container } = render(
      <FlowField>
        <h2>Data in motion</h2>
      </FlowField>,
    );
    const canvas = container.querySelector("[data-slot=flow-field-canvas]");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("pointer-events-none");
    expect(container.querySelector("[data-slot=flow-field-content]")).toContainElement(
      screen.getByRole("heading", { name: "Data in motion" }),
    );
    await expectNoA11yViolations(container);
  });

  it("draws one streak per particle in a single stroke, in the token colour", () => {
    render(<FlowField color="info" />);
    act(() => void mock.flush(2));
    frame(mock);
    // 330×200 at density 1 is 60 particles.
    expect(mock.count("moveTo")).toBe(60);
    expect(mock.count("lineTo")).toBe(60);
    expect(mock.count("stroke")).toBe(1);
  });

  it("moves the particles while animating", () => {
    render(<FlowField interactive={false} />);
    act(() => void mock.flush(2));
    frame(mock);
    const before = starts(mock);
    act(() => void mock.flush(20));
    frame(mock);
    expect(starts(mock)).not.toEqual(before);
  });

  it("draws one still frame under reduced motion", () => {
    mockReducedMotion(true);
    render(<FlowField />);
    act(() => void mock.flush(5));
    const drawn = mock.count("stroke");
    expect(drawn).toBeGreaterThan(0);
    act(() => void mock.flush(50));
    expect(mock.count("stroke")).toBe(drawn);
    expect(mock.pending()).toBe(0);
  });

  it("holds the field still at speed 0", () => {
    render(<FlowField speed={0} />);
    act(() => void mock.flush(5));
    expect(mock.pending()).toBe(0);
  });

  it("keeps the same field for a seed and changes it with another", () => {
    const { rerender } = render(<FlowField seed={4} speed={0} />);
    act(() => void mock.flush(1));
    frame(mock);
    const first = starts(mock);
    rerender(<FlowField seed={5} speed={0} />);
    frame(mock);
    expect(starts(mock)).not.toEqual(first);
  });

  it("tracks the pointer only when interactive", () => {
    const onPointerMove = vi.fn();
    const { container, rerender } = render(<FlowField onPointerMove={onPointerMove} />);
    const root = container.firstElementChild as HTMLElement;
    act(() => void mock.flush(1));
    fireEvent.pointerMove(root, { clientX: 100, clientY: 100 });
    expect(onPointerMove).toHaveBeenCalled();
    rerender(<FlowField interactive={false} />);
    expect(root).not.toHaveAttribute("data-interactive");
  });

  it("lets className win, forwards its ref and applies fades", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FlowField ref={ref} fade="bottom" className="isolation-auto" data-testid="flow" />);
    expect(ref.current).toBe(screen.getByTestId("flow"));
    expect(ref.current?.className).toContain("mask-image:linear-gradient");
    expect(ref.current).toHaveClass("isolation-auto");
    expect(ref.current).not.toHaveClass("isolate");
  });
});

describe("flow-field sim", () => {
  it("scales particle count with area and density, and caps it", () => {
    expect(flowFieldParticleCount(330, 200, 1)).toBe(60);
    expect(flowFieldParticleCount(4000, 3000, 3)).toBe(FLOW_FIELD_MAX_PARTICLES);
    expect(flowFieldParticleCount(0, 200, 1)).toBe(0);
    expect(flowFieldParticleCount(330, 200, 0)).toBe(0);
  });

  it("is a smooth field that changes slowly with time", () => {
    const a = flowAngle(100, 100, 0, 1);
    expect(Math.abs(flowAngle(101, 100, 0, 1) - a)).toBeLessThan(0.05);
    expect(Math.abs(flowAngle(100, 100, 0.1, 1) - a)).toBeLessThan(0.1);
    expect(flowAngle(100, 100, 10, 1)).not.toBeCloseTo(a);
  });

  it("moves particles along the field and respawns those that leave", () => {
    const random = createFlowRandom(1);
    const state = new Float32Array(2 * FLOW_STRIDE);
    respawnParticle(state, 0, 200, 200, random);
    state[3] = -50;
    state[4] = 100;
    state[5] = 3;
    const before = [state[0], state[1]];
    stepFlowField(state, 2, random, {
      width: 200,
      height: 200,
      time: 0,
      delta: 1 / 60,
      speed: 38,
      scale: 1,
      pointer: null,
      pushRadius: 0,
    });
    expect([state[0], state[1]]).not.toEqual(before);
    // The one off the edge was placed back inside.
    expect(state[3]).toBeGreaterThanOrEqual(0);
    expect(state[3]).toBeLessThanOrEqual(200);
  });

  it("pushes particles away from the pointer", () => {
    const random = createFlowRandom(2);
    const state = new Float32Array([100, 100, 5]);
    const step = {
      width: 200,
      height: 200,
      time: 0,
      delta: 1 / 60,
      speed: 0,
      scale: 1,
      pushRadius: 50,
    };
    stepFlowField(state, 1, random, { ...step, pointer: null });
    expect(state[0]).toBe(100);
    const pushed = new Float32Array([100, 100, 5]);
    stepFlowField(pushed, 1, random, { ...step, speed: 38, pointer: { x: 90, y: 100 } });
    const free = new Float32Array([100, 100, 5]);
    stepFlowField(free, 1, random, { ...step, speed: 38, pointer: null });
    expect(pushed[0] ?? 0).toBeGreaterThan(free[0] ?? 0);
  });
});
