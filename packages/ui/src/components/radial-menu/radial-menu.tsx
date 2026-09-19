"use client";

// Ported from bencho Radial menu (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A marking menu: a round core button whose options fan out along an arc
 * above it. Press the core and drag onto an option, release to pick it; or
 * release on the core to leave the fan open and click an option; or use the
 * keyboard — Enter/Space (or Down/Up) opens and focuses the first (last)
 * option, arrows walk around the ring, Home/End jump, Enter/Space select,
 * Escape closes and refocuses the core, Tab closes and moves on.
 *
 * The source had no menu semantics or keyboard path at all. Here the core is
 * a menu button (aria-haspopup, aria-expanded, aria-controls) and the options
 * are role="menuitem" buttons in a role="menu", inert while closed.
 *
 * Positions are polar, spread evenly over `arc` degrees centred on straight
 * up (endpoints included), with x mirrored in RTL. Motion is plain CSS
 * transitions on inline transforms — the springy fly-out is a fixed
 * overshoot curve with a per-item delay — so reduced motion settles it
 * instantly through --motion-scale.
 */

const OVERSHOOT = "cubic-bezier(.24,1.34,.38,1)";

function ms(value: number): string {
  return `calc(${String(value)}ms * var(--motion-scale))`;
}

const radialMenuVariants = cva(
  "relative grid place-items-center rounded-full [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      part: {
        core: "z-3 size-14 touch-none select-none active:scale-94 [&_svg]:size-5",
        item: "size-12 shadow-md [&_svg]:size-4.5",
      },
      tone: { default: "", inverted: "" },
      stroke: { true: "inset-ring inset-ring-border", false: "" },
    },
    compoundVariants: [
      { part: "core", tone: "default", className: "bg-foreground text-background" },
      { part: "core", tone: "inverted", className: "bg-card text-foreground" },
      { part: "item", tone: "default", className: "bg-card text-foreground" },
      { part: "item", tone: "inverted", className: "bg-foreground text-background" },
    ],
    defaultVariants: { part: "core", tone: "default", stroke: false },
  },
);

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface RadialMenuItem {
  value: string;
  /** The option's accessible name, also shown as its caption. */
  label: string;
  /** Decorative icon. */
  icon: ReactNode;
  disabled?: boolean;
}

export interface RadialMenuProps
  extends
    Omit<ComponentPropsWithRef<"div">, "onSelect">,
    Omit<VariantProps<typeof radialMenuVariants>, "part"> {
  items: RadialMenuItem[];
  /** Called with the chosen item's value. The menu then closes. */
  onSelect?: (value: string) => void;
  /** The core button's accessible name, and the menu's. */
  label?: string;
  /** The core's icon. It turns 135° while open, so a plus reads as a cross. */
  icon?: ReactNode;
  /** Distance of the options from the core's centre, in px. */
  radius?: number;
  /** Angular spread in degrees, centred on straight up. */
  arc?: number;
  /** Delay between options flying out, in ms. */
  stagger?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Offset of option `index` of `count` from the core's centre. */
export function radialPosition(
  index: number,
  count: number,
  arc: number,
  radius: number,
  rtl = false,
): { x: number; y: number } {
  let angle = 90;
  if (count > 1) {
    const step = arc >= 360 ? 360 / count : arc / (count - 1);
    angle = 90 + (step * (count - 1)) / 2 - step * index;
  }
  const radians = (angle * Math.PI) / 180;
  const x = Math.round(radius * Math.cos(radians) * 100) / 100;
  const y = Math.round(-radius * Math.sin(radians) * 100) / 100;
  return { x: rtl ? -x || 0 : x || 0, y: y || 0 };
}

/** A round button that fans out a menu of options along an arc. */
export function RadialMenu({
  items,
  onSelect,
  label = "Add",
  icon,
  radius = 68,
  arc = 180,
  stagger = 28,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  tone,
  stroke,
  className,
  ref,
  onBlur,
  ...props
}: RadialMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pressing = useRef(false);
  const pendingFocus = useRef<number | null>(null);
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [live, setLive] = useState<number | null>(null);
  const [rtl, setRtl] = useState(false);
  const open = openProp ?? innerOpen;

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const close = useCallback(
    (refocus: boolean) => {
      pressing.current = false;
      setLive(null);
      setOpen(false);
      if (refocus) coreRef.current?.focus();
    },
    [setOpen],
  );

  const enabled = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((i) => i >= 0);

  const openAndFocus = (index: number | undefined) => {
    if (open) {
      if (index !== undefined) itemRefs.current[index]?.focus();
      return;
    }
    pendingFocus.current = index ?? null;
    setOpen(true);
  };

  const select = (item: RadialMenuItem) => {
    if (item.disabled) return;
    onSelect?.(item.value);
    close(true);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setRtl(
      root.closest("[dir]")?.getAttribute("dir") === "rtl" ||
        getComputedStyle(root).direction === "rtl",
    );
  }, [open]);

  // Keyboard opening moves focus to an option once the menu is no longer inert.
  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    itemRefs.current[pendingFocus.current]?.focus();
    pendingFocus.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  const hitTest = (x: number, y: number): number | null => {
    const inside = (element: Element | null | undefined) => {
      const rect = element?.getBoundingClientRect();
      return rect
        ? x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        : false;
    };
    // The core sits above the options, which start collapsed beneath it.
    if (inside(coreRef.current)) return null;
    return enabled.find((index) => inside(itemRefs.current[index])) ?? null;
  };

  const onCorePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (open) {
      close(false);
      return;
    }
    pressing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setOpen(true);
  };

  const onCorePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pressing.current) setLive(hitTest(event.clientX, event.clientY));
  };

  const onCorePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!pressing.current) return;
    pressing.current = false;
    const hit = hitTest(event.clientX, event.clientY);
    setLive(null);
    // Released on an option: pick it. Anywhere else the fan stays open.
    if (hit !== null) select(items[hit] as RadialMenuItem);
  };

  const onCoreKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(event.key === "ArrowDown" ? enabled[0] : enabled[enabled.length - 1]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = enabled.indexOf(
      itemRefs.current.indexOf(event.target as HTMLButtonElement),
    );
    const count = enabled.length;
    let next: number | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = current + (rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = current + (rtl ? 1 : -1);
        break;
      case "ArrowDown":
        next = current + 1;
        break;
      case "ArrowUp":
        next = current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }
    event.preventDefault();
    itemRefs.current[enabled[(next + count) % count] as number]?.focus();
  };

  return (
    <div
      ref={setRoot}
      data-slot="radial-menu"
      data-state={open ? "open" : "closed"}
      className={cn("relative inline-grid size-14 place-items-center", className)}
      onBlur={(event) => {
        onBlur?.(event);
        const to = event.relatedTarget;
        if (open && to && !event.currentTarget.contains(to)) close(false);
      }}
      {...props}
    >
      <button
        ref={coreRef}
        type="button"
        data-slot="radial-menu-core"
        data-state={open ? "open" : "closed"}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          radialMenuVariants({ part: "core", tone, stroke }),
          focusRing,
          "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        )}
        onPointerDown={onCorePointerDown}
        onPointerMove={onCorePointerMove}
        onPointerUp={onCorePointerUp}
        onPointerCancel={() => {
          pressing.current = false;
          setLive(null);
        }}
        onClick={(event) => {
          // Pointer presses are handled on pointerdown/up; this is the keyboard.
          if (event.detail !== 0) return;
          if (open) close(false);
          else openAndFocus(enabled[0]);
        }}
        onKeyDown={onCoreKeyDown}
      >
        <span
          data-slot="radial-menu-core-icon"
          className={cn("grid place-items-center", open && "rotate-135")}
          style={{ transition: `rotate ${ms(380)} ${OVERSHOOT}` }}
        >
          {icon ?? <PlusIcon />}
        </span>
      </button>
      <div
        id={menuId}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        data-slot="radial-menu-list"
        inert={!open}
        aria-hidden={open ? undefined : true}
        className="pointer-events-none absolute inset-0"
        onKeyDown={onMenuKeyDown}
      >
        {items.map((item, index) => {
          const { x, y } = radialPosition(index, items.length, arc, radius, rtl);
          const delay = open ? ms(index * stagger) : "0s";
          return (
            <button
              key={item.value}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-label={item.label}
              aria-disabled={item.disabled || undefined}
              data-slot="radial-menu-item"
              data-live={live === index ? "" : undefined}
              className={cn(
                radialMenuVariants({ part: "item", tone, stroke }),
                focusRing,
                "group absolute inset-0 m-auto",
                open && "pointer-events-auto",
                "aria-disabled:opacity-55 data-[live]:z-2 data-[live]:ring-2 data-[live]:ring-foreground",
              )}
              style={{
                opacity: open ? 1 : 0,
                transform: open
                  ? `translate(${String(x)}px, ${String(y)}px) scale(1)`
                  : "translate(0px, 0px) scale(0.4)",
                // Staggered out, collapsed together.
                transition: `transform ${ms(420)} ${OVERSHOOT} ${delay}, opacity ${ms(200)} ease ${delay}`,
              }}
              onClick={() => {
                select(item);
              }}
            >
              <span aria-hidden="true" className="grid place-items-center">
                {item.icon}
              </span>
              <span
                aria-hidden="true"
                data-slot="radial-menu-caption"
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-full mx-auto mt-1.25 w-max",
                  "font-mono text-[0.5rem] tracking-[.06em] whitespace-nowrap uppercase",
                  "text-muted-foreground/70 opacity-0 transition-[opacity,color] duration-[var(--duration-fast)]",
                  "group-hover:text-muted-foreground group-hover:opacity-100",
                  "group-focus-visible:text-muted-foreground group-focus-visible:opacity-100",
                  "group-data-[live]:text-muted-foreground group-data-[live]:opacity-100",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { radialMenuVariants };
