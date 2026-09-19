import { act, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FooterSimpleBlock } from "./footer-simple";

function stubObserver() {
  let fire: ((isIntersecting: boolean) => void) | undefined;
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
      disconnect() {}
    },
  );
  return (value = true) => fire?.(value);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FooterSimpleBlock", () => {
  it("is a footer landmark with a named navigation of link groups", () => {
    render(<FooterSimpleBlock />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "#pricing",
    );
  });

  it("names social links in text, with or without an icon", () => {
    render(
      <FooterSimpleBlock
        social={[
          { label: "Mail", href: "mailto:a@b.c", icon: <svg data-testid="icon" /> },
          { label: "Forum", href: "https://example.com", external: true },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Social links" });
    expect(within(list).getByRole("link", { name: "Mail" })).toBeInTheDocument();
    const forum = within(list).getByRole("link", { name: "Forum (opens in a new tab)" });
    expect(forum).toHaveAttribute("target", "_blank");
    expect(forum).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("takes its content from props, and can drop the optional parts", () => {
    render(
      <FooterSimpleBlock
        brand="Northwind"
        description={null}
        social={[]}
        copyright={null}
        groups={[{ title: "Legal", links: [{ label: "Terms", href: "/terms" }] }]}
        navLabel="Site"
        headingLevel={3}
      />,
    );
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Social links" })).not.toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Site" })).getByRole("heading", {
        level: 3,
        name: "Legal",
      }),
    ).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FooterSimpleBlock ref={ref} className="bg-muted" />);
    expect(ref.current).toHaveClass("bg-muted");
    expect(ref.current).not.toHaveClass("bg-background");
    expect(ref.current?.tagName).toBe("FOOTER");
  });

  it("reveals a footer that starts below the fold once it scrolls in", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 5000,
    } as DOMRect);
    const fire = stubObserver();
    const ref = vi.fn();
    render(<FooterSimpleBlock ref={ref} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("data-reveal", "pending");
    act(() => {
      fire();
    });
    expect(footer).toHaveAttribute("data-reveal", "shown");
    expect(ref).toHaveBeenCalledWith(footer);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FooterSimpleBlock />);
    await expectNoA11yViolations(container);
  });
});
