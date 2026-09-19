import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GlowCard, GlowCardGroup } from "./glow-card";

function rectAt(left: number, top: number) {
  return () => ({
    x: left,
    y: top,
    left,
    top,
    width: 200,
    height: 100,
    right: left + 200,
    bottom: top + 100,
    toJSON: () => ({}),
  });
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

afterEach(() => {
  vi.restoreAllMocks();
});

function Group() {
  return (
    <GlowCardGroup data-testid="group" radius={320}>
      <GlowCard data-testid="a">
        <h2>Design System</h2>
      </GlowCard>
      <GlowCard data-testid="b" tone="success">
        <h2>Components</h2>
      </GlowCard>
    </GlowCardGroup>
  );
}

describe("GlowCard", () => {
  it("renders content with an aria-hidden decorative glow layer", () => {
    render(<GlowCard>Content</GlowCard>);
    const card = screen.getByText("Content");
    const glow = card.querySelector('[data-slot="glow-card-glow"]');
    expect(card).toHaveAttribute("data-slot", "glow-card");
    expect(glow).toHaveAttribute("aria-hidden", "true");
    expect(glow?.className).toContain("pointer-events-none");
    expect(glow?.className).toContain("motion-reduce:hidden");
  });

  it("writes pointer position onto every card in a group, relative to each card", () => {
    render(<Group />);
    const a = screen.getByTestId("a");
    const b = screen.getByTestId("b");
    a.getBoundingClientRect = rectAt(0, 0);
    b.getBoundingClientRect = rectAt(240, 0);

    fireEvent.pointerMove(screen.getByTestId("group"), {
      clientX: 100,
      clientY: 40,
      pointerType: "mouse",
    });

    expect(a.style.getPropertyValue("--glow-x")).toBe("100px");
    expect(a.style.getPropertyValue("--glow-y")).toBe("40px");
    expect(b.style.getPropertyValue("--glow-x")).toBe("-140px");
    expect(a.style.getPropertyValue("--glow-opacity")).toBe("1");
    expect(b.style.getPropertyValue("--glow-opacity")).toBe("1");
    expect(screen.getByTestId("group").style.getPropertyValue("--glow-radius")).toBe("320px");
  });

  it("fades every card when the pointer leaves the group", () => {
    render(<Group />);
    const group = screen.getByTestId("group");
    fireEvent.pointerMove(group, { clientX: 10, clientY: 10, pointerType: "mouse" });
    fireEvent.pointerLeave(group);
    expect(screen.getByTestId("a").style.getPropertyValue("--glow-opacity")).toBe("0");
    expect(screen.getByTestId("b").style.getPropertyValue("--glow-opacity")).toBe("0");
  });

  it("does nothing for touch input", () => {
    render(<Group />);
    fireEvent.pointerMove(screen.getByTestId("group"), {
      clientX: 10,
      clientY: 10,
      pointerType: "touch",
    });
    expect(screen.getByTestId("a").style.getPropertyValue("--glow-x")).toBe("");
  });

  it("does nothing under reduced motion", () => {
    mockReducedMotion(true);
    render(<Group />);
    fireEvent.pointerMove(screen.getByTestId("group"), {
      clientX: 10,
      clientY: 10,
      pointerType: "mouse",
    });
    expect(screen.getByTestId("a").style.getPropertyValue("--glow-x")).toBe("");
  });

  it("tracks itself when used outside a group", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <GlowCard
        data-testid="solo"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        Solo
      </GlowCard>,
    );
    const card = screen.getByTestId("solo");
    card.getBoundingClientRect = rectAt(20, 10);
    fireEvent.pointerMove(card, { clientX: 50, clientY: 30, pointerType: "mouse" });
    expect(card.style.getPropertyValue("--glow-x")).toBe("30px");
    expect(card.style.getPropertyValue("--glow-y")).toBe("20px");
    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue("--glow-opacity")).toBe("0");
    expect(onPointerMove).toHaveBeenCalledOnce();
    expect(onPointerLeave).toHaveBeenCalledOnce();
  });

  it("forwards the group's own pointer handlers", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <GlowCardGroup
        data-testid="g"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <GlowCard>One</GlowCard>
      </GlowCardGroup>,
    );
    const group = screen.getByTestId("g");
    fireEvent.pointerMove(group, { pointerType: "mouse" });
    fireEvent.pointerLeave(group);
    expect(onPointerMove).toHaveBeenCalledOnce();
    expect(onPointerLeave).toHaveBeenCalledOnce();
    expect(group.style.getPropertyValue("--glow-radius")).toBe("");
  });

  it("sets colour, intensity and radius as custom properties", () => {
    render(
      <GlowCard
        data-testid="c"
        glowColor="var(--color-info)"
        intensity={0.3}
        radius={120}
        style={{ padding: 4 }}
      >
        Tuned
      </GlowCard>,
    );
    const card = screen.getByTestId("c");
    expect(card.style.getPropertyValue("--glow-color")).toBe("var(--color-info)");
    expect(card.style.getPropertyValue("--glow-fill")).toBe("30%");
    expect(card.style.getPropertyValue("--glow-radius")).toBe("120px");
    expect(card.style.padding).toBe("4px");
  });

  it("maps tone to the glow colour", () => {
    render(<GlowCard tone="warning">Warn</GlowCard>);
    expect(screen.getByText("Warn").className).toContain("[--glow-color:var(--color-warning)]");
  });

  it("renders as the child element with asChild", () => {
    render(
      <GlowCard asChild>
        <a href="/pricing">Pricing</a>
      </GlowCard>,
    );
    const link = screen.getByRole("link", { name: "Pricing" });
    expect(link).toHaveAttribute("data-slot", "glow-card");
    expect(link.querySelector('[data-slot="glow-card-glow"]')).not.toBeNull();
  });

  it("lets a consumer className win", () => {
    render(
      <>
        <GlowCard className="rounded-none">Card</GlowCard>
        <GlowCardGroup className="static" data-testid="g">
          <GlowCard>In group</GlowCard>
        </GlowCardGroup>
      </>,
    );
    expect(screen.getByText("Card")).toHaveClass("rounded-none");
    expect(screen.getByText("Card")).not.toHaveClass("rounded-xl");
    expect(screen.getByTestId("g")).toHaveClass("static");
    expect(screen.getByTestId("g")).not.toHaveClass("relative");
  });

  it("forwards refs", () => {
    const card = createRef<HTMLDivElement>();
    const group = createRef<HTMLDivElement>();
    render(
      <GlowCardGroup ref={group}>
        <GlowCard ref={card}>Ref</GlowCard>
      </GlowCardGroup>,
    );
    expect(card.current).toBeInstanceOf(HTMLDivElement);
    expect(group.current).toBeInstanceOf(HTMLDivElement);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Group />);
    await expectNoA11yViolations(container);
  });
});
