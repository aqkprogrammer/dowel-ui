"use client";

// Ported from amicro "Card Spreads" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  getCardSpreadOrigin,
  getCardSpreadPose,
  type CardSpreadLayout,
  type CardSpreadTuning,
} from "./card-spread-layouts";

/*
 * A deck that fans out (ADR 0014: one mechanism, a `layout` axis for every
 * amicro spread). amicro animates each card with a spring from `motion`; the
 * cards here only ever travel between two known poses, so a CSS transition on
 * `transform` with the overshoot ease does the same job, and the duration and
 * per-card stagger run through the motion scale: under reduced motion the
 * layout still applies, instantly. This is decoration, never an indicator.
 *
 * The spread is visual only: every card is in the accessibility tree whether
 * the deck is open or closed. The only state worth reporting is whether the
 * deck is pinned open, and that belongs to the toggle, as aria-pressed.
 */

const PREFIX = "dowel-card-spread";

/*
 * Only the direction flip lives in the stylesheet: horizontal travel and
 * rotation are multiplied by it, so in RTL the first card fans toward the
 * inline start and the corner fan pivots on the bottom-right. Two rules,
 * because a browser without :dir() would drop a combined selector outright.
 */
const STYLES = `
[data-slot=card-spread]{--card-spread-flip:1}
[dir=rtl] [data-slot=card-spread]{--card-spread-flip:-1}
[data-slot=card-spread]:dir(rtl){--card-spread-flip:-1}
[data-slot=card-spread]:dir(ltr){--card-spread-flip:1}
`;

const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** The deck: sized like one card, with the spread overflowing it. */
const cardSpreadVariants = cva("relative isolate shrink-0", {
  variants: {
    /** The card size. Override with `className` (`w-* h-*`) for anything else. */
    size: {
      sm: "h-32 w-24",
      md: "h-44 w-32",
      lg: "h-56 w-40",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/** A card's surface. */
const cardSpreadItemVariants = cva(
  "block size-full overflow-hidden bg-muted text-muted-foreground",
  {
    variants: {
      /**
       * `rounded` is a plain card. `stamp` perforates all four edges with a CSS
       * mask — the Stamp Arc's postage stamps.
       */
      edge: {
        rounded: "rounded-2xl border border-border shadow-md",
        stamp: "rounded-none",
      },
    },
    defaultVariants: {
      edge: "rounded",
    },
  },
);

/**
 * Perforations: a circle punched out every `--card-spread-hole` + gap along
 * each edge, and a solid block through the middle. The mask only reads alpha,
 * so `black` here is opacity, not a colour.
 */
const STAMP_MASK = [
  "radial-gradient(var(--card-spread-hole), transparent 98%, black) round " +
    "calc(-1.5 * var(--card-spread-hole) - 0.1875rem) calc(-1.5 * var(--card-spread-hole) - 0.1875rem) / " +
    "calc(3 * var(--card-spread-hole) + 0.375rem) calc(3 * var(--card-spread-hole) + 0.375rem)",
  "linear-gradient(black 0 0) no-repeat 50% / " +
    "calc(100% - 3 * var(--card-spread-hole) - 0.375rem) calc(100% - 3 * var(--card-spread-hole) - 0.375rem)",
].join(", ");

const STAMP_STYLE = {
  "--card-spread-hole": "0.3125rem",
  mask: STAMP_MASK,
  WebkitMask: STAMP_MASK,
} as CSSProperties;

export type CardSpreadTrigger = "hover" | "click" | "manual";

interface SpreadContextValue {
  layout: CardSpreadLayout;
  count: number;
  open: boolean;
  tuning: CardSpreadTuning;
  stagger: number;
  edge: "rounded" | "stamp";
}

/**
 * The cards, in deck order.
 *
 * A card's position comes from its index among its siblings, so the cards must
 * be children of the spread itself. Fragments are opened up, because
 * `<>{a}{b}</>` is still a list of cards; anything else is counted as one card,
 * and a wrapper component that renders several cards would put them all at
 * index 0 on top of each other — so development builds say so (see
 * CardSpread).
 */
function flattenItems(children: ReactNode): ReactElement[] {
  const items: ReactElement[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === Fragment) {
      items.push(...flattenItems(child.props.children));
      continue;
    }
    items.push(child);
  }
  return items;
}

const SpreadContext = createContext<SpreadContextValue | null>(null);
const IndexContext = createContext(0);

export interface CardSpreadProps
  extends
    ComponentPropsWithRef<"div">,
    VariantProps<typeof cardSpreadVariants>,
    CardSpreadTuning {
  /** How the cards fan out. `arc` with seven children is amicro's ARC (7 Cards). */
  layout?: CardSpreadLayout;
  /** Controlled pinned-open state. Hover and focus still open it transiently. */
  open?: boolean;
  /** Initial pinned-open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the toggle (click, tap, Enter, Space or Escape) pins or unpins the spread. */
  onOpenChange?: (open: boolean) => void;
  /**
   * What opens the spread.
   *
   * - `hover` (default): hover, keyboard focus anywhere inside, or pinned by
   *   the deck's toggle.
   * - `click`: only the toggle.
   * - `manual`: only the `open` prop; no toggle is rendered.
   */
  trigger?: CardSpreadTrigger;
  /** Milliseconds between one card starting to move and the next. Scaled for reduced motion. */
  stagger?: number;
  /** Card edge for every item. Defaults to `stamp` for the stamp layout. */
  edge?: "rounded" | "stamp";
  /** Accessible name of the pin toggle a deck of non-interactive cards gets. */
  toggleLabel?: string;
}

/** A stack of cards that fans out into a layout on hover, focus, or when pinned. */
export function CardSpread({
  className,
  children,
  layout = "arc",
  size,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger = "hover",
  stagger = 30,
  edge,
  toggleLabel = "Spread cards",
  arc,
  gap,
  offset,
  ref,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: CardSpreadProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const pinned = controlled ? openProp : uncontrolled;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interactiveItems, setInteractiveItems] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Focus that follows a pointer press is not a keyboard user arriving: a
  // click pins or unpins, and must not be masked by focus holding it open.
  const pressing = useRef(false);

  const open = pinned || (trigger === "hover" && (hovered || focused));

  const setPinned = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  // A deck of links or buttons is reached, and opened, through them. A deck
  // of pictures gets a real toggle button instead, or a keyboard user could
  // never open it. The toggle is a sibling of the cards, not their parent,
  // so every card's own content stays in the accessibility tree.
  useEffect(() => {
    const cards = rootRef.current?.querySelectorAll('[data-slot="card-spread-item"]') ?? [];
    const has = Array.from(cards).some((card) => card.querySelector(FOCUSABLE) != null);
    if (has !== interactiveItems) setInteractiveItems(has);
  }, [children, interactiveItems]);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  function handleToggleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Escape" || !open) return;
    setFocused(false);
    setHovered(false);
    if (pinned) setPinned(false);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    onPointerEnter?.(event);
    // A tap is a click, not a hover: touch pins with the toggle instead.
    if (event.pointerType !== "touch") setHovered(true);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    setHovered(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    pressing.current = true;
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    if (!pressing.current) setFocused(true);
    pressing.current = false;
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  const items = flattenItems(children);
  const foreignChild = items.some((item) => item.type !== CardSpreadItem);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !foreignChild) return;
    console.warn(
      "CardSpread: every child should be a <CardSpreadItem>. A component that renders " +
        "several cards is counted as one, so its cards stack at the same position.",
    );
  }, [foreignChild]);
  const context: SpreadContextValue = {
    layout,
    count: items.length,
    open,
    tuning: { arc, gap, offset },
    stagger,
    edge: edge ?? (layout === "stamp" ? "stamp" : "rounded"),
  };

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        ref={setRef}
        role="group"
        data-slot="card-spread"
        data-layout={layout}
        data-state={open ? "open" : "closed"}
        data-pinned={pinned ? "" : undefined}
        className={cn(cardSpreadVariants({ size }), className)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        <SpreadContext value={context}>
          {items.map((item, index) => (
            <IndexContext key={item.key ?? index} value={index}>
              {item}
            </IndexContext>
          ))}
        </SpreadContext>
        {trigger !== "manual" && !interactiveItems ? (
          <button
            type="button"
            data-slot="card-spread-toggle"
            aria-pressed={pinned}
            aria-label={toggleLabel}
            style={{ zIndex: items.length + 1 }}
            className={cn("absolute inset-0 cursor-pointer rounded-2xl", focusRing)}
            onClick={() => {
              setPinned(!pinned);
            }}
            onKeyDown={handleToggleKeyDown}
          />
        ) : null}
      </div>
    </>
  );
}

export interface CardSpreadItemProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof cardSpreadItemVariants> {
  /**
   * Render the card surface as your own element — an `<a>` or `<button>` for
   * a card that goes somewhere or does something.
   */
  asChild?: boolean;
}

/** One card. Its position comes from its index in the deck. */
export function CardSpreadItem({
  className,
  asChild,
  edge,
  style,
  ...props
}: CardSpreadItemProps) {
  const spread = useContext(SpreadContext);
  const index = useContext(IndexContext);
  if (!spread) throw new Error("<CardSpreadItem> must be rendered inside <CardSpread>.");

  const { layout, count, open, tuning, stagger } = spread;
  const pose = getCardSpreadPose(layout, index, count, open, tuning);
  const origin = getCardSpreadOrigin(layout);
  const flip = "var(--card-spread-flip, 1)";
  // Opening deals from the first card; closing gathers from the last.
  const order = open ? index : count - 1 - index;
  const surfaceEdge = edge ?? spread.edge;

  const position: CSSProperties = {
    zIndex: pose.z,
    transform:
      `translate(calc(${String(pose.x)}% * ${flip}), ${String(pose.y)}%) ` +
      `rotate(calc(${String(pose.rotate)}deg * ${flip})) scale(${String(pose.scale)})`,
    transformOrigin: `calc(50% + ${String(origin.x)}% * ${flip}) ${String(origin.y)}%`,
    transitionDelay: `calc(${String(order * stagger)}ms * var(--motion-scale, 1))`,
  };

  const Surface = asChild ? Slot.Root : "div";

  return (
    <div
      data-slot="card-spread-item"
      data-state={open ? "open" : "closed"}
      data-index={index}
      style={position}
      className={cn(
        "absolute inset-0 transition-transform duration-[var(--duration-slower)] ease-[var(--ease-overshoot)]",
        "data-[state=closed]:ease-[var(--ease-out-quint)]",
        // The mask would clip a ring drawn on the stamp itself, so it is drawn here.
        surfaceEdge === "stamp" &&
          "drop-shadow-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
      )}
    >
      <Surface
        data-slot="card-spread-card"
        data-edge={surfaceEdge}
        style={surfaceEdge === "stamp" ? { ...STAMP_STYLE, ...style } : style}
        className={cn(cardSpreadItemVariants({ edge: surfaceEdge }), focusRing, className)}
        {...props}
      />
    </div>
  );
}

export { cardSpreadItemVariants, cardSpreadVariants };
