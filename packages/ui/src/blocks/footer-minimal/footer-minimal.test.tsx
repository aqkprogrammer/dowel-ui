import { act, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FooterMinimalBlock } from "./footer-minimal";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FooterMinimalBlock", () => {
  it("is a footer landmark with a named navigation", () => {
    render(<FooterMinimalBlock />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "#terms");
    expect(screen.getByText("© Acme")).toBeInTheDocument();
  });

  it("names social links in text, with or without an icon", () => {
    render(
      <FooterMinimalBlock
        social={[
          { label: "Mail", href: "mailto:a@b.c", icon: <svg /> },
          { label: "Site", href: "https://example.com", external: true },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Social links" });
    expect(within(list).getByRole("link", { name: "Mail" })).toBeInTheDocument();
    expect(
      within(list).getByRole("link", { name: "Site (opens in a new tab)" }),
    ).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("can drop the copyright, the links and the social links", () => {
    render(<FooterMinimalBlock logo="Northwind" copyright={null} links={[]} social={[]} />);
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("© Acme")).not.toBeInTheDocument();
  });

  it("takes localised landmark names", () => {
    render(<FooterMinimalBlock navLabel="Pie de página" socialLabel="Redes" />);
    expect(screen.getByRole("navigation", { name: "Pie de página" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Redes" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FooterMinimalBlock ref={ref} className="bg-muted" />);
    expect(ref.current).toHaveClass("bg-muted");
    expect(ref.current).not.toHaveClass("bg-background");
  });

  it("reveals a footer that starts below the fold once it scrolls in", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 5000,
    } as DOMRect);
    let fire: (() => void) | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          fire = () => {
            callback(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
          };
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<FooterMinimalBlock />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("data-reveal", "pending");
    act(() => {
      fire?.();
    });
    expect(footer).toHaveAttribute("data-reveal", "shown");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FooterMinimalBlock />);
    await expectNoA11yViolations(container);
  });
});
