import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FooterNewsletterBlock } from "./footer-newsletter";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FooterNewsletterBlock", () => {
  it("is a footer landmark with a named navigation of four link groups", () => {
    render(<FooterNewsletterBlock />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(within(nav).getByRole("link", { name: "GDPR" })).toHaveAttribute("href", "#gdpr");
  });

  it("has a newsletter form named by its heading, with a labelled email field", () => {
    render(<FooterNewsletterBlock />);
    const form = screen.getByRole("form", { name: "Stay updated" });
    const field = within(form).getByRole("textbox", { name: "Email address" });
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    expect(within(form).getByRole("button", { name: "Subscribe" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("rejects an invalid address and ties the message to the field", async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    render(<FooterNewsletterBlock onSubscribe={onSubscribe} />);
    const field = screen.getByRole("textbox", { name: "Email address" });

    await user.type(field, "nope");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(onSubscribe).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a valid email address.");

    await user.type(field, "@example.com");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("subscribes a valid address and confirms it in a status region", async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    render(<FooterNewsletterBlock onSubscribe={onSubscribe} />);
    const field = screen.getByRole("textbox", { name: "Email address" });

    await user.type(field, " ada@example.com {Enter}");
    expect(onSubscribe).toHaveBeenCalledWith("ada@example.com");
    expect(screen.getByRole("status")).toHaveTextContent("Thanks — you are subscribed.");
    expect(field).toHaveValue("");

    await user.type(field, "b");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("takes the form's text from props, or drops the form", () => {
    const { unmount } = render(
      <FooterNewsletterBlock
        newsletter={{
          title: "Boletín",
          inputLabel: "Correo",
          buttonLabel: "Suscribirse",
          placeholder: "tu@correo.es",
        }}
      />,
    );
    expect(screen.getByRole("form", { name: "Boletín" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Correo" })).toHaveAttribute(
      "placeholder",
      "tu@correo.es",
    );
    unmount();
    render(<FooterNewsletterBlock newsletter={null} />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("names social links in text and can drop optional parts", () => {
    render(
      <FooterNewsletterBlock
        description={null}
        copyright={null}
        headingLevel={3}
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
    ).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
  });

  it("hides the social list when empty", () => {
    render(<FooterNewsletterBlock social={[]} />);
    expect(screen.queryByRole("list", { name: "Social links" })).not.toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FooterNewsletterBlock ref={ref} className="bg-muted" />);
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
    render(<FooterNewsletterBlock />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("data-reveal", "pending");
    act(() => {
      fire?.();
    });
    expect(footer).toHaveAttribute("data-reveal", "shown");
  });

  it("has no accessibility violations, including with an error showing", async () => {
    const user = userEvent.setup();
    const { container } = render(<FooterNewsletterBlock />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await expectNoA11yViolations(container);
  });
});
