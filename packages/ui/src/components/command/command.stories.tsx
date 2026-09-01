import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calculator, Calendar, CreditCard, Settings, Smile, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";

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
} from "./command";

const meta: Meta<typeof Command> = {
  title: "Navigation/Command",
  component: Command,
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof Command>;

function Items() {
  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="Calendar" keywords={["date", "schedule"]}>
          <Calendar />
          Calendar
        </CommandItem>
        <CommandItem value="Search Emoji" keywords={["icon", "smiley"]}>
          <Smile />
          Search Emoji
        </CommandItem>
        <CommandItem value="Calculator" disabled>
          <Calculator />
          Calculator
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem value="Profile" keywords={["account", "me"]}>
          <User />
          Profile
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem value="Billing" keywords={["invoice", "payment"]}>
          <CreditCard />
          Billing
          <CommandShortcut>⌘B</CommandShortcut>
        </CommandItem>
        <CommandItem value="Settings">
          <Settings />
          Settings
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </>
  );
}

/** Try typing "schedule" or "invoice" — keywords are searchable but not shown. */
export const Default: Story = {
  render: () => (
    <Command className="w-96 rounded-lg border border-border shadow-md">
      <CommandInput placeholder="Type a command or search…" aria-label="Search commands" />
      <CommandList>
        <Items />
      </CommandList>
    </Command>
  ),
};

/** Groups whose items all filter out hide their heading rather than labelling nothing. */
export const Filtering: Story = {
  render: () => (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Type “bill” — the Suggestions group hides.
      </p>
      <Command className="w-96 rounded-lg border border-border shadow-md">
        <CommandInput placeholder="Search…" aria-label="Search commands" />
        <CommandList>
          <Items />
        </CommandList>
      </Command>
    </div>
  ),
};

/** The ⌘K pattern. The dialog is always named, even though the title is hidden. */
export const Palette: Story = {
  render: function Palette() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
      function onKeyDown(event: KeyboardEvent) {
        if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          setOpen((current) => !current);
        }
      }

      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    return (
      <div className="grid gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          Open palette
          <CommandShortcut className="ml-2">⌘K</CommandShortcut>
        </Button>
        <p className="text-xs text-muted-foreground">Or press ⌘K / Ctrl+K.</p>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search…" aria-label="Search commands" />
          <CommandList>
            <Items />
          </CommandList>
        </CommandDialog>
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <Command className="w-96 rounded-lg border border-border shadow-md">
      <CommandInput
        placeholder="Search…"
        aria-label="Search commands"
        defaultValue="nothing matches this"
      />
      <CommandList>
        <Items />
      </CommandList>
    </Command>
  ),
};
