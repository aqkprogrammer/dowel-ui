"use client";

// Ported from bencho Create menu (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A DropdownMenu with a morph flourish: the "+ Create" pill grows in place
 * into the menu panel, and shrinks back into the pill when it closes.
 *
 * The menu is the Radix DropdownMenu primitive, so the whole menu-button
 * pattern comes from it: aria-haspopup/aria-expanded on the trigger,
 * role="menu"/"menuitem", focus into the menu, Up/Down roving, Home/End,
 * typeahead, Escape and outside-click dismissal with focus returned to the
 * trigger. Dowel's own DropdownMenuContent always portals, and the morph needs
 * the panel to sit exactly over the trigger, so this composes the primitive
 * directly: the content is not portalled and is placed over the trigger
 * (side="bottom", sideOffset = -triggerHeight).
 *
 * Motion is CSS only. The surface is a separate aria-hidden layer whose
 * width/height/radius run from the trigger's size (Radix publishes it as
 * --radix-dropdown-menu-trigger-*) to the panel's; the content itself holds a
 * no-op animation as long as the shrink so Presence waits for it. Items
 * stagger in; one shared highlight pill follows the highlighted item, whether
 * the pointer or the keyboard moved it. Reduced motion collapses every
 * duration through --motion-scale, leaving the settled panel.
 */

const PREFIX = "dowel-create-menu";
const OVERSHOOT = "cubic-bezier(.32,1.26,.4,1)";

function ms(value: number): string {
  return `calc(${String(value)}ms * var(--motion-scale))`;
}

const PILL = `width:var(--radix-dropdown-menu-trigger-width);height:var(--radix-dropdown-menu-trigger-height);border-radius:calc(var(--radix-dropdown-menu-trigger-height) / 2)`;
const PANEL = `width:100%;height:100%;border-radius:var(--create-menu-corner)`;

const STAGGER = Array.from(
  { length: 12 },
  (_, i) =>
    `[data-slot=create-menu-content][data-state=open] [data-slot=create-menu-list]>[data-slot=create-menu-item]:nth-child(${String(i + 2)}){animation-delay:${ms(30 + 22 * i)}}`,
).join("\n");

const STYLES = `
@keyframes ${PREFIX}-grow{from{${PILL}}to{${PANEL}}}
@keyframes ${PREFIX}-shrink{from{${PANEL}}to{${PILL}}}
@keyframes ${PREFIX}-hold{from{opacity:1}to{opacity:1}}
@keyframes ${PREFIX}-item-in{from{opacity:0;transform:translateY(6px)}}
[data-slot=create-menu-content][data-state=closed]{animation:${PREFIX}-hold ${ms(300)} linear both}
[data-slot=create-menu-content][data-state=open]>[data-slot=create-menu-surface]{animation:${PREFIX}-grow ${ms(370)} var(--ease-out-quint) both}
[data-slot=create-menu-content][data-state=closed]>[data-slot=create-menu-surface]{animation:${PREFIX}-shrink ${ms(300)} var(--ease-out-quint) both}
[data-slot=create-menu-content][data-state=open] [data-slot=create-menu-item]{animation:${PREFIX}-item-in ${ms(240)} var(--ease-out-quint) both}
[data-slot=create-menu-content][data-state=closed] [data-slot=create-menu-item],[data-slot=create-menu-content][data-state=closed] [data-slot=create-menu-highlight]{opacity:0}
${STAGGER}
`;

/** The pill and the panel share one surface; `tone` inverts it. */
const createMenuVariants = cva("", {
  variants: {
    tone: {
      default: "bg-card text-foreground",
      inverted: "bg-foreground text-background",
    },
    stroke: {
      true: "inset-ring inset-ring-border",
      false: "",
    },
  },
  defaultVariants: { tone: "default", stroke: false },
});

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface CreateMenuProps
  extends Omit<ComponentPropsWithRef<"div">, "dir">, VariantProps<typeof createMenuVariants> {
  /** The trigger's visible label, and the menu's name. */
  label?: ReactNode;
  /** The trigger's icon. Decorative; defaults to a plus. Pass `null` for none. */
  icon?: ReactNode;
  /** Radius of the open panel in px. The row radius derives from it. */
  corner?: number;
  /** Width of the open panel in px. Its height follows the items. */
  panelWidth?: number;
  /** Where the panel grows from, relative to the pill. */
  align?: "start" | "center" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Radix `modal`. Off by default: the menu sits inline, over its own pill. */
  modal?: boolean;
  dir?: "ltr" | "rtl";
  triggerClassName?: string;
  contentClassName?: string;
  /** `CreateMenuItem`s. */
  children?: ReactNode;
}

/** A "+ Create" pill that grows in place into a menu of actions. */
export function CreateMenu({
  label = "Create",
  icon,
  corner = 28,
  panelWidth = 212,
  align = "center",
  tone,
  stroke,
  open,
  defaultOpen,
  onOpenChange,
  modal = false,
  dir,
  className,
  triggerClassName,
  contentClassName,
  style,
  children,
  ...props
}: CreateMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerHeight, setTriggerHeight] = useState(38);
  const [highlight, setHighlight] = useState({ top: 0, height: 0, visible: false });
  const [moving, setMoving] = useState(false);
  const movingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Measure the pill so the panel's top edge lands on the pill's.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const measure = () => {
      if (trigger.offsetHeight > 0) setTriggerHeight(trigger.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trigger);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => () => clearTimeout(movingTimer.current), []);

  // Radix focuses the highlighted item for pointer and keyboard alike, and
  // focuses the content itself when the pointer leaves: one listener tracks both.
  const onContentFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (target.getAttribute("role") !== "menuitem") {
        setHighlight((previous) => ({ ...previous, visible: false }));
        return;
      }
      if (highlight.visible && highlight.top !== target.offsetTop) {
        setMoving(true);
        clearTimeout(movingTimer.current);
        movingTimer.current = setTimeout(() => {
          setMoving(false);
        }, 110);
      }
      setHighlight({ top: target.offsetTop, height: target.offsetHeight, visible: true });
    },
    [highlight],
  );

  const surface = createMenuVariants({ tone, stroke });

  return (
    <div
      data-slot="create-menu"
      className={cn("relative inline-grid place-items-center", className)}
      style={{ ["--create-menu-corner" as string]: `${String(corner)}px`, ...style }}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <DropdownMenuPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={(next) => {
          if (!next) setHighlight((previous) => ({ ...previous, visible: false }));
          onOpenChange?.(next);
        }}
        modal={modal}
        dir={dir}
      >
        <DropdownMenuPrimitive.Trigger
          ref={triggerRef}
          data-slot="create-menu-trigger"
          className={cn(
            surface,
            focusRing,
            "inline-flex h-9.5 items-center gap-2 rounded-full px-5 text-[0.84375rem] font-medium select-none",
            "transition-[scale,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
            "active:scale-94 data-[state=open]:pointer-events-none data-[state=open]:opacity-0",
            "[&_svg]:size-4 [&_svg]:shrink-0",
            triggerClassName,
          )}
        >
          {icon === undefined ? <PlusIcon /> : icon}
          {label}
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Content
          data-slot="create-menu-content"
          side="bottom"
          align={align}
          sideOffset={-triggerHeight}
          avoidCollisions={false}
          onFocus={onContentFocus}
          className={cn(
            "relative z-[var(--z-popover)] px-2.5 py-2.75 outline-none",
            tone === "inverted" ? "text-background" : "text-foreground",
            contentClassName,
          )}
          style={
            {
              width: `${String(panelWidth)}px`,
              ["--create-menu-row-r"]: `max(0px, calc(var(--create-menu-corner) - 11px))`,
            } as CSSProperties
          }
        >
          <div
            aria-hidden="true"
            data-slot="create-menu-surface"
            className={cn(surface, "absolute inset-x-0 top-0 mx-auto size-full shadow-lg")}
            style={{ borderRadius: "var(--create-menu-corner)" }}
          />
          <div data-slot="create-menu-list" className="relative grid gap-0.5">
            <div
              aria-hidden="true"
              data-slot="create-menu-highlight"
              data-moving={moving ? "" : undefined}
              className="pointer-events-none absolute inset-x-0 top-0 bg-current/10 data-[moving]:[scale:0.96_1.16]"
              style={{
                height: `${String(highlight.height)}px`,
                opacity: highlight.visible ? 1 : 0,
                transform: `translateY(${String(highlight.top)}px)`,
                borderRadius: "var(--create-menu-row-r)",
                transition: `transform ${ms(380)} ${OVERSHOOT}, scale ${ms(110)} var(--ease-out-quint), opacity ${ms(180)} ease`,
              }}
            />
            {children}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

export interface CreateMenuItemProps extends ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Item
> {
  /** Leading icon. Decorative. */
  icon?: ReactNode;
}

/** One action in a CreateMenu. `onSelect` runs it; the menu then closes. */
export function CreateMenuItem({
  icon,
  className,
  style,
  children,
  ...props
}: CreateMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="create-menu-item"
      className={cn(
        "relative flex h-8.5 cursor-default items-center gap-2.5 px-3.5 text-[0.8125rem] outline-none select-none",
        "text-[color-mix(in_oklab,currentColor_78%,transparent)] data-[highlighted]:text-current",
        "transition-colors duration-[var(--duration-fast)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        className,
      )}
      style={{ borderRadius: "var(--create-menu-row-r)", ...style }}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden="true"
          data-slot="create-menu-item-icon"
          className="flex shrink-0 [&_svg]:size-3.75"
        >
          {icon}
        </span>
      ) : null}
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export { createMenuVariants };
