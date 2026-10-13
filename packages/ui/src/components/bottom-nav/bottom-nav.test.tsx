import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BottomNav, BottomNavItem } from "./bottom-nav";

const Icon = () => <svg viewBox="0 0 24 24" />;

function Nav() {
  return (
    <BottomNav data-testid="nav">
      <BottomNavItem href="/home" icon={<Icon />} label="Home" active />
      <BottomNavItem
        href="/inbox"
        icon={<Icon />}
        label="Inbox"
        badge={3}
        badgeLabel="unread"
      />
      <BottomNavItem href="/alerts" icon={<Icon />} label="Alerts" badge />
      <BottomNavItem href="/me" icon={<Icon />} label="Me" badge={120} />
    </BottomNav>
  );
}

describe("BottomNav", () => {
  it("is a labelled navigation of named links", async () => {
    const { container } = render(<Nav />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
    await expectNoA11yViolations(container);
  });

  it("marks the current page in words, not colour alone", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Inbox/ })).not.toHaveAttribute("aria-current");
  });

  it("speaks a badge after the label, and caps a large count", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Inbox, 3 unread" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alerts, new" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me, 120 new" })).toHaveTextContent("99+");
  });

  it("renders a router link with asChild", () => {
    render(
      <BottomNav>
        <BottomNavItem asChild icon={<Icon />} label="Search">
          <button type="button" />
        </BottomNavItem>
      </BottomNav>,
    );
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "data-slot",
      "bottom-nav-item",
    );
  });

  it("hides from md up by default, positions as asked, lets className win, forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = render(
      <BottomNav ref={ref} className="bg-card" label="Tabs">
        <BottomNavItem href="#a" icon={<Icon />} label="A" />
      </BottomNav>,
    );
    expect(ref.current).toHaveClass("md:hidden", "fixed", "bg-card");
    expect(ref.current).not.toHaveClass("bg-background/90");
    rerender(
      <BottomNav ref={ref} hideFrom="never" position="static" label="Tabs">
        <BottomNavItem href="#a" icon={<Icon />} label="A" />
      </BottomNav>,
    );
    expect(ref.current).not.toHaveClass("md:hidden");
    expect(ref.current).toHaveClass("relative");
  });
});
