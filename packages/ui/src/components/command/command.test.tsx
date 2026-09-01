import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  defaultCommandFilter,
} from "./command";

function Example({ onSelect }: { onSelect?: (value: string) => void } = {}) {
  return (
    <Command>
      <CommandInput placeholder="Type a command…" aria-label="Search commands" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="Calendar" keywords={["date", "schedule"]} onSelect={onSelect} />
          <CommandItem value="Search Emoji" onSelect={onSelect} />
          <CommandItem value="Calculator" disabled onSelect={onSelect} />
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem value="Profile" onSelect={onSelect}>
            Profile
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem value="Billing" onSelect={onSelect} />
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe("defaultCommandFilter", () => {
  it("matches case-insensitively across every entry", () => {
    expect(defaultCommandFilter("cal", ["Calendar", "date"])).toBe(true);
    expect(defaultCommandFilter("DATE", ["Calendar", "date"])).toBe(true);
    expect(defaultCommandFilter("zzz", ["Calendar", "date"])).toBe(false);
  });

  it("matches everything on an empty search", () => {
    expect(defaultCommandFilter("  ", ["anything"])).toBe(true);
  });
});

describe("Command", () => {
  it("renders a combobox input and a listbox", () => {
    render(<Example />);

    const input = screen.getByRole("combobox", { name: "Search commands" });
    expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("takes focus on mount, so typing works immediately", async () => {
    render(<Example />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveFocus();
    });
  });

  it("renders every item to begin with", () => {
    render(<Example />);
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("labels each group by its heading", () => {
    render(<Example />);
    expect(screen.getByRole("group", { name: "Suggestions" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Settings" })).toBeInTheDocument();
  });

  describe("filtering", () => {
    it("narrows as you type", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.keyboard("prof");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option", { name: /Profile/ })).toBeInTheDocument();
    });

    it("matches hidden keywords", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.keyboard("schedule");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option", { name: "Calendar" })).toBeInTheDocument();
    });

    it("hides a group whose items have all been filtered out", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.keyboard("prof");
      expect(screen.queryByRole("group", { name: "Suggestions" })).not.toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Settings" })).toBeInTheDocument();
    });

    it("brings a hidden group back when the search is cleared", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.keyboard("prof");
      expect(screen.queryByRole("group", { name: "Suggestions" })).not.toBeInTheDocument();

      await user.clear(screen.getByRole("combobox"));
      await waitFor(() => {
        expect(screen.getByRole("group", { name: "Suggestions" })).toBeInTheDocument();
      });
    });

    it("shows the empty state only when nothing matches", async () => {
      const user = userEvent.setup();
      render(<Example />);
      expect(screen.queryByText("No results found.")).not.toBeInTheDocument();

      await user.keyboard("zzzz");
      expect(screen.getByText("No results found.")).toBeInTheDocument();
      expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("accepts a custom filter", async () => {
      const user = userEvent.setup();
      render(
        <Command filter={(search, haystack) => haystack.some((e) => e.startsWith(search))}>
          <CommandInput aria-label="Search" />
          <CommandList>
            <CommandItem value="Alpha" />
            <CommandItem value="Beta" />
          </CommandList>
        </Command>,
      );

      await user.keyboard("Al");
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
  });

  describe("keyboard", () => {
    it("moves through items with the arrows, keeping focus in the input", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const input = screen.getByRole("combobox");
      await user.keyboard("{ArrowDown}");

      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Calendar" }).id,
      );
      expect(input).toHaveFocus();
    });

    it("skips disabled items", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const input = screen.getByRole("combobox");
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");

      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: /Profile/ }).id,
      );
    });

    it("wraps at the ends", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const input = screen.getByRole("combobox");
      await user.keyboard("{ArrowUp}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Billing" }).id,
      );
    });

    it("jumps to the ends with Home and End", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const input = screen.getByRole("combobox");
      await user.keyboard("{End}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Billing" }).id,
      );

      await user.keyboard("{Home}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Calendar" }).id,
      );
    });

    it("runs the active item on Enter", async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<Example onSelect={onSelect} />);

      await user.keyboard("{ArrowDown}{Enter}");
      expect(onSelect).toHaveBeenCalledWith("Calendar");
    });

    it("does nothing on Enter with no active item", async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<Example onSelect={onSelect} />);

      await user.keyboard("{Enter}");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("resets the active item when the search changes", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const input = screen.getByRole("combobox");
      await user.keyboard("{ArrowDown}");
      expect(input).toHaveAttribute("aria-activedescendant");

      await user.keyboard("c");
      expect(input).not.toHaveAttribute("aria-activedescendant");
    });
  });

  it("runs an item on click", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Example onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: "Billing" }));
    expect(onSelect).toHaveBeenCalledWith("Billing");
  });

  it("ignores a disabled item", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Example onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: "Calculator" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("hides the shortcut hint from assistive technology", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("[data-slot='command-shortcut']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps items out of the tab order", () => {
    render(<Example />);
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("tabindex", "-1");
    }
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [search, setSearch] = useState("");
      return (
        <>
          <Command value={search} onValueChange={setSearch}>
            <CommandInput aria-label="Search" />
            <CommandList>
              <CommandItem value="Alpha" />
              <CommandItem value="Beta" />
            </CommandList>
          </Command>
          <span data-testid="echo">{search}</span>
        </>
      );
    }

    render(<Controlled />);
    await user.keyboard("al");
    expect(screen.getByTestId("echo")).toHaveTextContent("al");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("throws a useful error if a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<CommandList />)).toThrow(
      /CommandList must be rendered inside <Command>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});

describe("CommandDialog", () => {
  it("is always named, even though the title is not shown", async () => {
    render(
      <CommandDialog open>
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandItem value="Alpha" />
        </CommandList>
      </CommandDialog>,
    );

    expect(await screen.findByRole("dialog", { name: "Command palette" })).toBeInTheDocument();
  });

  it("accepts a custom title and description", async () => {
    render(
      <CommandDialog open title="Jump to" description="Search pages and actions.">
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandItem value="Alpha" />
        </CommandList>
      </CommandDialog>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Jump to" });
    expect(dialog).toHaveAccessibleDescription("Search pages and actions.");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput aria-label="Search" />
          <CommandList>
            <CommandItem value="Alpha" />
          </CommandList>
        </CommandDialog>
      );
    }

    render(<Controlled />);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("has no accessibility violations while open", async () => {
    const { baseElement } = render(
      <CommandDialog open>
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandGroup heading="Pages">
            <CommandItem value="Home" />
            <CommandItem value="Settings" />
          </CommandGroup>
        </CommandList>
      </CommandDialog>,
    );

    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
