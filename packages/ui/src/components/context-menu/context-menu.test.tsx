import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

function Example({ onSelect }: { onSelect?: () => void } = {}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button type="button">Right-click here</button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Page</ContextMenuLabel>
        <ContextMenuGroup>
          <ContextMenuItem onSelect={onSelect}>
            Back
            <ContextMenuShortcut>⌘[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>Forward</ContextMenuItem>
          <ContextMenuItem>Reload</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Save page as…</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem variant="destructive" inset>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

async function open() {
  fireEvent.contextMenu(screen.getByText("Right-click here"), { clientX: 40, clientY: 40 });
  return screen.findByRole("menu");
}

describe("ContextMenu", () => {
  it("is closed until the trigger is right-clicked", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.pointer({ target: screen.getByText("Right-click here"), keys: "[MouseRight]" });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("opens from the keyboard's context-menu event on a focused trigger", async () => {
    render(<Example />);
    const trigger = screen.getByText("Right-click here");
    trigger.focus();
    fireEvent.contextMenu(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("moves between items with the arrow keys, skipping disabled ones", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /Back/ })).toHaveFocus();
    });
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Reload" })).toHaveFocus();
    });
  });

  it("selects an item and closes", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Example onSelect={onSelect} />);
    await open();
    await user.click(screen.getByRole("menuitem", { name: /Back/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("does not select a disabled item", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open();
    const forward = screen.getByRole("menuitem", { name: "Forward" });
    expect(forward).toHaveAttribute("data-disabled");
    await user.click(forward);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("styles destructive and inset items, and hides shortcuts", async () => {
    const { baseElement } = render(<Example />);
    await open();
    const item = screen.getByRole("menuitem", { name: "Delete" });
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(item).toHaveClass("text-destructive", "ps-8");
    expect(baseElement.querySelector("[data-slot='context-menu-shortcut']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(baseElement.querySelector("[data-slot='context-menu-label']")).toHaveTextContent(
      "Page",
    );
  });

  it("ships its keyframes once, hoisted", async () => {
    render(<Example />);
    await open();
    expect(document.querySelectorAll('style[data-href="dowel-context-menu"]')).toHaveLength(1);
  });

  it("opens and closes a submenu with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open();
    const subTrigger = screen.getByRole("menuitem", { name: "More tools" });
    subTrigger.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Save page as…" })).toBeInTheDocument();
    });
    expect(subTrigger).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Save page as…" })).toHaveFocus();
    });
    await user.keyboard("{ArrowLeft}");
    await waitFor(() => {
      expect(subTrigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("toggles a checkbox item and selects a radio item", async () => {
    const user = userEvent.setup();
    function Selectable() {
      const [bookmarks, setBookmarks] = useState(false);
      const [person, setPerson] = useState("pedro");
      return (
        <ContextMenu>
          <ContextMenuTrigger>Area</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
              Show bookmarks
            </ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value={person} onValueChange={setPerson}>
              <ContextMenuRadioItem value="pedro">Pedro</ContextMenuRadioItem>
              <ContextMenuRadioItem value="colm">Colm</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      );
    }
    render(<Selectable />);
    fireEvent.contextMenu(screen.getByText("Area"));
    const checkbox = await screen.findByRole("menuitemcheckbox", { name: "Show bookmarks" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Pedro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(checkbox);

    fireEvent.contextMenu(screen.getByText("Area"));
    expect(
      await screen.findByRole("menuitemcheckbox", { name: "Show bookmarks" }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "Colm" }));

    fireEvent.contextMenu(screen.getByText("Area"));
    expect(await screen.findByRole("menuitemradio", { name: "Colm" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("lets the consumer className win and forwards a ref", async () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent ref={ref} className="p-3">
          <ContextMenuItem className="px-4">Item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Area"));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("p-3");
    expect(menu).not.toHaveClass("p-1");
    expect(ref.current).toBe(menu);
    expect(screen.getByRole("menuitem")).toHaveClass("px-4");
  });

  it("has no accessibility violations while open", async () => {
    const { baseElement } = render(<Example />);
    await open();
    await expectNoA11yViolations(baseElement);
  });
});
