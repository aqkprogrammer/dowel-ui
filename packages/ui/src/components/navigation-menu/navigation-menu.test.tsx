import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

function Menu() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul>
              <li>
                <NavigationMenuLink href="#components">Components</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#blocks">Blocks</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing" active className={navigationMenuTriggerStyle()}>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("is a labelled navigation whose triggers report whether they are open", async () => {
    const { baseElement } = render(<Menu />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expectNoA11yViolations(baseElement);
  });

  it("opens a panel on click and shows its links", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Product" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Components" })).toBeInTheDocument();
    await expectNoA11yViolations(baseElement);
  });

  it("opens from the keyboard and closes with Escape, returning focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Product" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("marks the current page's link, and styles a bar link like a trigger", () => {
    render(<Menu />);
    const pricing = screen.getByRole("link", { name: "Pricing" });
    expect(pricing).toHaveAttribute("aria-current", "page");
    expect(pricing).toHaveClass("h-9", "rounded-md");
  });
});
