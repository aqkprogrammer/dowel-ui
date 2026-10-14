import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SiteHeaderBlock, type SiteHeaderItem } from "./site-header";

const items: SiteHeaderItem[] = [
  {
    label: "Product",
    links: [{ label: "Features", href: "/features" }],
    featured: { label: "Launch week", href: "/launch" },
  },
  { label: "Pricing", href: "/pricing" },
];

describe("SiteHeaderBlock", () => {
  it("renders a banner with a skip link, brand, menus and actions", async () => {
    const { container } = render(<SiteHeaderBlock items={items} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#content",
    );
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(within(main).getByRole("button", { name: "Product" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(main).getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getAllByRole("link", { name: "Get started" })[0]).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("opens a group's menu with its links and featured card", () => {
    render(<SiteHeaderBlock items={items} />);
    const trigger = screen.getByRole("button", { name: "Product" });
    fireEvent.pointerMove(trigger);
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: /Launch week/ }).length).toBeGreaterThan(0);
  });

  it("lists the same navigation, grouped, in the mobile menu", () => {
    render(<SiteHeaderBlock items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const mobile = screen.getByRole("navigation", { name: "Main mobile" });
    const product = within(mobile).getByRole("list", { name: "Product" });
    expect(
      within(product)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Launch week", "Features"]);
    expect(within(mobile).getByRole("link", { name: "Pricing" })).toBeInTheDocument();
  });

  it("leaves out what is null", () => {
    render(<SiteHeaderBlock items={items} signIn={null} cta={null} skipTo={null} />);
    expect(screen.queryByRole("link", { name: "Skip to content" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
