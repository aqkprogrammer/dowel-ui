"use client";

// Ported from bencho Browser tabs (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing, focusRingInset, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { springEasing } from "./browser-tabs-spring";

/*
 * A miniature browser window whose tabs are a real tablist.
 *
 * The source is buttons with aria-pressed and a pointer-only reorder. Here the
 * strip is `role="tablist"` with roving focus and automatic activation, and a
 * tab moves one slot with Alt+Arrow or Ctrl+Shift+PageUp/PageDown, announced
 * through a polite live region, so dragging is never the only way to reorder.
 *
 * Tabs stay in the DOM in the order they were given and are placed by
 * `translate`. Moving a DOM node drops its before-change style, so a reordered
 * node would jump instead of springing; instead the visual position is exposed
 * with aria-posinset, and the arrow keys follow the visual order.
 *
 * The springs are CSS transitions whose easing is a `linear()` spring curve
 * (./browser-tabs-spring), so no animation library is needed and the global
 * reduced-motion rule settles everything at once. While a tab is held it
 * follows the pointer 1:1 with no transition; on release it springs home.
 */

const PREFIX = "browser-tabs";
/** Space between tabs, and the strip's height, in px (bencho's geometry). */
const GAP = 11;
const STRIP = 36;
/** How far the pointer travels before a press becomes a drag. */
const DRAG_SLOP = 3;
/** Spring duration. The overshoot comes from the easing, not from the time. */
const SPRING_MS = 460;

const STYLES = `@supports (transition-timing-function: linear(0, 1)){[data-slot="${PREFIX}-leaf"],[data-slot="${PREFIX}-ear"],[data-slot="${PREFIX}-tab"],[data-slot="${PREFIX}-body"]{transition-timing-function:var(--${PREFIX}-spring)}}`;

/** Surface and ink as variables, so every colour mix follows the tone. */
const browserTabsVariants = cva(
  "relative flex w-[var(--browser-tabs-width)] max-w-full flex-col bg-muted text-[var(--browser-tabs-ink)]",
  {
    variants: {
      /** `default` is a card-coloured window; `inverted` swaps surface and ink. */
      tone: {
        default:
          "[--browser-tabs-ink:var(--color-foreground)] [--browser-tabs-surface:var(--color-card)]",
        inverted:
          "[--browser-tabs-ink:var(--color-background)] [--browser-tabs-surface:var(--color-foreground)]",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

/** Ink mixed toward the surface: bencho's inactive, nav and URL colours. */
const ink = (percent: number) =>
  `color-mix(in oklab, var(--browser-tabs-ink) ${String(percent)}%, var(--browser-tabs-surface))`;

export interface BrowserTab {
  /** Stable id, used for selection and ordering. */
  value: string;
  /** The tab's title, also its accessible name. */
  label: string;
  /** A favicon: an `<img>`, an inline SVG or an icon component. Decorative. */
  icon?: ReactNode;
  /** Shown in the address field while this tab is active. */
  url?: string;
}

export interface BrowserTabsLabels {
  /** The tablist's accessible name. */
  tabList: string;
  back: string;
  forward: string;
  reload: string;
}

export interface BrowserTabsProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue" | "onChange">,
    VariantProps<typeof browserTabsVariants> {
  tabs: BrowserTab[];
  /** The active tab's value (controlled). */
  value?: string;
  /** The initially active tab when uncontrolled. Defaults to the first tab. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Tab values in visual order (controlled). Unknown values are dropped, missing ones appended. */
  order?: string[];
  /** Initial order when uncontrolled. Defaults to the order of `tabs`. */
  defaultOrder?: string[];
  /** Called with the new order after a drag swap or a keyboard move. */
  onOrderChange?: (order: string[]) => void;
  /** Spring overshoot for the leaf and tabs, 0–30. */
  bounce?: number;
  /** Window corner radius in px; the tab's top radius derives from it. */
  corner?: number;
  /** Tab width in px. */
  tabWidth?: number;
  /** Adds a 1px hairline to the window and the active tab. */
  stroke?: boolean;
  /** Page content for the active tab. Ignored when `renderPanel` is given. */
  children?: ReactNode;
  /** Renders the page for the active tab. */
  renderPanel?: (tab: BrowserTab) => ReactNode;
  /** Makes the back glyph a real button. Without a handler it is decoration. */
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  labels?: Partial<BrowserTabsLabels>;
  /** The live-region message after a move. `position` is 1-based. */
  formatMove?: (tab: BrowserTab, position: number, total: number) => string;
}

const DEFAULT_LABELS: BrowserTabsLabels = {
  tabList: "Tabs",
  back: "Back",
  forward: "Forward",
  reload: "Reload",
};

const defaultFormatMove = (tab: BrowserTab, position: number, total: number) =>
  `Moved ${tab.label} to position ${String(position)} of ${String(total)}`;

/** A consistent order: known values once each, then any tab it left out. */
function normalizeOrder(order: readonly string[] | undefined, tabs: BrowserTab[]): string[] {
  const values = tabs.map((tab) => tab.value);
  const known = (order ?? []).filter(
    (value, index, all) => values.includes(value) && all.indexOf(value) === index,
  );
  return [...known, ...values.filter((value) => !known.includes(value))];
}

function moveItem(order: string[], from: number, to: number): string[] {
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as string);
  return next;
}

/** Whether an element lays out right-to-left: the nearest `dir`, else computed style. */
function readRtl(element: HTMLElement): boolean {
  const attribute = element.closest("[dir]")?.getAttribute("dir");
  if (attribute === "rtl" || attribute === "ltr") return attribute === "rtl";
  return getComputedStyle(element).direction === "rtl";
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface Held {
  pointerId: number;
  value: string;
  startX: number;
  originX: number;
  startIndex: number;
  moved: boolean;
}

/** Back, forward and reload: a real button only when it does something. */
function NavGlyph({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  const glyph = cn(
    "flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-[1.125rem]",
    "text-[var(--browser-tabs-nav)]",
  );
  if (!onPress) {
    return (
      <span data-slot={`${PREFIX}-nav`} aria-hidden="true" className={glyph}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-slot={`${PREFIX}-nav`}
      aria-label={label}
      onClick={onPress}
      className={cn(
        glyph,
        focusRing,
        "transition-colors duration-[var(--duration-fast)] hover:text-[var(--browser-tabs-ink)]",
      )}
    >
      <span aria-hidden="true" className="contents">
        {children}
      </span>
    </button>
  );
}

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** A tablist in a miniature browser window, with drag and keyboard reordering. */
export function BrowserTabs({
  className,
  style,
  tabs,
  value: valueProp,
  defaultValue,
  onValueChange,
  order: orderProp,
  defaultOrder,
  onOrderChange,
  bounce = 15,
  corner = 20,
  tabWidth = 100,
  stroke = false,
  tone,
  children,
  renderPanel,
  onBack,
  onForward,
  onReload,
  labels: labelsProp,
  formatMove = defaultFormatMove,
  dir,
  ...props
}: BrowserTabsProps) {
  const id = useId();
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [valueState, setValueState] = useState(defaultValue ?? tabs[0]?.value);
  const value = valueProp ?? valueState;
  const active = tabs.find((tab) => tab.value === value) ?? tabs[0];

  const [orderState, setOrderState] = useState(() => normalizeOrder(defaultOrder, tabs));
  const order = useMemo(
    () => normalizeOrder(orderProp ?? orderState, tabs),
    [orderProp, orderState, tabs],
  );
  // The latest order, including a swap made earlier in the same pointer stream
  // before React has re-rendered.
  const orderRef = useRef(order);
  useLayoutEffect(() => {
    orderRef.current = order;
  });

  const [drag, setDrag] = useState<{ value: string; x: number } | null>(null);
  const held = useRef<Held | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const [inheritedRtl, setInheritedRtl] = useState(false);
  useLayoutEffect(() => {
    if (dir || !listRef.current) return;
    setInheritedRtl(readRtl(listRef.current));
  }, [dir]);
  const rtl = dir ? dir === "rtl" : inheritedRtl;
  const sign = rtl ? -1 : 1;

  const count = order.length;
  const step = tabWidth + GAP;
  const maxX = Math.max(0, (count - 1) * step);
  const stripWidth = count * tabWidth + Math.max(0, count - 1) * GAP;
  const tabRadius = Math.round(corner * 0.56 * 10) / 10;

  function select(next: string) {
    if (next === value) return;
    if (valueProp === undefined) setValueState(next);
    onValueChange?.(next);
  }

  function commitOrder(next: string[]) {
    orderRef.current = next;
    if (orderProp === undefined) setOrderState(next);
    onOrderChange?.(next);
  }

  function announceMove(tab: BrowserTab, index: number) {
    setAnnouncement(formatMove(tab, index + 1, count));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: BrowserTab) {
    const index = orderRef.current.indexOf(tab.value);
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";

    let moveTo: number | null = null;
    if (event.altKey && (event.key === forward || event.key === backward)) {
      moveTo = index + (event.key === forward ? 1 : -1);
    } else if (event.ctrlKey && event.shiftKey && /^Page(Up|Down)$/.test(event.key)) {
      moveTo = index + (event.key === "PageDown" ? 1 : -1);
    }
    if (moveTo !== null) {
      event.preventDefault();
      if (moveTo < 0 || moveTo >= count) return;
      commitOrder(moveItem(orderRef.current, index, moveTo));
      announceMove(tab, moveTo);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    let next: number | null = null;
    if (event.key === forward) next = (index + 1) % count;
    else if (event.key === backward) next = (index - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;

    event.preventDefault();
    const target = orderRef.current[next] as string;
    select(target);
    tabRefs.current.get(target)?.focus();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, tab: BrowserTab) {
    if (event.button !== 0) return;
    select(tab.value);
    event.currentTarget.setPointerCapture(event.pointerId);
    const startIndex = orderRef.current.indexOf(tab.value);
    held.current = {
      pointerId: event.pointerId,
      value: tab.value,
      startX: event.clientX,
      originX: startIndex * step,
      startIndex,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = held.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = (event.clientX - current.startX) * sign;
    if (!current.moved && Math.abs(dx) < DRAG_SLOP) return;
    current.moved = true;
    const x = clamp(current.originX + dx, 0, maxX);
    setDrag({ value: current.value, x });

    // Crossing a neighbour's midpoint swaps: the held tab takes the nearest slot.
    const from = orderRef.current.indexOf(current.value);
    const to = clamp(Math.round(x / step), 0, count - 1);
    if (to !== from) commitOrder(moveItem(orderRef.current, from, to));
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>, tab: BrowserTab) {
    const current = held.current;
    if (!current || current.pointerId !== event.pointerId) return;
    held.current = null;
    setDrag(null);
    const index = orderRef.current.indexOf(current.value);
    if (current.moved && index !== current.startIndex) announceMove(tab, index);
  }

  const heldValue = drag?.value;
  const slotX = (tabValue: string) =>
    drag && tabValue === drag.value ? drag.x : order.indexOf(tabValue) * step;
  const transition = (still: boolean): CSSProperties => ({
    transitionDuration: still ? "0s" : `calc(${String(SPRING_MS)}ms * var(--motion-scale))`,
  });

  const activeValue = active?.value ?? "";
  const leafX = slotX(activeValue);
  const leafHeld = heldValue === activeValue;
  const atStart = leafX < 0.5;
  const activeTabId = `${id}-tab-${String(Math.max(0, tabs.indexOf(active as BrowserTab)))}`;
  const panelId = `${id}-panel`;

  const ear = (side: "start" | "end"): CSSProperties => {
    // The concave cut is centred on the ear's outer top corner.
    const outerOnLeft = (side === "start") !== rtl;
    return {
      position: "absolute",
      bottom: 0,
      width: tabRadius,
      height: tabRadius,
      [side === "start" ? "insetInlineStart" : "insetInlineEnd"]: -tabRadius,
      background: `radial-gradient(circle at ${outerOnLeft ? "0 0" : "100% 0"}, transparent ${String(tabRadius - 0.5)}px, var(--browser-tabs-surface) ${String(tabRadius)}px)`,
      transformOrigin: outerOnLeft ? "100% 100%" : "0 100%",
      scale: side === "start" && atStart ? "0" : "1",
      ...transition(leafHeld),
    };
  };

  return (
    <div
      data-slot={PREFIX}
      dir={dir}
      className={cn(browserTabsVariants({ tone }), className)}
      style={
        {
          "--browser-tabs-width": `max(20rem, ${String(stripWidth + Math.max(8, corner))}px)`,
          "--browser-tabs-spring": springEasing((clamp(bounce, 0, 30) / 30) * 0.6),
          "--browser-tabs-nav": ink(54),
          borderRadius: corner,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href={`dowel-${PREFIX}`} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot={`${PREFIX}-bar`}
        className="relative z-1 flex items-end pt-2"
        style={{ paddingInlineEnd: Math.max(8, corner) }}
      >
        <div
          ref={listRef}
          role="tablist"
          aria-label={labels.tabList}
          aria-orientation="horizontal"
          data-slot={`${PREFIX}-list`}
          className="relative h-9 shrink-0"
          style={{ width: stripWidth }}
        >
          <div
            aria-hidden="true"
            data-slot={`${PREFIX}-leaf`}
            data-at-start={atStart ? "" : undefined}
            className={cn(
              "pointer-events-none absolute start-0 top-0 bg-[var(--browser-tabs-surface)]",
              "transition-[translate] ease-[var(--ease-overshoot)]",
              stroke &&
                "shadow-[inset_0_1px_0_0_var(--color-border),inset_1px_0_0_0_var(--color-border),inset_-1px_0_0_0_var(--color-border)]",
            )}
            style={{
              width: tabWidth,
              height: STRIP + 1,
              translate: `${String(leafX * sign)}px 0`,
              borderRadius: `${String(tabRadius)}px ${String(tabRadius)}px 0 0`,
              ...transition(leafHeld),
            }}
          >
            <span
              data-slot={`${PREFIX}-ear`}
              data-side="start"
              className="transition-[scale] ease-[var(--ease-overshoot)]"
              style={ear("start")}
            />
            <span
              data-slot={`${PREFIX}-ear`}
              data-side="end"
              className="transition-[scale] ease-[var(--ease-overshoot)]"
              style={ear("end")}
            />
          </div>
          {tabs.map((tab, index) => {
            const selected = tab.value === activeValue;
            const isHeld = heldValue === tab.value;
            return (
              <button
                key={tab.value}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.value, node);
                  else tabRefs.current.delete(tab.value);
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${String(index)}`}
                aria-selected={selected}
                aria-controls={panelId}
                aria-posinset={order.indexOf(tab.value) + 1}
                aria-setsize={count}
                tabIndex={selected ? 0 : -1}
                data-slot={`${PREFIX}-tab`}
                data-state={selected ? "active" : "inactive"}
                data-held={isHeld ? "" : undefined}
                className={cn(
                  "absolute start-0 top-0 flex h-9 cursor-grab touch-none items-center gap-1.75 px-2.5 select-none",
                  "text-[13.5px] font-medium data-[held]:cursor-grabbing",
                  "text-[var(--browser-tabs-idle)] hover:text-[var(--browser-tabs-hover)] aria-selected:text-[var(--browser-tabs-ink)]",
                  "transition-[translate,color] ease-[var(--ease-overshoot)]",
                  focusRingInset,
                )}
                style={
                  {
                    "--browser-tabs-idle": ink(67),
                    "--browser-tabs-hover": ink(73),
                    width: tabWidth,
                    translate: `${String(slotX(tab.value) * sign)}px 0`,
                    borderRadius: `${String(tabRadius)}px ${String(tabRadius)}px 0 0`,
                    ...transition(isHeld),
                  } as CSSProperties
                }
                onClick={() => {
                  select(tab.value);
                }}
                onKeyDown={(event) => {
                  handleKeyDown(event, tab);
                }}
                onPointerDown={(event) => {
                  handlePointerDown(event, tab);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => {
                  handlePointerEnd(event, tab);
                }}
                onPointerCancel={(event) => {
                  handlePointerEnd(event, tab);
                }}
              >
                {tab.icon != null ? (
                  <span
                    aria-hidden="true"
                    data-slot={`${PREFIX}-icon`}
                    className="flex size-4 shrink-0 items-center justify-center [&_img]:size-4 [&_svg]:size-4"
                  >
                    {tab.icon}
                  </span>
                ) : null}
                <span className="min-w-0 truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        data-slot={`${PREFIX}-body`}
        className={cn(
          "relative overflow-hidden bg-[var(--browser-tabs-surface)]",
          "transition-[border-radius] ease-[var(--ease-overshoot)]",
          stroke && "ring-1 ring-border ring-inset",
        )}
        style={{
          borderStartStartRadius: atStart ? 0 : corner,
          borderStartEndRadius: corner,
          borderEndEndRadius: corner,
          borderEndStartRadius: corner,
          ...transition(leafHeld),
        }}
      >
        <div data-slot={`${PREFIX}-toolbar`} className="flex items-center gap-3 px-3 py-2.5">
          <NavGlyph label={labels.back} onPress={onBack}>
            <svg {...svgProps} className={mirrorForDirection}>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </NavGlyph>
          <NavGlyph label={labels.forward} onPress={onForward}>
            <svg {...svgProps} className={mirrorForDirection}>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </NavGlyph>
          <NavGlyph label={labels.reload} onPress={onReload}>
            <svg {...svgProps}>
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </NavGlyph>
          <div
            data-slot={`${PREFIX}-url`}
            className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-full px-3.5 text-[13px]"
            style={{
              background: `color-mix(in oklab, var(--browser-tabs-ink) 6%, var(--browser-tabs-surface))`,
              color: ink(64),
            }}
          >
            <svg {...svgProps} className="size-3.5 shrink-0">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="truncate">{active?.url}</span>
          </div>
        </div>
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={activeTabId}
          tabIndex={0}
          data-slot={`${PREFIX}-panel`}
          className={cn(
            "min-h-23 border-t border-[color-mix(in_oklab,var(--browser-tabs-ink)_7%,transparent)]",
            focusRingInset,
          )}
        >
          {renderPanel && active ? renderPanel(active) : children}
        </div>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export { browserTabsVariants };
