import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TeamGridBlock } from "./team-grid";

function stubObserver() {
  let fire: ((isIntersecting: boolean) => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        fire = (isIntersecting) => {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        };
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  return { fire: (value = true) => fire?.(value), disconnect };
}

function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

function root(container: HTMLElement) {
  return container.querySelector("[data-slot=team-grid]") as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TeamGridBlock", () => {
  it("is a section named by its heading, listing each member under a heading", () => {
    render(<TeamGridBlock />);
    expect(screen.getByRole("region", { name: "Our team" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 3, name: "Noor Haddad" })).toBeInTheDocument();
    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText("Amman")).toBeInTheDocument();
  });

  it("falls back to hidden initials without a portrait", () => {
    render(
      <TeamGridBlock
        members={[
          { name: "Ada Park", role: "CEO" },
          { name: "Cher", role: "Singer" },
        ]}
      />,
    );
    expect(screen.getByText("AP")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders optional fields only when given", () => {
    render(
      <TeamGridBlock
        description={null}
        members={[
          { name: "Ada Park", role: "CEO", bio: "Likes maps.", avatar: "/ada.png" },
          { name: "Bo Lin", role: "CTO" },
        ]}
      />,
    );
    expect(screen.getByText("Likes maps.")).toBeInTheDocument();
    expect(screen.queryByText("Lisbon")).toBeNull();
  });

  it("re-levels its headings", () => {
    render(<TeamGridBlock headingLevel={1} heading="People" />);
    expect(screen.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<TeamGridBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toBe(root(container));
    expect(root(container)).toHaveClass("max-w-none");
    expect(root(container)).not.toHaveClass("max-w-7xl");
  });

  it("reveals a grid below the fold once it scrolls into view", () => {
    const observer = stubObserver();
    belowFold();
    const { container } = render(<TeamGridBlock />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire();
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("hides nothing on screen, under reduced motion, or without an observer", () => {
    stubObserver();
    const onScreen = render(<TeamGridBlock />);
    expect(root(onScreen.container)).not.toHaveAttribute("data-reveal");
    onScreen.unmount();

    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const reduced = render(<TeamGridBlock />);
    expect(root(reduced.container)).not.toHaveAttribute("data-reveal");
    reduced.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const unsupported = render(<TeamGridBlock />);
    expect(root(unsupported.container)).not.toHaveAttribute("data-reveal");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TeamGridBlock />);
    await expectNoA11yViolations(container);
  });
});
