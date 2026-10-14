import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CursorSpotlight } from "./cursor-spotlight";

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

const root = () => screen.getByTestId("spot");
const light = () => root().querySelector<HTMLElement>("[data-slot=cursor-spotlight-light]");

describe("CursorSpotlight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its content with a hidden, decorative light", async () => {
    const { container } = render(
      <CursorSpotlight data-testid="spot">
        <h2>Lights on</h2>
      </CursorSpotlight>,
    );
    expect(light()).toHaveAttribute("aria-hidden", "true");
    expect(light()).toHaveClass("pointer-events-none");
    expect(root().style.getPropertyValue("--cursor-spotlight-opacity")).toBe("0");
    expect(screen.getByRole("heading", { name: "Lights on" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("follows a mouse inside the box and fades when it leaves", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 50, 600, 300),
    );
    render(<CursorSpotlight data-testid="spot" />);
    fireEvent.pointerMove(root(), { clientX: 400, clientY: 200, pointerType: "mouse" });
    expect(root().style.getPropertyValue("--cursor-spotlight-x")).toBe("300px");
    expect(root().style.getPropertyValue("--cursor-spotlight-y")).toBe("150px");
    expect(root().style.getPropertyValue("--cursor-spotlight-opacity")).toBe("1");
    fireEvent.pointerLeave(root());
    expect(root().style.getPropertyValue("--cursor-spotlight-opacity")).toBe("0");
  });

  it("ignores touch, and is absent under reduced motion", () => {
    const { unmount } = render(<CursorSpotlight data-testid="spot" />);
    fireEvent.pointerMove(root(), { clientX: 10, clientY: 10, pointerType: "touch" });
    expect(root().style.getPropertyValue("--cursor-spotlight-opacity")).toBe("0");
    unmount();
    mockReducedMotion(true);
    render(<CursorSpotlight data-testid="spot" />);
    expect(light()).toBeNull();
    fireEvent.pointerMove(root(), { clientX: 10, clientY: 10, pointerType: "mouse" });
    expect(root().style.getPropertyValue("--cursor-spotlight-opacity")).toBe("0");
  });

  it("glows behind in light mode and dims over the content in reveal mode", () => {
    const { rerender } = render(
      <CursorSpotlight data-testid="spot" color="info" intensity={0.4} />,
    );
    expect(light()).toHaveClass("z-0");
    expect(light()?.style.backgroundImage).toContain("var(--color-info) 40%");
    rerender(<CursorSpotlight data-testid="spot" mode="reveal" />);
    expect(root()).toHaveAttribute("data-mode", "reveal");
    expect(light()).toHaveClass("z-20");
    expect(light()?.style.backgroundImage).toContain("var(--color-background) 70%");
    rerender(<CursorSpotlight data-testid="spot" mode="reveal" layer="behind" radius={5} />);
    expect(light()).toHaveClass("z-0");
    expect(root().style.getPropertyValue("--cursor-spotlight-radius")).toBe("10px");
  });

  it("lets className win, forwards its ref and merges style", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <CursorSpotlight
        ref={ref}
        data-testid="spot"
        className="isolation-auto"
        style={{ minHeight: 120 }}
      />,
    );
    expect(ref.current).toBe(root());
    expect(root()).toHaveClass("isolation-auto");
    expect(root()).not.toHaveClass("isolate");
    expect(root().style.minHeight).toBe("120px");
  });
});
