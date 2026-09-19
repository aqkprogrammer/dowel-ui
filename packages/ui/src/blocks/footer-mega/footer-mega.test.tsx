import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FooterMegaBlock } from "./footer-mega";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FooterMegaBlock", () => {
  it("is a footer landmark with a named navigation of four link groups", () => {
    render(<FooterMegaBlock />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(within(nav).getByRole("link", { name: "Changelog" })).toHaveAttribute(
      "href",
      "#changelog",
    );
  });

  it("shows the logo, and the copyright beside the social links", () => {
    render(<FooterMegaBlock logo={<span>Northwind</span>} />);
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.getByText("© Acme. All rights reserved.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Social links" })).toBeInTheDocument();
  });

  it("subscribes a valid address and rejects an invalid one", async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    render(<FooterMegaBlock onSubscribe={onSubscribe} />);
    const form = screen.getByRole("form", { name: "Subscribe to our newsletter" });
    const field = within(form).getByRole("textbox", { name: "Email address" });

    await user.click(within(form).getByRole("button", { name: "Subscribe" }));
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a valid email address.");

    await user.type(field, "ada@example.com{Enter}");
    expect(onSubscribe).toHaveBeenCalledWith("ada@example.com");
    expect(screen.getByRole("status")).toHaveTextContent("Thanks — you are subscribed.");
  });

  it("uses custom messages", async () => {
    const user = userEvent.setup();
    render(
      <FooterMegaBlock
        newsletter={{
          title: "News",
          description: null,
          successMessage: "Done.",
          invalidMessage: "Bad address.",
        }}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Email address" });
    await user.type(field, "x{Enter}");
    expect(field).toHaveAccessibleDescription("Bad address.");
    await user.clear(field);
    await user.type(field, "x@y.io{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Done.");
  });

  it("can drop the newsletter, the copyright and the social links", () => {
    render(
      <FooterMegaBlock
        newsletter={null}
        copyright={null}
        social={[]}
        description={null}
        headingLevel={4}
      />,
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Social links" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(4);
  });

  it("keeps the social links without a copyright", () => {
    render(
      <FooterMegaBlock
        copyright={null}
        social={[
          { label: "Mail", href: "mailto:a@b.c", icon: <svg /> },
          { label: "Site", href: "https://example.com", external: true },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Mail" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Site (opens in a new tab)" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FooterMegaBlock ref={ref} className="bg-muted" />);
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
    render(<FooterMegaBlock />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("data-reveal", "pending");
    act(() => {
      fire?.();
    });
    expect(footer).toHaveAttribute("data-reveal", "shown");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FooterMegaBlock />);
    await expectNoA11yViolations(container);
  });
});
