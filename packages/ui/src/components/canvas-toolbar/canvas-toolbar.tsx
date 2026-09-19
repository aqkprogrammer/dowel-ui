"use client";

// Ported from bencho Canvas toolbar (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { DropdownMenu as MenuPrimitive, Toolbar as ToolbarPrimitive } from "radix-ui";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import { focusRing, focusRingInset, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A Figma-style tool rail: one tool is active across the whole rail, a shape
 * slot swaps its tool from a flyout, and single-key shortcuts pick tools.
 *
 * Semantics. Radix Toolbar gives role="toolbar", roving tabindex, arrow keys
 * (RTL-aware), Home/End and wrap-around. Its ToggleGroup type="single" would
 * render role="radiogroup" with role="radio" items, which cannot also hold
 * the slot's "More shapes" menu button and the divider, so every tool is a
 * Toolbar.Button with aria-pressed instead: a set of toggle buttons of which
 * exactly one is pressed. The flyout is Dowel's DropdownMenu (Radix): the
 * notch has aria-haspopup="menu" and aria-expanded, shapes are
 * menuitemradio, Escape closes and returns focus to the notch, and picking a
 * shape returns focus to the slot's tool.
 *
 * Motion is CSS. The active fill pops from scale .72 with a springy curve,
 * the icon rises to 1.05 and presses to .92, and the flyout rises in. All of
 * it is decoration and stops under reduced motion.
 */

export interface CanvasTool {
  type?: "tool";
  value: string;
  /** Accessible name, and the tooltip text. */
  label: string;
  /** Decorative glyph; hidden from assistive technology. */
  icon: ReactNode;
  /** A single key that picks the tool, e.g. "v". Case-insensitive. */
  shortcut?: string;
  disabled?: boolean;
}

export interface CanvasToolSeparator {
  type: "separator";
}

export interface CanvasToolSlot {
  type: "slot";
  /** Names the group of tools, e.g. "Shapes". */
  label: string;
  tools: CanvasTool[];
  /** The tool the slot shows before one is picked. Defaults to the first. */
  defaultTool?: string;
  /** Name of the flyout button. Defaults to `More ${label}` in lower case. */
  moreLabel?: string;
}

export type CanvasToolbarItem = CanvasTool | CanvasToolSeparator | CanvasToolSlot;

const PREFIX = "dowel-canvas-toolbar";

const STYLES = `
[data-slot=canvas-toolbar-tool]::before,[data-slot=canvas-toolbar-option]::before{content:"";position:absolute;inset:0;border-radius:inherit;background:currentColor;opacity:0;scale:.72;pointer-events:none;transition:opacity calc(140ms * var(--motion-scale)) linear,scale calc(300ms * var(--motion-scale)) cubic-bezier(.3,1.42,.4,1)}
[data-slot=canvas-toolbar-tool][data-state=on]::before,[data-slot=canvas-toolbar-option][data-state=checked]::before{opacity:.07;scale:1}
@keyframes ${PREFIX}-flyout{0%{opacity:0;transform:translate(var(--${PREFIX}-fx,0),var(--${PREFIX}-fy,9px)) scale(.965)}55%{opacity:1}100%{opacity:1;transform:none}}
[data-slot=canvas-toolbar-flyout][data-state=open]{animation:${PREFIX}-flyout calc(300ms * var(--motion-scale)) cubic-bezier(.22,1.14,.36,1)}
[data-slot=canvas-toolbar-flyout][data-side=bottom]{--${PREFIX}-fy:-9px}
[data-slot=canvas-toolbar-flyout][data-side=left]{--${PREFIX}-fx:9px;--${PREFIX}-fy:0}
[data-slot=canvas-toolbar-flyout][data-side=right]{--${PREFIX}-fx:-9px;--${PREFIX}-fy:0}
`;

/** The pane surface shared by the rail and the flyout. */
const canvasToolbarVariants = cva("", {
  variants: {
    /** `default` is the card surface; `inverted` swaps it for the ink colour. */
    tone: {
      default: "bg-card text-foreground",
      inverted: "bg-foreground text-background",
    },
    /** A 1px inset hairline around the surface. */
    stroke: {
      true: "ring-1 ring-border ring-inset",
      false: "",
    },
  },
  defaultVariants: { tone: "default", stroke: false },
});

/** A tool: a 38px square whose fill and icon follow data-state. */
const toolClass = cn(
  "group/tool relative grid size-9.5 shrink-0 place-items-center rounded-[var(--canvas-toolbar-tool-r)]",
  "transition-[background-color] duration-[var(--duration-instant)]",
  "hover:bg-current/5 data-[highlighted]:bg-current/5 data-[state=checked]:bg-transparent data-[state=on]:bg-transparent",
  "disabled:pointer-events-none disabled:opacity-40",
);

const iconClass = cn(
  "grid place-items-center opacity-45 transition-[opacity,scale] duration-[var(--duration-instant)] ease-[var(--ease-out-quint)]",
  "group-hover/tool:opacity-80 group-active/tool:scale-92 group-data-[highlighted]/tool:opacity-80",
  "group-data-[state=checked]/tool:scale-105 group-data-[state=checked]/tool:opacity-100",
  "group-data-[state=on]/tool:scale-105 group-data-[state=on]/tool:opacity-100",
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4.25",
);

type Side = "top" | "right" | "bottom" | "left";

export interface CanvasToolbarProps
  extends
    Omit<ComponentPropsWithRef<typeof ToolbarPrimitive.Root>, "children" | "defaultValue">,
    VariantProps<typeof canvasToolbarVariants> {
  /** Tools, dividers and swappable slots, in order. */
  tools: CanvasToolbarItem[];
  /** The active tool (controlled). */
  value?: string;
  /** The initially active tool. Defaults to the first tool. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Radius of the rail and flyout in px; tools use `corner - 4`. */
  corner?: number;
  /** Show each tool's name (and shortcut) in a tooltip. */
  tooltips?: boolean;
  /**
   * Listen for shortcuts on the whole document, not only while focus is in the
   * toolbar. Keys typed into inputs, textareas and contenteditable are ignored.
   */
  globalShortcuts?: boolean;
  /** Which side the flyout and tooltips open on. Defaults to top (or the inline end when vertical). */
  side?: Side;
  /** Extra classes for the flyout panel. */
  flyoutClassName?: string;
}

interface Shortcut {
  tool: CanvasTool;
  slot?: number;
}

function isSlot(item: CanvasToolbarItem): item is CanvasToolSlot {
  return item.type === "slot";
}

function firstTool(tools: CanvasToolbarItem[]): string | undefined {
  for (const item of tools) {
    if (item.type === "separator") continue;
    return isSlot(item) ? (item.defaultTool ?? item.tools[0]?.value) : item.value;
  }
  return undefined;
}

const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role^="menu"]';

/** Warns, in development only, when the toolbar has no accessible name. */
function useNameWarning(label?: string, labelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || label || labelledBy) return;
    console.warn("[CanvasToolbar] Pass aria-label or aria-labelledby to name the toolbar.");
  }, [label, labelledBy]);
}

/** A Figma-style tool rail with a swappable shape slot and single-key shortcuts. */
export function CanvasToolbar({
  className,
  style,
  tools,
  value: valueProp,
  defaultValue,
  onValueChange,
  corner = 14,
  tooltips = true,
  globalShortcuts = false,
  side: sideProp,
  flyoutClassName,
  tone,
  stroke,
  orientation = "horizontal",
  dir,
  onKeyDown,
  ...props
}: CanvasToolbarProps) {
  const [uncontrolled, setUncontrolled] = useState(() => defaultValue ?? firstTool(tools));
  const value = valueProp ?? uncontrolled;
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const slotTools = useRef(new Map<number, HTMLButtonElement | null>());
  const picked = useRef(false);

  useNameWarning(props["aria-label"], props["aria-labelledby"]);

  const side: Side =
    sideProp ?? (orientation === "vertical" ? (dir === "rtl" ? "left" : "right") : "top");
  const surface = canvasToolbarVariants({ tone, stroke });

  const select = (next: string, slot?: number) => {
    if (slot !== undefined) setPicks((current) => ({ ...current, [slot]: next }));
    if (next === value) return;
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  const shortcuts = new Map<string, Shortcut>();
  tools.forEach((item, index) => {
    const add = (tool: CanvasTool, slot?: number) => {
      if (tool.shortcut) shortcuts.set(tool.shortcut.toLowerCase(), { tool, slot });
    };
    if (isSlot(item)) item.tools.forEach((tool) => add(tool, index));
    else if (item.type !== "separator") add(item);
  });

  const handleShortcut = (
    event: { key: string; target: EventTarget | null } & ModifierKeys,
  ) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest(EDITABLE)) return;
    const hit = shortcuts.get(event.key.toLowerCase());
    if (!hit || hit.tool.disabled) return;
    event.preventDefault();
    select(hit.tool.value, hit.slot);
  };

  const shortcutRef = useRef(handleShortcut);
  useEffect(() => {
    shortcutRef.current = handleShortcut;
  });
  useEffect(() => {
    if (!globalShortcuts) return;
    const listener = (event: globalThis.KeyboardEvent) => shortcutRef.current(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [globalShortcuts]);

  const renderTool = (tool: CanvasTool, slot?: number) => {
    const pressed = tool.value === value;
    const button = (
      <ToolbarPrimitive.Button
        ref={
          slot === undefined
            ? undefined
            : (node: HTMLButtonElement | null) => {
                slotTools.current.set(slot, node);
              }
        }
        data-slot="canvas-toolbar-tool"
        data-state={pressed ? "on" : "off"}
        aria-label={tool.label}
        aria-pressed={pressed}
        aria-keyshortcuts={tool.shortcut}
        disabled={tool.disabled}
        className={cn(toolClass, focusRing)}
        onClick={() => select(tool.value, slot)}
      >
        <span data-slot="canvas-toolbar-icon" aria-hidden="true" className={iconClass}>
          {tool.icon}
        </span>
      </ToolbarPrimitive.Button>
    );
    if (!tooltips) return button;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={side}>
          {tool.label}
          {tool.shortcut ? (
            <kbd className="ms-2 font-sans uppercase opacity-60">{tool.shortcut}</kbd>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  };

  const flyoutKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const panel = event.currentTarget;
    const items = [
      ...panel.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not([data-disabled])'),
    ];
    const rtl =
      panel.getAttribute("dir") === "rtl" || getComputedStyle(panel).direction === "rtl";
    const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
    const from = items.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    items[(from + step + items.length) % items.length]?.focus();
  };

  const renderSlot = (slot: CanvasToolSlot, index: number) => {
    const shown =
      slot.tools.find((tool) => tool.value === value) ??
      slot.tools.find((tool) => tool.value === (picks[index] ?? slot.defaultTool)) ??
      slot.tools[0];
    if (!shown) return null;
    const open = openSlot === index;
    const more = slot.moreLabel ?? `More ${slot.label.toLowerCase()}`;
    return (
      <div
        key={`slot-${String(index)}`}
        role="group"
        aria-label={slot.label}
        data-slot="canvas-toolbar-slot"
        data-state={shown.value === value ? "on" : "off"}
        className="relative shrink-0"
      >
        {renderTool(shown, index)}
        <DropdownMenu
          dir={dir}
          open={open}
          onOpenChange={(next) => setOpenSlot(next ? index : null)}
        >
          <DropdownMenuTrigger asChild>
            <ToolbarPrimitive.Button
              data-slot="canvas-toolbar-notch"
              aria-label={more}
              className={cn(
                "absolute end-0.75 bottom-0.75 grid size-2.25 place-items-center rounded-xs",
                "opacity-40 transition-[opacity,scale] duration-[var(--duration-normal)] ease-[cubic-bezier(.28,1.3,.36,1)]",
                "hover:opacity-90 data-[state=open]:scale-130 data-[state=open]:opacity-90",
                focusRingInset,
              )}
            >
              <svg
                viewBox="0 0 5 5"
                aria-hidden="true"
                className={cn("size-1.25 fill-current", mirrorForDirection)}
              >
                <path d="M5 0v5H0z" />
              </svg>
            </ToolbarPrimitive.Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-slot="canvas-toolbar-flyout"
            side={side}
            align="center"
            sideOffset={14}
            onKeyDown={flyoutKeys}
            onCloseAutoFocus={(event) => {
              if (!picked.current) return;
              picked.current = false;
              event.preventDefault();
              slotTools.current.get(index)?.focus();
            }}
            className={cn(
              "flex min-w-0 gap-0.5 rounded-[var(--canvas-toolbar-r)] border-0 p-1.5 shadow-md",
              "data-[state=open]:[&>*]:animate-none",
              surface,
              flyoutClassName,
            )}
            style={
              {
                "--canvas-toolbar-r": `${String(corner)}px`,
                "--canvas-toolbar-tool-r": `${String(Math.max(corner - 4, 0))}px`,
              } as CSSProperties
            }
          >
            <DropdownMenuRadioGroup
              value={shown.value}
              className={cn(
                "flex gap-0.5",
                side === "left" || side === "right" ? "flex-col" : "",
              )}
              onValueChange={(next) => {
                picked.current = true;
                select(next, index);
              }}
            >
              {slot.tools.map((tool) => (
                <MenuPrimitive.RadioItem
                  key={tool.value}
                  value={tool.value}
                  disabled={tool.disabled}
                  aria-label={tool.label}
                  data-slot="canvas-toolbar-option"
                  className={cn(toolClass, "outline-none", focusRingInset)}
                >
                  <span aria-hidden="true" className={iconClass}>
                    {tool.icon}
                  </span>
                </MenuPrimitive.RadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <ToolbarPrimitive.Root
        data-slot="canvas-toolbar"
        orientation={orientation}
        dir={dir}
        className={cn(
          "inline-flex items-center gap-0.5 p-1.5 shadow-sm data-[orientation=vertical]:flex-col",
          surface,
          className,
        )}
        style={
          {
            borderRadius: corner,
            "--canvas-toolbar-tool-r": `${String(Math.max(corner - 4, 0))}px`,
            ...style,
          } as CSSProperties
        }
        onKeyDown={(event) => {
          onKeyDown?.(event);
          handleShortcut(event);
        }}
        {...props}
      >
        {tools.map((item, index) => {
          if (item.type === "separator") {
            return (
              <ToolbarPrimitive.Separator
                key={`separator-${String(index)}`}
                data-slot="canvas-toolbar-separator"
                className={cn(
                  "shrink-0 bg-current/12",
                  "data-[orientation=vertical]:mx-1.25 data-[orientation=vertical]:h-5 data-[orientation=vertical]:w-px",
                  "data-[orientation=horizontal]:my-1.25 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-5",
                )}
              />
            );
          }
          if (isSlot(item)) return renderSlot(item, index);
          return <Fragment key={item.value}>{renderTool(item)}</Fragment>;
        })}
      </ToolbarPrimitive.Root>
    </>
  );
}

interface ModifierKeys {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export { canvasToolbarVariants };
