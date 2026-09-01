import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function Example({ onSelect }: { onSelect?: () => void } = {}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelect}>
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Billing</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete account</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("is closed until the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("reports its state on the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("opens from the keyboard and focuses the first item", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /Profile/ })).toHaveFocus();
    });
  });

  it("moves between items with the arrow keys, skipping disabled ones", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /Profile/ })).toHaveFocus();
    });

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Delete account" })).toHaveFocus();
    });
  });

  it("selects an item and closes", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Example onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Profile/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("does not select a disabled item", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    const billing = await screen.findByRole("menuitem", { name: "Billing" });

    expect(billing).toHaveAttribute("data-disabled");
    await user.click(billing);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("marks a destructive item for styling", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    const item = await screen.findByRole("menuitem", { name: "Delete account" });
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(item).toHaveClass("text-destructive");
  });

  it("hides the shortcut hint from assistive technology", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    const shortcut = baseElement.querySelector("[data-slot='dropdown-menu-shortcut']");
    expect(shortcut).toHaveAttribute("aria-hidden", "true");
  });

  it("toggles a checkbox item", async () => {
    const user = userEvent.setup();

    function WithCheckbox() {
      const [checked, setChecked] = useState(false);
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>View</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
              Status bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    render(<WithCheckbox />);
    await user.click(screen.getByText("View"));

    const item = await screen.findByRole("menuitemcheckbox", { name: "Status bar" });
    expect(item).toHaveAttribute("aria-checked", "false");

    await user.click(item);
    await user.click(screen.getByText("View"));
    await waitFor(() => {
      expect(screen.getByRole("menuitemcheckbox", { name: "Status bar" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });

  it("selects a radio item", async () => {
    const user = userEvent.setup();

    function WithRadio() {
      const [value, setValue] = useState("light");
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>Theme</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    render(<WithRadio />);
    await user.click(screen.getByText("Theme"));
    expect(await screen.findByRole("menuitemradio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));
    await user.click(screen.getByText("Theme"));
    await waitFor(() => {
      expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });

  describe("submenus", () => {
    function WithSubmenu() {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>Share</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite people</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>By email</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    it("opens a submenu with the right arrow key", async () => {
      const user = userEvent.setup();
      render(<WithSubmenu />);

      await user.click(screen.getByText("Share"));
      await screen.findByRole("menu");

      const subTrigger = screen.getByRole("menuitem", { name: "Invite people" });
      expect(subTrigger).toHaveAttribute("aria-expanded", "false");

      subTrigger.focus();
      await user.keyboard("{ArrowRight}");

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: "By email" })).toBeInTheDocument();
      });
      expect(subTrigger).toHaveAttribute("aria-expanded", "true");
    });

    it("closes a submenu with the left arrow key", async () => {
      const user = userEvent.setup();
      render(<WithSubmenu />);

      await user.click(screen.getByText("Share"));
      const subTrigger = await screen.findByRole("menuitem", { name: "Invite people" });

      subTrigger.focus();
      await user.keyboard("{ArrowRight}");
      await screen.findByRole("menuitem", { name: "By email" });

      await user.keyboard("{ArrowLeft}");
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "By email" })).not.toBeInTheDocument();
      });
    });

    it("has no accessibility violations with a submenu open", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<WithSubmenu />);

      await user.click(screen.getByText("Share"));
      const subTrigger = await screen.findByRole("menuitem", { name: "Invite people" });
      subTrigger.focus();
      await user.keyboard("{ArrowRight}");
      await screen.findByRole("menuitem", { name: "By email" });

      await expectNoA11yViolations(baseElement);
    });
  });

  it("merges a consumer className on the content", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open"));
    expect(await screen.findByRole("menu")).toHaveClass("w-64");
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    await expectNoA11yViolations(baseElement);
  });
});
