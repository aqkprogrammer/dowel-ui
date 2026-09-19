import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CursorFollow } from "./cursor-follow";

function follower(container: HTMLElement) {
  return container.querySelector('[data-slot="cursor-follow-follower"]');
}

function Example(props: Parameters<typeof CursorFollow>[0]) {
  return (
    <CursorFollow data-testid="area" {...props}>
      <img src="https://img.test/a.jpg" alt="A chair" data-cursor-text="View chair" />
      <p>Plain text</p>
    </CursorFollow>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CursorFollow", () => {
  it("renders a decorative, hidden follower until the pointer enters", () => {
    const { container } = render(<Example />);
    const layer = container.querySelector('[data-slot="cursor-follow-layer"]');
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(follower(container)).toHaveAttribute("data-state", "hidden");
    expect(screen.getByTestId("area")).not.toHaveAttribute("role");
    expect(screen.getByTestId("area")).not.toHaveAttribute("tabindex");
  });

  it("shows on pointer enter and move, and hides on leave", () => {
    const { container } = render(<Example />);
    const area = screen.getByTestId("area");
    vi.spyOn(area, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 10, 300, 200));

    fireEvent.pointerEnter(area, { clientX: 50, clientY: 60, pointerType: "mouse" });
    expect(follower(container)).toHaveAttribute("data-state", "visible");
    fireEvent.pointerMove(area, { clientX: 80, clientY: 90, pointerType: "mouse" });
    expect(follower(container)).toHaveAttribute("data-state", "visible");

    fireEvent.pointerLeave(area);
    expect(follower(container)).toHaveAttribute("data-state", "hidden");
  });

  it("appears on a first move without an enter event", () => {
    const { container } = render(<Example />);
    fireEvent.pointerMove(screen.getByTestId("area"), { clientX: 5, clientY: 5 });
    expect(follower(container)).toHaveAttribute("data-state", "visible");
  });

  it("swells into the label of a data-cursor-text element", () => {
    const { container } = render(<Example />);
    const area = screen.getByTestId("area");
    fireEvent.pointerEnter(area);
    fireEvent.pointerOver(screen.getByRole("img", { name: "A chair" }));
    expect(follower(container)).toHaveAttribute("data-labelled");
    expect(follower(container)).toHaveTextContent("View chair");

    fireEvent.pointerOver(screen.getByText("Plain text"));
    expect(follower(container)).not.toHaveAttribute("data-labelled");

    fireEvent.pointerOver(screen.getByRole("img"));
    fireEvent.pointerLeave(area);
    expect(follower(container)).toBeEmptyDOMElement();
  });

  it("ignores touch", () => {
    const { container } = render(<Example />);
    const area = screen.getByTestId("area");
    fireEvent.pointerEnter(area, { pointerType: "touch" });
    fireEvent.pointerMove(area, { pointerType: "touch" });
    expect(follower(container)).toHaveAttribute("data-state", "hidden");
  });

  it("renders nothing under reduced motion and keeps the system cursor", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<Example hideCursor />);
    const area = screen.getByTestId("area");
    fireEvent.pointerEnter(area);
    expect(follower(container)).toBeNull();
    expect(area).not.toHaveClass("cursor-none");
  });

  it("hides the system cursor only when asked", () => {
    const { rerender } = render(<Example />);
    expect(screen.getByTestId("area")).not.toHaveClass("cursor-none");
    rerender(<Example hideCursor />);
    expect(screen.getByTestId("area")).toHaveClass("cursor-none");
  });

  it("styles the follower by appearance", () => {
    const { container, rerender } = render(<Example />);
    expect(follower(container)).toHaveClass("bg-primary");
    rerender(<Example appearance="invert" followerClassName="shadow-none" />);
    expect(follower(container)).toHaveClass("backdrop-invert", "shadow-none");
    rerender(<Example appearance="blur" />);
    expect(follower(container)).toHaveClass("backdrop-blur-sm");
  });

  it("forwards pointer handlers", () => {
    const handlers = {
      onPointerEnter: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerLeave: vi.fn(),
      onPointerOver: vi.fn(),
    };
    render(<Example {...handlers} />);
    const area = screen.getByTestId("area");
    fireEvent.pointerEnter(area);
    fireEvent.pointerMove(area);
    fireEvent.pointerOver(area);
    fireEvent.pointerLeave(area);
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });

  it("lets the consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} className="static" />);
    const area = screen.getByTestId("area");
    expect(ref.current).toBe(area);
    expect(area).toHaveClass("static");
    expect(area).not.toHaveClass("relative");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Example />);
    fireEvent.pointerEnter(screen.getByTestId("area"));
    fireEvent.pointerOver(screen.getByRole("img"));
    await expectNoA11yViolations(container);
  });
});
