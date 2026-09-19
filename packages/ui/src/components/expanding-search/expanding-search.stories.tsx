import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";

import { ExpandingSearch } from "./expanding-search";

const meta = {
  title: "Form/Expanding Search",
  component: ExpandingSearch,
  args: { label: "Search", placeholder: "Search…", expandedWidth: "14rem", stroke: true },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ExpandingSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const FRUIT = ["Apple", "Apricot", "Banana", "Blackberry", "Cherry", "Grape", "Lemon", "Mango"];

/** Wired as an APG combobox through `inputProps` and `children`. */
function WithSuggestions() {
  const listId = useId();
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const matches = value
    ? FRUIT.filter((f) => f.toLowerCase().startsWith(value.toLowerCase()))
    : [];
  const expanded = matches.length > 0;
  return (
    <ExpandingSearch
      value={value}
      onValueChange={(next) => {
        setValue(next);
        setActive(0);
      }}
      inputProps={{
        role: "combobox",
        "aria-expanded": expanded,
        "aria-controls": listId,
        "aria-autocomplete": "list",
        "aria-activedescendant": expanded ? `${listId}-${String(active)}` : undefined,
        onKeyDown: (event) => {
          if (!expanded) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            setValue(matches[active] ?? value);
          }
        },
      }}
    >
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full mt-2 rounded-xl bg-popover p-1 text-sm text-popover-foreground shadow-md"
      >
        {matches.map((fruit, index) => (
          <li
            key={fruit}
            id={`${listId}-${String(index)}`}
            role="option"
            aria-selected={index === active}
            className="rounded-md px-2 py-1.5 aria-selected:bg-accent"
          >
            {fruit}
          </li>
        ))}
      </ul>
    </ExpandingSearch>
  );
}

/** Original design for bencho's (paid) Search pattern: plain, open and combobox. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid h-80 content-start gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-start gap-2">
        <ExpandingSearch />
        <figcaption className="text-xs text-muted-foreground">Expanding search</figcaption>
      </figure>
      <figure className="flex flex-col items-start gap-2">
        <ExpandingSearch
          defaultOpen
          defaultValue="Invoices"
          stroke={false}
          expandedWidth="18rem"
        />
        <figcaption className="text-xs text-muted-foreground">
          Open with text · no stroke
        </figcaption>
      </figure>
      <figure className="flex flex-col items-start gap-2">
        <WithSuggestions />
        <figcaption className="text-xs text-muted-foreground">Combobox-ready</figcaption>
      </figure>
    </div>
  ),
};
