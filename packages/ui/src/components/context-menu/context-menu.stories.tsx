import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ArrowRight, Code, Copy, RotateCw, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";

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

/**
 * Annotated rather than inferred with `satisfies`. These components are direct
 * re-exports of Radix primitives, and inferring the meta type makes the emitted
 * declaration reference Radix-internal prop types that are not nameable from
 * this path (TS2883).
 */
const meta: Meta<typeof ContextMenu> = {
  title: "Overlays/Context Menu",
  component: ContextMenu,
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

/** A focusable target, so Shift+F10 and the Menu key open it too. */
function Area({ children = "Right-click here" }: { children?: string }) {
  return (
    <ContextMenuTrigger asChild>
      <button
        type="button"
        className="flex h-40 w-72 max-w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        {children}
      </button>
    </ContextMenuTrigger>
  );
}

/** The SmoothUI demo: a browser page's context menu. */
function BrowserMenu() {
  return (
    <ContextMenu>
      <Area />
      <ContextMenuContent className="w-60">
        <ContextMenuItem>
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled>
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Reload
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>More Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52">
            <ContextMenuItem>
              Save Page As…
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Developer Tools
              <ContextMenuShortcut>⌘⌥I</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          View Page Source
          <ContextMenuShortcut>⌘U</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Inspect Element</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const Default: Story = {
  render: () => <BrowserMenu />,
};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Context Menu" demo (Back, Forward disabled, Reload, More Tools
 *   submenu, View Page Source, Inspect Element) → composed from the parts.
 * - The source's `items` config (icon, shortcut, group label, separator,
 *   destructive variant, nested children) → one part each: `ContextMenuItem`
 *   with an icon child, `ContextMenuShortcut`, `ContextMenuLabel`,
 *   `ContextMenuSeparator`, `variant="destructive"`, `ContextMenuSub`.
 *
 * The spring (scale .95 → 1 with a slight overshoot, 20ms item stagger) is
 * CSS; no animation library is involved.
 */
export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8">
      <figure className="grid gap-2">
        <BrowserMenu />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Context Menu
        </figcaption>
      </figure>
      <figure className="grid gap-2">
        <ContextMenu>
          <Area>Right-click a file</Area>
          <ContextMenuContent className="w-56">
            <ContextMenuLabel>Edit</ContextMenuLabel>
            <ContextMenuGroup>
              <ContextMenuItem>
                <Scissors />
                Cut
                <ContextMenuShortcut>⌘X</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>
                <Copy />
                Copy
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuLabel>Navigate</ContextMenuLabel>
            <ContextMenuItem>
              <ArrowLeft className="rtl:-scale-x-100" />
              Previous
            </ContextMenuItem>
            <ContextMenuItem>
              <ArrowRight className="rtl:-scale-x-100" />
              Next
            </ContextMenuItem>
            <ContextMenuItem>
              <RotateCw />
              Refresh
            </ContextMenuItem>
            <ContextMenuItem>
              <Code />
              Open in editor
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">
              <Trash2 />
              Delete
              <ContextMenuShortcut>⌫</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Context Menu (icons, group labels, destructive)
        </figcaption>
      </figure>
    </div>
  ),
};

/** Checkbox and radio items, as in Dropdown Menu. */
export const Selectable: Story = {
  render: function Selectable() {
    const [bookmarks, setBookmarks] = useState(true);
    const [urls, setUrls] = useState(false);
    const [person, setPerson] = useState("pedro");
    return (
      <ContextMenu>
        <Area />
        <ContextMenuContent className="w-60">
          <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
            Show bookmarks bar
            <ContextMenuShortcut>⌘⇧B</ContextMenuShortcut>
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={urls} onCheckedChange={setUrls}>
            Show full URLs
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuLabel inset>People</ContextMenuLabel>
          <ContextMenuRadioGroup value={person} onValueChange={setPerson}>
            <ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
            <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};
