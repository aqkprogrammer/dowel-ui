import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        {["One", "Two", "Three"].map((label) => (
          <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Nested</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-dropdown-menu"]');
}

describe("DropdownMenu motion", () => {
  it("pops the surface and staggers its items, like ContextMenu", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Actions"));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass(
      "data-[state=open]:animate-[dowel-dropdown-menu-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
      "data-[state=closed]:animate-float-out",
    );
    expect(menu.className).toContain("dowel-dropdown-menu-item-in");
    expect(stylesheet()?.textContent).toContain(
      "[data-slot$=dropdown-menu-content]>:nth-child(2){animation-delay:calc(20ms * var(--motion-scale))}",
    );
  });

  it("ships its keyframes once, hoisted", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <Example />
      </>,
    );
    await user.click(screen.getAllByText("Actions")[0] as HTMLElement);
    await screen.findByRole("menu");
    expect(document.querySelectorAll('style[data-href="dowel-dropdown-menu"]')).toHaveLength(1);
  });

  it("scales every duration and delay by --motion-scale, so reduced motion settles instantly", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Actions"));
    await screen.findByRole("menu");

    const css = stylesheet()?.textContent ?? "";
    const timings = css.match(/calc\([^)]*\)/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) expect(timing).toContain("var(--motion-scale)");
  });

  it("keeps the keyboard model: arrows move through the staggered items", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Actions"));
    await screen.findByRole("menu");

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "One" })).toHaveFocus();
    });
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Two" })).toHaveFocus();
  });

  it("gives submenus the same surface motion", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Actions"));
    const trigger = await screen.findByRole("menuitem", { name: "More" });
    trigger.focus();
    await user.keyboard("{ArrowRight}");

    const nested = await screen.findByRole("menuitem", { name: "Nested" });
    expect(nested.closest("[data-slot='dropdown-menu-sub-content']")?.className).toContain(
      "dowel-dropdown-menu-in",
    );
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByText("Actions"));
    await screen.findByRole("menu");
    await expectNoA11yViolations(baseElement);
  });
});
