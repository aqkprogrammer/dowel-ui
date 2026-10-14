import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarContent,
  NavbarMobileMenu,
  NavbarSkipLink,
  type NavbarProps,
} from "./navbar";

function Bar(props: NavbarProps) {
  return (
    <Navbar data-testid="bar" {...props}>
      <NavbarSkipLink />
      <NavbarBrand href="/">Dowel</NavbarBrand>
      <NavbarContent>
        <nav aria-label="Main">
          <a href="#docs">Docs</a>
        </nav>
      </NavbarContent>
      <NavbarActions>
        <button type="button">Sign in</button>
        <NavbarMobileMenu>
          <nav aria-label="Mobile">
            <a href="#docs-mobile">Docs</a>
          </nav>
        </NavbarMobileMenu>
      </NavbarActions>
    </Navbar>
  );
}

async function scrollTo(y: number) {
  await act(async () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: y });
    window.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

const bar = () => screen.getByTestId("bar");
const menuButton = () => screen.getByRole("button", { name: "Menu" });

describe("Navbar", () => {
  afterEach(async () => {
    await scrollTo(0);
  });

  it("is a banner with a skip link, a brand, navigation and actions", async () => {
    const { container } = render(<Bar />);
    expect(screen.getByRole("banner")).toBe(bar());
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#content",
    );
    expect(screen.getByRole("link", { name: "Dowel" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("opens and closes the mobile menu as a disclosure", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    const panel = document.getElementById(menuButton().getAttribute("aria-controls") ?? "");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
    await user.click(menuButton());
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
    await user.keyboard("{Escape}");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes the mobile menu when a link in it is followed", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(menuButton());
    const link = document.querySelector<HTMLElement>("a[href='#docs-mobile']");
    if (!link) throw new Error("no mobile link");
    await user.click(link);
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("lifts once the page scrolls, when elevate is on", async () => {
    const { rerender } = render(<Bar />);
    expect(bar()).not.toHaveAttribute("data-scrolled");
    await scrollTo(200);
    expect(bar()).toHaveAttribute("data-scrolled", "true");
    expect(bar()).toHaveClass("shadow-sm");
    rerender(<Bar elevate={false} />);
    expect(bar()).not.toHaveClass("shadow-sm");
  });

  it("hides on scrolling down and returns on scrolling up, but never while it holds focus", async () => {
    render(<Bar behavior="hide-on-scroll" />);
    await scrollTo(400);
    expect(bar()).toHaveAttribute("data-hidden", "true");
    await scrollTo(300);
    expect(bar()).not.toHaveAttribute("data-hidden");
    await scrollTo(800);
    expect(bar()).toHaveAttribute("data-hidden", "true");
    act(() => {
      screen.getByRole("button", { name: "Sign in" }).focus();
    });
    expect(bar()).not.toHaveAttribute("data-hidden");
  });

  it("styles each variant and behaviour, lets className win, forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = render(
      <Bar ref={ref} variant="floating" behavior="static" className="z-0" />,
    );
    expect(ref.current).toBe(bar());
    expect(bar()).toHaveClass("relative", "z-0");
    expect(bar().querySelector("[data-slot=navbar-inner]")).toHaveClass("rounded-2xl");
    rerender(<Bar variant="glass" />);
    expect(bar()).toHaveClass("sticky", "backdrop-blur-md");
  });

  it("refuses a mobile menu outside a navbar", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<NavbarMobileMenu />)).toThrow(
      "<NavbarMobileMenu> must be used inside <Navbar>.",
    );
    vi.restoreAllMocks();
  });
});
