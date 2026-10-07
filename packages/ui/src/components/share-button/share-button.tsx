"use client";

// Original design (pattern inspired by Animate UI Share Button; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A "Share" pill that opens into a row of share targets.
 *
 * Opening is a layout spring: the pill's width is measured before and after
 * and `motion` springs between them, overshooting a touch, while the label
 * blurs and slides out and the targets pop in one after another — scale,
 * lift and blur, staggered from the trigger outward. Closing runs it back,
 * faster. `motion` is used because a spring between two measured widths is
 * the one thing CSS cannot do honestly (ADR 0014); `MotionConfig
 * reducedMotion="user"` turns the springs into instant changes.
 *
 * Opening. A hover (on a pointer that can hover) or keyboard focus opens it
 * as a preview; leaving or tabbing away closes it. A press opens it — or
 * keeps a previewed tray open — until the next press, Escape, a press
 * outside or focus leaving. Touch only ever presses. `openOn="click"` drops
 * the preview. With `native` and a browser that has `navigator.share`, the
 * trigger hands off to the system share sheet instead, and falls back to the
 * tray if that fails.
 *
 * Accessibility. The trigger is a button named by `label`, with
 * aria-expanded and aria-controls pointing at a labelled group of links and
 * buttons, each named by its target's label. Escape collapses and returns
 * focus to the trigger; Arrow keys move between the trigger and the targets.
 * Copying the link morphs its icon into a check and is announced through a
 * polite status region.
 */

const LAYOUT_SPRING: Transition = { type: "spring", stiffness: 420, damping: 28, mass: 0.8 };
const POP_SPRING: Transition = { type: "spring", stiffness: 520, damping: 22, mass: 0.7 };

/** Gap between targets popping in, in seconds. */
const STAGGER = 0.045;
/** Grace before a hover preview closes, so crossing a gap does not snap it shut. A behaviour timer. */
const LEAVE_GRACE_MS = 160;
/** How long the copied check stays. A behaviour timer. */
const COPIED_MS = 2000;

const shareButtonVariants = cva(
  "relative inline-flex items-center gap-0.5 overflow-hidden p-1 font-medium whitespace-nowrap shadow-sm select-none",
  {
    variants: {
      variant: {
        solid: "bg-primary text-primary-foreground",
        outline: "border border-border bg-background text-foreground",
        soft: "bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-primary",
      },
      size: {
        sm: "h-8 text-xs [&_svg]:size-3.5",
        md: "h-10 text-sm [&_svg]:size-4",
        lg: "h-12 text-base [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  },
);

/** The circular controls inside the pill: the trigger's icon well and each target. */
const control = cn(
  "relative grid shrink-0 cursor-pointer place-items-center rounded-full",
  "transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:bg-current/12 active:bg-current/20 [&_svg]:pointer-events-none",
  focusRingInset,
);

const CONTROL_SIZE = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
} as const;

const triggerClass = cn(
  "relative flex h-full shrink-0 cursor-pointer items-center gap-1 rounded-full",
  "transition-[background-color,color,padding] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:bg-current/12 active:bg-current/20",
  focusRingInset,
);

/** The two stacked icons in a morphing well. */
const iconLayer = cn(
  "col-start-1 row-start-1 grid place-items-center",
  "transition-[opacity,scale,rotate] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
);
const iconShown = "scale-100 rotate-0 opacity-100";
const iconHidden = "scale-50 -rotate-90 opacity-0";

function Glyph({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

function ShareGlyph() {
  return (
    <Glyph>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </Glyph>
  );
}

function CloseGlyph() {
  return (
    <Glyph>
      <path d="M18 6 6 18M6 6l12 12" />
    </Glyph>
  );
}

function LinkGlyph() {
  return (
    <Glyph>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Glyph>
  );
}

function CheckGlyph() {
  return (
    <Glyph>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

export interface ShareTarget {
  /** Names the target for assistive technology and its tooltip. */
  label: string;
  /** Decorative icon. */
  icon: ReactNode;
  /** Renders the target as a link. Opens in a new tab unless `newTab` is false. */
  href?: string;
  /** Called when the target is chosen. The tray then collapses. */
  onSelect?: (event: MouseEvent<HTMLElement>) => void;
  /** For `href` targets: open in a new tab (default true). */
  newTab?: boolean;
}

export type ShareButtonOpenOn = "hover" | "click";

/**
 * Native drag and animation-start handlers are omitted: the root is a `motion`
 * element, which gives those names its own gesture and animation meanings.
 */
export interface ShareButtonProps
  extends
    Omit<
      ComponentPropsWithRef<"div">,
      "onCopy" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
    >,
    VariantProps<typeof shareButtonVariants> {
  /** The targets, in order from the trigger outward. */
  targets?: ShareTarget[];
  /** The link being shared. Adds a built-in "Copy link" target, last. */
  url?: string;
  /** Trigger name and visible text. */
  label?: string;
  /** Accessible name for the group of targets. */
  groupLabel?: string;
  /** Name of the built-in copy target. */
  copyLabel?: string;
  /** Announced once the link is on the clipboard. */
  copiedLabel?: string;
  /** Called with `url` once it has been copied. */
  onCopy?: (url: string) => void;
  /** Hand off to `navigator.share` where the browser has it, instead of opening the tray. */
  native?: boolean;
  /** `title` for the native share sheet. */
  shareTitle?: string;
  /** `text` for the native share sheet. */
  shareText?: string;
  /** `hover` (default) previews on hover and keyboard focus as well as opening on press. */
  openOn?: ShareButtonOpenOn;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger's icon. Defaults to a share glyph. */
  icon?: ReactNode;
}

function subscribeNothing() {
  return () => {};
}

/** Whether the browser offers a native share sheet; false on the server. */
function useCanShareNatively(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/** A share pill that springs open into a staggered row of share targets. */
export function ShareButton({
  className,
  variant,
  size,
  targets = [],
  url,
  label = "Share",
  groupLabel = "Share to",
  copyLabel = "Copy link",
  copiedLabel = "Link copied",
  onCopy,
  native = false,
  shareTitle,
  shareText,
  openOn = "hover",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  icon,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onKeyDown,
  onBlur,
  style,
  ...props
}: ShareButtonProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;
  // A preview (hover, keyboard focus) closes when the pointer or focus leaves;
  // a pressed-open tray stays until it is dismissed.
  const [pinned, setPinned] = useState(defaultOpen || openProp === true);
  const [copied, setCopied] = useState(false);
  const [nativeFailed, setNativeFailed] = useState(false);
  const canShare = useCanShareNatively();
  const useNative = native && canShare && !nativeFailed;

  const groupId = useId();
  const root = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerPressed = useRef(false);

  const dim = CONTROL_SIZE[size ?? "md"];

  useEffect(
    () => () => {
      clearTimeout(leaveTimer.current);
      clearTimeout(copiedTimer.current);
    },
    [],
  );

  function setOpen(next: boolean, how: "preview" | "pin" = "pin") {
    clearTimeout(leaveTimer.current);
    setPinned(next && how === "pin");
    if (next === open) return;
    if (!controlled) setUncontrolled(next);
    onOpenChange?.(next);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  // A pinned tray closes on a press anywhere else.
  useEffect(() => {
    if (!open || !pinned) return;
    function handle(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      clearTimeout(leaveTimer.current);
      setPinned(false);
      if (!controlled) setUncontrolled(false);
      onOpenChange?.(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => {
      document.removeEventListener("pointerdown", handle);
    };
  }, [open, pinned, controlled, onOpenChange]);

  function handleTriggerClick() {
    if (useNative) {
      navigator.share({ url, title: shareTitle, text: shareText }).catch((error: unknown) => {
        // Dismissing the sheet is not a failure.
        if (error instanceof Error && error.name === "AbortError") return;
        setNativeFailed(true);
        setOpen(true);
      });
      return;
    }
    // Pressing a preview keeps it; pressing a pinned tray closes it.
    if (open && pinned) setOpen(false);
    else setOpen(true);
  }

  function handleTriggerFocus() {
    const fromPointer = pointerPressed.current;
    pointerPressed.current = false;
    if (fromPointer || openOn !== "hover" || useNative || open) return;
    setOpen(true, "preview");
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    onPointerEnter?.(event);
    clearTimeout(leaveTimer.current);
    if (event.pointerType === "touch" || openOn !== "hover" || useNative || open) return;
    setOpen(true, "preview");
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    if (!open || pinned || event.pointerType === "touch") return;
    if (root.current?.contains(document.activeElement)) return;
    leaveTimer.current = setTimeout(() => {
      setOpen(false);
    }, LEAVE_GRACE_MS);
  }

  // Focus that arrives between pointerdown and pointerup came from a press, not the keyboard.
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    pointerPressed.current = true;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    onPointerUp?.(event);
    pointerPressed.current = false;
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    const next = event.relatedTarget;
    if (next instanceof Node && root.current?.contains(next)) return;
    if (open) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (!open || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
    const items = [
      ...(root.current?.querySelectorAll<HTMLElement>(
        "[data-slot=share-button-trigger],[data-slot=share-button-target]",
      ) ?? []),
    ];
    const index = items.findIndex((item) => item === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const rtl = root.current ? getComputedStyle(root.current).direction === "rtl" : false;
    const forward = (event.key === "ArrowRight") !== rtl;
    const next = items[(index + (forward ? 1 : -1) + items.length) % items.length];
    next?.focus();
  }

  function copy() {
    if (url === undefined) return;
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard) return;
    clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        onCopy?.(url);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => {
          setCopied(false);
        }, COPIED_MS);
      })
      .catch(() => {
        // A refused write never shows the check.
      });
  }

  function choose(target: ShareTarget, event: MouseEvent<HTMLElement>) {
    target.onSelect?.(event);
    if (event.defaultPrevented) return;
    close(true);
  }

  const items: { key: string; label: string; node: ReactNode; target?: ShareTarget }[] =
    targets.map((target) => ({
      key: target.label,
      label: target.label,
      node: target.icon,
      target,
    }));
  if (url !== undefined) {
    items.push({
      key: "copy",
      label: copyLabel,
      node: (
        <span className="grid">
          <span
            data-slot="share-button-copy-icon"
            className={cn(iconLayer, copied ? iconHidden : iconShown)}
          >
            <LinkGlyph />
          </span>
          <span
            data-slot="share-button-copied-icon"
            className={cn(iconLayer, copied ? iconShown : "scale-50 rotate-90 opacity-0")}
          >
            <CheckGlyph />
          </span>
        </span>
      ),
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={root}
        layout
        transition={LAYOUT_SPRING}
        data-slot="share-button"
        data-state={open ? "open" : "closed"}
        className={cn(shareButtonVariants({ variant, size }), className)}
        // Set inline so the layout spring can correct the radius as the pill stretches.
        style={{ borderRadius: 9999, ...style }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        {...props}
      >
        <motion.button
          ref={trigger}
          layout="position"
          transition={LAYOUT_SPRING}
          type="button"
          data-slot="share-button-trigger"
          aria-label={label}
          aria-expanded={useNative ? undefined : open}
          aria-controls={useNative || !open ? undefined : groupId}
          className={cn(triggerClass, open ? "" : "pe-3")}
          onClick={handleTriggerClick}
          onFocus={handleTriggerFocus}
        >
          <span aria-hidden="true" className={cn("grid shrink-0 place-items-center", dim)}>
            <span
              data-slot="share-button-icon"
              className={cn(iconLayer, open && pinned ? iconHidden : iconShown)}
            >
              {icon ?? <ShareGlyph />}
            </span>
            <span
              data-slot="share-button-close-icon"
              className={cn(
                iconLayer,
                open && pinned ? iconShown : "scale-50 rotate-90 opacity-0",
              )}
            >
              <CloseGlyph />
            </span>
          </span>
          <AnimatePresence initial={false} mode="popLayout">
            {open ? null : (
              <motion.span
                key="label"
                data-slot="share-button-label"
                aria-hidden="true"
                initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{
                  opacity: 0,
                  x: 10,
                  filter: "blur(4px)",
                  transition: { duration: 0.14 },
                }}
                transition={POP_SPRING}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        {useNative ? null : (
          <div
            id={groupId}
            role="group"
            aria-label={groupLabel}
            data-slot="share-button-targets"
            className="flex items-center gap-0.5"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {open
                ? items.map((item, index) => {
                    const motionProps = {
                      layout: "position" as const,
                      initial: { opacity: 0, scale: 0.3, y: 10, filter: "blur(6px)" },
                      animate: {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { ...POP_SPRING, delay: 0.04 + index * STAGGER },
                      },
                      exit: {
                        opacity: 0,
                        scale: 0.5,
                        filter: "blur(4px)",
                        transition: { duration: 0.12 },
                      },
                    };
                    const shared = {
                      "data-slot": "share-button-target",
                      "aria-label": item.label,
                      title: item.label,
                      className: cn(control, dim),
                    };
                    const glyph = (
                      <span aria-hidden="true" className="grid place-items-center">
                        {item.node}
                      </span>
                    );
                    if (item.target?.href !== undefined) {
                      const target = item.target;
                      const newTab = target.newTab ?? true;
                      return (
                        <motion.a
                          key={item.key}
                          {...motionProps}
                          {...shared}
                          href={target.href}
                          target={newTab ? "_blank" : undefined}
                          rel={newTab ? "noopener noreferrer" : undefined}
                          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                            choose(target, event);
                          }}
                        >
                          {glyph}
                        </motion.a>
                      );
                    }
                    const target = item.target;
                    return (
                      <motion.button
                        key={item.key}
                        {...motionProps}
                        {...shared}
                        type="button"
                        data-copied={target ? undefined : copied}
                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                          if (target) choose(target, event);
                          else copy();
                        }}
                      >
                        {glyph}
                      </motion.button>
                    );
                  })
                : null}
            </AnimatePresence>
          </div>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? copiedLabel : ""}
        </span>
      </motion.div>
    </MotionConfig>
  );
}

export { shareButtonVariants };
