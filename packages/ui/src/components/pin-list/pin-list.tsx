"use client";

// Original design (pattern inspired by Animate UI Pin List; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A list split in two — what you pinned, and everything else — where pinning
 * a row carries it across.
 *
 * Each row is a list item with one control: a pin toggle (aria-pressed) named
 * "Pin <title>". Pressing it moves the row to the other list, and the row
 * glides there: it is the same `layoutId` in both lists, so `motion` animates
 * it from where it was to where it lands while every other row reflows around
 * it — a shared-layout animation between two DOM positions, which is what
 * ADR 0014 allows `motion` for. The pin turns upright and fills as it is
 * pressed (a CSS transition on `data-state`).
 *
 * A section with nothing in it leaves rather than sitting there empty: it
 * fades and shrinks out of the flow at once (`popLayout`) so the list below
 * slides up into its place, and fades back in when something is pinned.
 *
 * The row is re-created in its new list, so focus is put back on its pin
 * button there — a keyboard user can press it again to undo. A polite status
 * region says what happened ("Pinned Inbox"); it is empty on first paint.
 * Under reduced motion rows jump to their new place.
 */

export interface PinListItem {
  id: string;
  title: string;
  description?: ReactNode;
  /** A glyph before the title. Decorative. */
  icon?: ReactNode;
}

/** Rows as raised cards, or as plain rows that tint on hover. */
const pinListVariants = cva("flex w-full flex-col gap-5", {
  variants: {
    variant: {
      card: cn(
        "[&_[data-slot=pin-list-item]]:border [&_[data-slot=pin-list-item]]:border-border",
        "[&_[data-slot=pin-list-item]]:bg-card [&_[data-slot=pin-list-item]]:text-card-foreground [&_[data-slot=pin-list-item]]:shadow-xs",
      ),
      plain: "[&_[data-slot=pin-list-item]]:hover:bg-muted/60",
    },
  },
  defaultVariants: { variant: "card" },
});

const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
const INSTANT: Transition = { duration: 0 };

function PinGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillOpacity="0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="pin-list-pin-icon"
      className={cn(
        "size-4 rotate-45 transition-[rotate,scale,fill-opacity] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
        "group-data-[state=on]/pin:scale-110 group-data-[state=on]/pin:rotate-0 group-data-[state=on]/pin:[fill-opacity:1]",
      )}
    >
      <path d="M8.5 3h7l-1 6.5 3.5 4H6l3.5-4z" />
      <path d="M12 13.5V21" />
    </svg>
  );
}

type SectionKey = "pinned" | "unpinned";

interface Context {
  uid: string;
  items: PinListItem[];
  isPinned: (item: PinListItem) => boolean;
  pinLabel: (item: PinListItem) => string;
  disabled: boolean;
  toggle: (item: PinListItem) => void;
  register: (id: string, node: HTMLButtonElement | null) => void;
}

const PinListContext = createContext<Context | null>(null);

/*
 * A section reads its rows from context rather than props. When it empties
 * and AnimatePresence keeps it on screen to fade out, it is that frozen
 * element's *props* that go stale — context still updates, so the leaving
 * section drops the row that just left it instead of showing a ghost of it
 * beside the real one.
 */
function Section({
  sectionKey,
  label,
  ref,
}: {
  sectionKey: SectionKey;
  label: ReactNode;
  /** AnimatePresence's popLayout measures the leaving section through this. */
  ref?: Ref<HTMLDivElement>;
}) {
  const context = use(PinListContext);
  if (!context) return null;
  const { uid, items, isPinned, pinLabel, disabled, toggle, register } = context;
  const pinned = sectionKey === "pinned";
  const rows = items.filter((item) => isPinned(item) === pinned);
  const labelId = `${uid}-${sectionKey}`;

  return (
    <motion.div
      ref={ref}
      layout="position"
      data-slot="pin-list-section"
      data-section={sectionKey}
      className="flex flex-col gap-2"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
    >
      <div
        id={labelId}
        data-slot="pin-list-label"
        className="px-1 text-xs font-medium text-muted-foreground"
      >
        {label}
      </div>
      <ul aria-labelledby={labelId} className="flex flex-col gap-2">
        {rows.map((item) => (
          <motion.li
            key={item.id}
            layoutId={`${uid}-item-${item.id}`}
            layout
            data-slot="pin-list-item"
            data-pinned={pinned ? "" : undefined}
            className="flex items-center gap-3 p-3 transition-colors duration-[var(--duration-fast)]"
            // Inline so motion can keep the corners round while it scales the row.
            style={{ borderRadius: 12 }}
          >
            {item.icon ? (
              <motion.span
                layout="position"
                aria-hidden="true"
                data-slot="pin-list-icon"
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-4"
              >
                {item.icon}
              </motion.span>
            ) : null}
            <motion.span layout="position" className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{item.title}</span>
              {item.description ? (
                <span className="truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </motion.span>
            <motion.button
              layout="position"
              type="button"
              ref={(node: HTMLButtonElement | null) => {
                register(item.id, node);
              }}
              aria-pressed={pinned}
              aria-label={pinLabel(item)}
              data-slot="pin-list-pin"
              data-state={pinned ? "on" : "off"}
              disabled={disabled}
              onClick={() => {
                toggle(item);
              }}
              className={cn(
                "group/pin inline-grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground",
                "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
                "data-[state=on]:text-primary motion-safe:active:scale-90",
                focusRing,
                disabledStyles,
              )}
            >
              <PinGlyph />
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export interface PinListProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue">,
    VariantProps<typeof pinListVariants> {
  items: PinListItem[];
  /** Ids of pinned items (controlled). */
  pinned?: string[];
  /** Ids pinned at first render (uncontrolled). */
  defaultPinned?: string[];
  onPinnedChange?: (pinned: string[]) => void;
  /** Heading of the pinned section. */
  pinnedLabel?: ReactNode;
  /** Heading of the rest. */
  unpinnedLabel?: ReactNode;
  /** The pin button's name. Its pressed state says whether it is pinned. */
  pinLabel?: (item: PinListItem) => string;
  /** What the status region says after a change. */
  announce?: (item: PinListItem, pinned: boolean) => string;
  /** Disables every pin button. */
  disabled?: boolean;
}

const defaultPinLabel = (item: PinListItem) => `Pin ${item.title}`;
const defaultAnnounce = (item: PinListItem, pinned: boolean) =>
  `${pinned ? "Pinned" : "Unpinned"} ${item.title}`;

/** A list whose rows glide into and out of a pinned section. */
export function PinList({
  className,
  variant,
  items,
  pinned: pinnedProp,
  defaultPinned = [],
  onPinnedChange,
  pinnedLabel = "Pinned",
  unpinnedLabel = "All",
  pinLabel = defaultPinLabel,
  announce = defaultAnnounce,
  disabled = false,
  ...props
}: PinListProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const [uncontrolled, setUncontrolled] = useState(defaultPinned);
  const [message, setMessage] = useState("");
  const pinnedIds = pinnedProp ?? uncontrolled;
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);

  // The row was re-created in the other list; put focus back on its pin.
  useLayoutEffect(() => {
    if (refocus.current === null) return;
    buttons.current.get(refocus.current)?.focus();
    refocus.current = null;
  });

  function toggle(item: PinListItem) {
    const wasPinned = pinnedIds.includes(item.id);
    const next = wasPinned ? pinnedIds.filter((id) => id !== item.id) : [...pinnedIds, item.id];
    if (pinnedProp === undefined) setUncontrolled(next);
    onPinnedChange?.(next);
    refocus.current = item.id;
    setMessage(announce(item, !wasPinned));
  }

  const isPinned = (item: PinListItem) => pinnedIds.includes(item.id);
  const shown = (key: SectionKey) =>
    items.some((item) => isPinned(item) === (key === "pinned"));
  const context: Context = {
    uid,
    items,
    isPinned,
    pinLabel,
    disabled,
    toggle,
    register: (id, node) => {
      if (node) buttons.current.set(id, node);
      else buttons.current.delete(id);
    },
  };
  const sections: { key: SectionKey; label: ReactNode }[] = [
    { key: "pinned", label: pinnedLabel },
    { key: "unpinned", label: unpinnedLabel },
  ];

  return (
    <MotionConfig reducedMotion="user" transition={reduce ? INSTANT : SPRING}>
      <LayoutGroup id={uid}>
        <PinListContext value={context}>
          <div
            data-slot="pin-list"
            className={cn(pinListVariants({ variant }), className)}
            {...props}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {sections.map((section) =>
                shown(section.key) ? (
                  <Section key={section.key} sectionKey={section.key} label={section.label} />
                ) : null,
              )}
            </AnimatePresence>
            <p role="status" aria-live="polite" className="sr-only">
              {message}
            </p>
          </div>
        </PinListContext>
      </LayoutGroup>
    </MotionConfig>
  );
}

export { pinListVariants };
