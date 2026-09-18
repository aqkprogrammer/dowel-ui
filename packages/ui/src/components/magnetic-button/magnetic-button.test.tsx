import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MagneticButton } from "./magnetic-button";

/*
 * jsdom does not lay out, so each test pins the button's rest box to
 * 100 × 40 at the origin — centre (50, 20) — and reads the offset the
 * component writes. The rect is reported shifted by whatever transform is
 * applied, as a browser would, so the "measure at rest" logic is exercised.
 */
function pinGeometry(element: HTMLElement) {
  vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => {
    const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(element.style.transform);
    const x = match ? Number(match[1]) : 0;
    const y = match ? Number(match[2]) : 0;
    return DOMRect.fromRect({ x, y, width: 100, height: 40 });
  });
}

function media(matching: string[]) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matching.includes(query),
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

function renderPinned(ui: React.ReactElement) {
  const result = render(ui);
  const element = screen.getByRole("button");
  pinGeometry(element);
  return { ...result, element };
}

function move(
  target: Element | Window,
  clientX: number,
  clientY: number,
  pointerType = "mouse",
) {
  fireEvent.pointerMove(target, { clientX, clientY, pointerType });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MagneticButton", () => {
  it("renders a button with its label", () => {
    render(<MagneticButton>Magnetic Field</MagneticButton>);
    const element = screen.getByRole("button", { name: "Magnetic Field" });
    expect(element).toHaveAttribute("data-slot", "magnetic-button");
    expect(element).toHaveAttribute("data-magnetic", "rest");
  });

  it("drifts toward the pointer by the default strength", () => {
    const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
    move(element, 90, 30);
    // (90 - 50) × 0.35, (30 - 20) × 0.35
    expect(element.style.transform).toBe("translate3d(14px, 3.5px, 0)");
    expect(element).toHaveAttribute("data-magnetic", "follow");
  });

  it("measures from where it rests, not where it has drifted to", () => {
    const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
    move(element, 90, 30);
    move(element, 90, 30);
    expect(element.style.transform).toBe("translate3d(14px, 3.5px, 0)");
  });

  it("scales the drift with strength", () => {
    const { element } = renderPinned(<MagneticButton strength={0.5}>Go</MagneticButton>);
    move(element, 0, 0);
    expect(element.style.transform).toBe("translate3d(-25px, -10px, 0)");
  });

  it("springs back when the pointer leaves", () => {
    const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
    move(element, 90, 30);
    fireEvent.pointerLeave(element);
    expect(element.style.transform).toBe("");
    expect(element).toHaveAttribute("data-magnetic", "rest");
  });

  it("does not re-render on pointer move", () => {
    const onRender = vi.fn();
    function Probe() {
      onRender();
      return <span>Go</span>;
    }
    const { element } = renderPinned(
      <MagneticButton>
        <Probe />
      </MagneticButton>,
    );
    const renders = onRender.mock.calls.length;
    move(element, 90, 30);
    move(element, 10, 10);
    fireEvent.pointerLeave(element);
    expect(onRender).toHaveBeenCalledTimes(renders);
  });

  it("still calls the consumer's pointer handlers", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { element } = renderPinned(
      <MagneticButton onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        Go
      </MagneticButton>,
    );
    move(element, 90, 30);
    fireEvent.pointerLeave(element);
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  describe("stays put", () => {
    it("for users who prefer reduced motion", () => {
      media(["(prefers-reduced-motion: reduce)"]);
      const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
      move(element, 90, 30);
      expect(element.style.transform).toBe("");
    });

    it("on a coarse pointer", () => {
      media(["(pointer: coarse)"]);
      const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
      move(element, 90, 30);
      expect(element.style.transform).toBe("");
    });

    it("for touch", () => {
      const { element } = renderPinned(<MagneticButton>Go</MagneticButton>);
      move(element, 90, 30, "touch");
      expect(element.style.transform).toBe("");
    });

    it("while loading", () => {
      const { element } = renderPinned(<MagneticButton loading>Go</MagneticButton>);
      move(element, 90, 30);
      expect(element.style.transform).toBe("");
    });

    it("with a strength of zero", () => {
      const { element } = renderPinned(<MagneticButton strength={0}>Go</MagneticButton>);
      move(element, 90, 30);
      expect(element.style.transform).toBe("");
    });

    it("and returns home when disabled mid-drift", () => {
      const { element, rerender } = renderPinned(<MagneticButton>Go</MagneticButton>);
      move(element, 90, 30);
      rerender(<MagneticButton disabled>Go</MagneticButton>);
      expect(element.style.transform).toBe("");
      expect(element).toBeDisabled();
    });
  });

  describe("contentStrength", () => {
    it("moves the content further than the button", () => {
      const { element } = renderPinned(
        <MagneticButton strength={0.25} contentStrength={0.5}>
          Go
        </MagneticButton>,
      );
      const content = element.querySelector<HTMLElement>(
        '[data-slot="magnetic-button-content"]',
      );
      move(element, 90, 20);
      expect(element.style.transform).toBe("translate3d(10px, 0px, 0)");
      // Relative to the button: 40 × (0.5 − 0.25) = 10 more, 20 in total.
      expect(content?.style.transform).toBe("translate3d(10px, 0px, 0)");

      fireEvent.pointerLeave(element);
      expect(content?.style.transform).toBe("");
    });

    it("does not wrap an asChild element", () => {
      render(
        <MagneticButton asChild contentStrength={0.6}>
          <a href="/docs">Docs</a>
        </MagneticButton>,
      );
      const link = screen.getByRole("link", { name: "Docs" });
      expect(link).toHaveAttribute("data-slot", "magnetic-button");
      expect(link.querySelector('[data-slot="magnetic-button-content"]')).toBeNull();
    });
  });

  describe("radius", () => {
    it("feels the pointer beyond its edges, fading with distance", () => {
      const { element } = renderPinned(<MagneticButton radius={100}>Go</MagneticButton>);
      // 50px right of the right edge: half strength.
      move(window, 150, 20);
      expect(element.style.transform).toBe("translate3d(17.5px, 0px, 0)");
    });

    it("pulls at full strength inside its bounds", () => {
      const { element } = renderPinned(<MagneticButton radius={100}>Go</MagneticButton>);
      move(window, 90, 30);
      expect(element.style.transform).toBe("translate3d(14px, 3.5px, 0)");
    });

    it("lets go beyond the radius", () => {
      const { element } = renderPinned(<MagneticButton radius={100}>Go</MagneticButton>);
      move(window, 150, 20);
      move(window, 400, 20);
      expect(element.style.transform).toBe("");
    });

    it("lets go when the pointer leaves the page", () => {
      const { element } = renderPinned(<MagneticButton radius={100}>Go</MagneticButton>);
      move(window, 90, 30);
      fireEvent.pointerLeave(document.documentElement);
      expect(element.style.transform).toBe("");
    });

    it("stops listening on unmount", () => {
      const remove = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(<MagneticButton radius={100}>Go</MagneticButton>);
      unmount();
      expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    });
  });

  it("activates from the keyboard", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<MagneticButton onClick={onClick}>Go</MagneticButton>);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("passes variant and size through to Button", () => {
    render(
      <MagneticButton variant="outline" size="lg">
        Go
      </MagneticButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-input", "h-10");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <MagneticButton className="h-20 duration-[var(--duration-normal)]">Go</MagneticButton>,
    );
    const element = screen.getByRole("button");
    expect(element).toHaveClass("h-20", "duration-[var(--duration-normal)]");
    expect(element).not.toHaveClass("h-9");
  });

  it("forwards object and callback refs", () => {
    const ref = createRef<HTMLButtonElement>();
    const { unmount } = render(<MagneticButton ref={ref}>Go</MagneticButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    unmount();

    const callback = vi.fn();
    render(<MagneticButton ref={callback}>Go</MagneticButton>);
    expect(callback).toHaveBeenCalledWith(screen.getByRole("button"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <MagneticButton>Magnetic Field</MagneticButton>
        <MagneticButton contentStrength={0.6}>Layered</MagneticButton>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
