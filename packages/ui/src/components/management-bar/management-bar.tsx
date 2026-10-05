"use client";

// Original design (pattern inspired by Animate UI Management Bar; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

import { NumberFlow } from "@/components/number-flow";
import { disabledStyles, focusRingInset, iconSlot, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A floating bulk-actions bar for a selection.
 *
 * It arrives when something is selected and leaves when nothing is: the pill
 * rises on a spring from a little below, un-blurring as it comes, and its
 * groups — the count, the actions, the pager — follow it in on a short
 * stagger. Leaving is faster and plainer than arriving. Nothing animates on
 * first paint, so a page that loads with a selection simply shows the bar.
 *
 * Inside, the count rolls through NumberFlow as the selection grows and
 * shrinks, and the page number rolls the same way. Actions rest as icons;
 * hovering or focusing one springs its label open beside the icon (a width
 * spring to the label's natural size), so the bar stays compact until you
 * reach for something. The label is always in the accessible name, open or
 * not. While leaving, the bar keeps showing the last count rather than
 * rolling down to zero on its way out.
 *
 * Semantics: one role="toolbar" with a single Tab stop and a roving tabindex.
 * Arrow keys move between controls (Left/Right follow the reading direction),
 * Home and End jump to the ends. Pager buttons at a bound are aria-disabled
 * rather than disabled, so focus is never stranded on a control that vanished
 * from the Tab order; a disabled action is aria-disabled for the same reason,
 * and ignores activation. If the bar closes while focus is inside it — the usual
 * case after "Clear selection" — focus returns to wherever it came from.
 */

const managementBarVariants = cva("pointer-events-none flex justify-center", {
  variants: {
    /** `floating` pins the bar to the bottom of the viewport; `inline` leaves it in flow. */
    placement: {
      floating: "fixed inset-x-0 bottom-6 z-[var(--z-sticky)] px-4",
      inline: "relative",
    },
  },
  defaultVariants: { placement: "floating" },
});

const controlClass = cn(
  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-2.5 text-sm font-medium whitespace-nowrap",
  "text-muted-foreground transition-[color,background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:bg-accent hover:text-accent-foreground motion-safe:active:scale-95",
  // The controls sit flush inside the pill, so the ring is drawn inset.
  focusRingInset,
  disabledStyles,
  iconSlot,
);

const TONES = {
  default: "",
  primary: "text-primary hover:bg-primary/10 hover:text-primary",
  destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
} as const;

const RISE = { type: "spring", stiffness: 420, damping: 32, mass: 0.9 } as const;
const OPEN = { type: "spring", stiffness: 520, damping: 34 } as const;

const surfaceMotion: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.94, filter: "blur(8px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { ...RISE, staggerChildren: 0.05, delayChildren: 0.04 },
  },
  gone: {
    opacity: 0,
    y: 16,
    scale: 0.97,
    filter: "blur(4px)",
    transition: { duration: 0.16, ease: [0.64, 0, 0.78, 0] },
  },
};

const groupMotion: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: RISE },
};

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={mirrorForDirection}
    >
      <path d={back ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export interface ManagementBarAction {
  /** The action's name: its accessible name, and the label that springs open on hover or focus. */
  label: string;
  /** Decorative icon shown at rest. */
  icon: ReactNode;
  onSelect: () => void;
  /** `destructive` for delete-like actions. Colour is never the only signal: say so in the label. */
  tone?: keyof typeof TONES;
  disabled?: boolean;
}

export interface ManagementBarProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "role">,
    VariantProps<typeof managementBarVariants> {
  /** How many items are selected. The bar shows while it is above zero, unless `open` says otherwise. */
  selectedCount: number;
  /** Called by the clear button. Without it, no clear button is shown. */
  onClearSelection?: () => void;
  /** Bulk actions, in order. */
  actions?: ManagementBarAction[];
  /** Controlled current page, 1-based. */
  page?: number;
  /** Uncontrolled initial page. */
  defaultPage?: number;
  /** Total pages. Without it (or with fewer than 2), there is no pager. */
  pageCount?: number;
  onPageChange?: (page: number) => void;
  /** Overrides whether the bar is shown. Defaults to `selectedCount > 0`. */
  open?: boolean;
  /** `hover` springs each action's label open on hover or focus; `always` keeps every label open. */
  labels?: "hover" | "always";
  /** Word after the count, visibly and in the announcement: "3 selected". */
  selectedLabel?: string;
  /** The clear button's accessible name. */
  clearLabel?: string;
  /** Pager button names. */
  previousLabel?: string;
  nextLabel?: string;
  /** Classes for the pill itself. */
  surfaceClassName?: string;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/** A floating bulk-actions toolbar that springs in with a selection and rolls its counts. */
export function ManagementBar({
  className,
  surfaceClassName,
  placement,
  selectedCount,
  onClearSelection,
  actions = [],
  page: pageProp,
  defaultPage = 1,
  pageCount,
  onPageChange,
  open: openProp,
  labels = "hover",
  selectedLabel = "selected",
  clearLabel = "Clear selection",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  ref,
  "aria-label": ariaLabel = "Bulk actions",
  onKeyDown,
  onFocus,
  ...props
}: ManagementBarProps) {
  const open = openProp ?? selectedCount > 0;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cameFrom = useRef<HTMLElement | null>(null);
  const [roving, setRoving] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const total = Math.max(0, Math.floor(pageCount ?? 0));
  const page = Math.min(Math.max(1, pageProp ?? uncontrolledPage), Math.max(1, total));

  // Shown while leaving: the last count above zero, so the bar does not roll
  // down to nothing on its way out.
  const [held, setHeld] = useState(selectedCount);
  if (selectedCount > 0 && held !== selectedCount) setHeld(selectedCount);
  const count = selectedCount > 0 ? selectedCount : held;

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  // Closing with focus inside: hand focus back to where it came from.
  useEffect(() => {
    if (open) return;
    const root = rootRef.current;
    const back = cameFrom.current;
    cameFrom.current = null;
    if (root?.contains(document.activeElement) && back?.isConnected) back.focus();
  }, [open]);

  function goTo(next: number) {
    if (next < 1 || next > total || next === page) return;
    if (pageProp === undefined) setUncontrolledPage(next);
    onPageChange?.(next);
  }

  function items(): HTMLElement[] {
    const root = rootRef.current;
    return root ? [...root.querySelectorAll<HTMLElement>("[data-roving]")] : [];
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const list = items();
    const at = list.indexOf(event.target as HTMLElement);
    if (at === -1) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = at + (rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = at + (rtl ? 1 : -1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = list.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    list[(next + list.length) % list.length]?.focus();
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
      cameFrom.current = from;
    }
    const at = items().indexOf(event.target);
    if (at !== -1) setRoving(at);
  }

  const pager = total > 1;
  const controlCount = (onClearSelection ? 1 : 0) + actions.length + (pager ? 2 : 0);
  const formattedCount = new Intl.NumberFormat().format(count);

  // Each control's position in the roving order: clear, then the actions,
  // then the pager. If the controls shrink past the remembered one, the first
  // takes the Tab stop.
  const firstAction = onClearSelection ? 1 : 0;
  const firstPager = firstAction + actions.length;
  const stop = (mine: number) => {
    return {
      "data-roving": "",
      tabIndex: mine === roving || (roving >= controlCount && mine === 0) ? 0 : -1,
    };
  };
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        {open ? (
          <div
            key="management-bar"
            ref={setRoot}
            role="toolbar"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            data-slot="management-bar"
            className={cn(managementBarVariants({ placement }), className)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            {...props}
          >
            <motion.div
              data-slot="management-bar-surface"
              variants={surfaceMotion}
              initial="hidden"
              animate="shown"
              exit="gone"
              className={cn(
                "pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5",
                "border border-border bg-popover text-popover-foreground shadow-lg",
                surfaceClassName,
              )}
            >
              <motion.div
                variants={groupMotion}
                data-slot="management-bar-selection"
                className="flex items-center gap-1 ps-1 pe-2"
              >
                {onClearSelection ? (
                  <button
                    type="button"
                    aria-label={clearLabel}
                    data-slot="management-bar-clear"
                    className={cn(controlClass, "size-8 px-0")}
                    onClick={onClearSelection}
                    {...stop(0)}
                  >
                    <XIcon />
                  </button>
                ) : null}
                <span data-slot="management-bar-count" className="text-sm whitespace-nowrap">
                  <span className="sr-only">{`${formattedCount} ${selectedLabel}`}</span>
                  <span aria-hidden="true" className="inline-flex items-baseline gap-1">
                    <NumberFlow
                      value={count}
                      data-value={count}
                      className="font-semibold text-foreground tabular-nums"
                    />
                    <span className="text-muted-foreground">{selectedLabel}</span>
                  </span>
                </span>
              </motion.div>

              {actions.length > 0 ? (
                <>
                  <Divider />
                  <motion.div
                    variants={groupMotion}
                    data-slot="management-bar-actions"
                    className="flex items-center gap-0.5"
                  >
                    {actions.map((action, at) => {
                      const labelled = labels === "always" || expanded === at;
                      return (
                        <button
                          key={action.label}
                          type="button"
                          data-slot="management-bar-action"
                          data-tone={action.tone ?? "default"}
                          data-expanded={labelled ? "" : undefined}
                          aria-disabled={action.disabled || undefined}
                          className={cn(controlClass, TONES[action.tone ?? "default"])}
                          onClick={() => {
                            if (!action.disabled) action.onSelect();
                          }}
                          onPointerEnter={() => {
                            setExpanded(at);
                          }}
                          onPointerLeave={() => {
                            setExpanded((current) => (current === at ? null : current));
                          }}
                          onFocus={() => {
                            setExpanded(at);
                          }}
                          onBlur={() => {
                            setExpanded((current) => (current === at ? null : current));
                          }}
                          {...stop(firstAction + at)}
                        >
                          <span aria-hidden="true" className="grid place-items-center">
                            {action.icon}
                          </span>
                          <motion.span
                            data-slot="management-bar-action-label"
                            className="block overflow-hidden whitespace-nowrap"
                            initial={false}
                            animate={{
                              width: labelled ? "auto" : 0,
                              opacity: labelled ? 1 : 0,
                              marginInlineStart: labelled ? 6 : 0,
                              filter: labelled ? "blur(0px)" : "blur(2px)",
                            }}
                            transition={OPEN}
                          >
                            {action.label}
                          </motion.span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              ) : null}

              {pager ? (
                <>
                  <Divider />
                  <motion.div
                    variants={groupMotion}
                    data-slot="management-bar-pager"
                    className="flex items-center gap-0.5"
                  >
                    <button
                      type="button"
                      aria-label={previousLabel}
                      aria-disabled={page <= 1 || undefined}
                      data-slot="management-bar-previous"
                      className={cn(controlClass, "size-8 px-0")}
                      onClick={() => {
                        goTo(page - 1);
                      }}
                      {...stop(firstPager)}
                    >
                      <Chevron back />
                    </button>
                    <span
                      data-slot="management-bar-page"
                      className="px-1 text-sm whitespace-nowrap text-muted-foreground"
                    >
                      <span className="sr-only">{`Page ${String(page)} of ${String(total)}`}</span>
                      <span aria-hidden="true" className="inline-flex items-baseline gap-1">
                        <NumberFlow
                          value={page}
                          data-value={page}
                          className="font-medium text-foreground tabular-nums"
                        />
                        <span>of</span>
                        <NumberFlow value={total} className="tabular-nums" />
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={nextLabel}
                      aria-disabled={page >= total || undefined}
                      data-slot="management-bar-next"
                      className={cn(controlClass, "size-8 px-0")}
                      onClick={() => {
                        goTo(page + 1);
                      }}
                      {...stop(firstPager + 1)}
                    >
                      <Chevron />
                    </button>
                  </motion.div>
                </>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

function Divider() {
  return (
    <motion.span
      aria-hidden="true"
      data-slot="management-bar-divider"
      variants={groupMotion}
      className="mx-1 h-5 w-px shrink-0 bg-border"
    />
  );
}

export { managementBarVariants };
