"use client";

// Original design (pattern inspired by Rare UI Notification bell; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Slot } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import {
  NotificationBadge,
  type NotificationBadgeProps,
} from "@/components/notification-badge";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A round bell button with an unread badge.
 *
 * The badge is NotificationBadge, so the count rolls through NumberFlow, caps
 * at "99+", shrinks away at zero and pops back in above it, exactly as it does
 * everywhere else. This only places it: on the circle at 45°, where a badge on
 * a round button belongs, with every length a fraction of `size` so the whole
 * thing scales from one number. The dot shape additionally shrinks away at
 * zero — a dot that says "unread" while nothing is unread would be a lie.
 *
 * The swing. When the count rises the bell is pushed: its angle is a motion
 * value on an underdamped spring pivoting at the crown, and each new
 * notification adds angular velocity along the swing already under way. So
 * one arrival is a brief pendulum, several in quick succession build a larger
 * one, and it decays on its own as the spring loses energy — the
 * accumulation is the physics, not a counter. A CSS keyframe restarted
 * mid-swing would snap the bell upright first; carrying velocity through is
 * the case ADR 0014 keeps `motion` for. The clapper trails the swing a
 * little. A falling count never swings, nothing swings on first paint, and
 * under reduced motion the push is skipped entirely (the spring is driven
 * imperatively, so MotionConfig alone could not stop it).
 *
 * Accessibility. The button is named "Notifications, 3 unread", so the count
 * is heard wherever the button is; the badge's own text is left empty inside
 * it. Changes are silent unless `live` is set (ADR 0004): then the settled
 * name is announced politely half a second after the count stops changing,
 * once, rather than once per arrival.
 *
 * With `asChild` your element is the trigger and keeps its own name; the
 * badge's text follows it ("Inbox, 3 unread"). It should be round for the badge to
 * sit on its edge, and only the built-in bell swings.
 */

/** A spring that rings on for a few swings: period ≈ 0.33s, most energy gone in ~1s. */
const SPRING = { type: "spring", stiffness: 180, damping: 3, mass: 0.5 } as const;
/** Angular velocity added by one arrival, in degrees per second (≈ 16° of swing). */
const KICK = 300;
/** The most the swing can build to (≈ 40°). */
const MAX_SPIN = 760;

const SIZE = "--notification-bell-size";

/**
 * The bell's angular velocity after a notification lands: a push along the
 * swing already under way, so pushes in quick succession add up. At rest, or
 * at the top of a swing, it pushes back toward upright.
 */
export function swingImpulse(velocity: number, angle: number): number {
  const direction = Math.abs(velocity) > 1 ? Math.sign(velocity) : angle > 0 ? -1 : 1;
  return Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velocity + direction * KICK));
}

/** Fractional, negative and non-finite counts all show as zero or their floor. */
function normalise(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** "Notifications, 3 unread". */
export function notificationBellLabel(count: number, max = 99): string {
  if (count <= 0) return "Notifications";
  if (count > max) return `Notifications, more than ${String(max)} unread`;
  return `Notifications, ${String(count)} unread`;
}

/**
 * The badge's own text, for a consumer's element that keeps its name. It is
 * read straight after that name, so it brings its own separator: "Inbox, 3
 * unread" rather than "Inbox3 unread".
 */
function unreadText(count: number, max: number): string {
  if (count <= 0) return "";
  return count > max ? `, more than ${String(max)} unread` : `, ${String(count)} unread`;
}

const notificationBellVariants = cva(
  cn(
    "relative inline-grid shrink-0 place-items-center rounded-full select-none",
    "transition-[background-color,color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "motion-safe:active:scale-95",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      appearance: {
        soft: "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        outline: "border border-border bg-background text-foreground hover:bg-accent",
      },
    },
    defaultVariants: { appearance: "soft" },
  },
);

/** Badge geometry, all fractions of the size: centred on the circle at 45°, growing outward. */
const placement = {
  count: cn(
    "start-[calc(var(--notification-bell-size)*0.634)] top-[calc(var(--notification-bell-size)*-0.074)]",
    "h-[calc(var(--notification-bell-size)*0.44)] min-w-[calc(var(--notification-bell-size)*0.44)]",
    "px-[calc(var(--notification-bell-size)*0.09)] text-[length:calc(var(--notification-bell-size)*0.26)]",
  ),
  dot: cn(
    "start-[calc(var(--notification-bell-size)*0.734)] top-[calc(var(--notification-bell-size)*0.026)]",
    "size-[calc(var(--notification-bell-size)*0.24)]",
  ),
};

/** A ring in the page colour, so the badge reads as sitting on top of the circle. */
const cutout = "ring-[length:calc(var(--notification-bell-size)*0.05)] ring-background";

/** Leaving is quicker than arriving. */
const leaving = "scale-0 opacity-0 duration-[var(--duration-fast)] ease-[var(--ease-in-quint)]";

/**
 * A badge already there on first paint is simply there: the pop is for a
 * count that arrives, not for the page loading.
 */
const settled = "starting:scale-100 starting:opacity-100";

function BellGlyph({ clapper }: { clapper: MotionValue<number> }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full">
      <motion.path style={{ x: clapper }} d="M9.6 18.9a2.4 2.4 0 0 0 4.8 0Z" />
      <path d="M12 2.6c-3.5 0-5.8 2.75-5.8 6.2v3.3c0 .52-.15 1.03-.44 1.46l-1.32 1.98c-.62.93.05 2.16 1.17 2.16h12.78c1.12 0 1.79-1.23 1.17-2.16l-1.32-1.98a2.63 2.63 0 0 1-.44-1.46V8.8c0-3.45-2.3-6.2-5.8-6.2Z" />
    </svg>
  );
}

export interface NotificationBellProps
  extends ComponentPropsWithRef<"button">, VariantProps<typeof notificationBellVariants> {
  /** Unread total. Hidden at 0; fractional or negative values are floored to it. */
  count?: number;
  /** Highest number shown; above it the badge reads "99+". */
  max?: number;
  /** The badge's shape. A dot appears and leaves on the same counts as the number. */
  variant?: "count" | "dot";
  /** Diameter in pixels. The bell, the badge and its digits are all fractions of it. */
  size?: number;
  /** Badge colour, from the semantic palette. */
  tone?: NotificationBadgeProps["tone"];
  /**
   * The built-in bell's accessible name. Default: "Notifications, 3 unread".
   * With `asChild`, the badge's text, read after your element's own name
   * instead (default ", 3 unread").
   */
  label?: string | ((count: number) => string);
  /** Announce the settled count politely when it changes. Off by default. */
  live?: boolean;
  /** Put the badge on your own element (an avatar, a nav item) instead of the bell. */
  asChild?: boolean;
}

/** A round bell button with an unread badge that swings when notifications arrive. */
export function NotificationBell({
  className,
  style,
  count = 0,
  max = 99,
  variant = "count",
  size = 40,
  tone = "destructive",
  label,
  live = false,
  asChild = false,
  appearance,
  children,
  ...props
}: NotificationBellProps) {
  const unread = normalise(count);
  const empty = unread === 0;
  const name =
    typeof label === "function"
      ? label(unread)
      : (label ?? (asChild ? unreadText(unread, max) : notificationBellLabel(unread, max)));

  const angle = useMotionValue(0);
  // The clapper hangs free, so it lags the swing a little and shows as a
  // small counter-movement.
  const clapper = useTransform(angle, (value) => value * -0.045);

  // Push the bell when the count rises. The ref holds the count the last push
  // was measured against, so a re-run with the same count (Strict Mode) is a
  // no-op, and a fall resets the baseline without swinging.
  const previous = useRef(unread);
  useEffect(() => {
    const before = previous.current;
    previous.current = unread;
    if (asChild || unread <= before || prefersReducedMotion()) return;
    animate(angle, 0, { ...SPRING, velocity: swingImpulse(angle.getVelocity(), angle.get()) });
  }, [unread, asChild, angle]);

  useEffect(
    () => () => {
      angle.stop();
    },
    [angle],
  );

  // Announced once the count has settled, not once per arrival.
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef(unread);
  useEffect(() => {
    if (!live || announced.current === unread) return;
    const timer = setTimeout(() => {
      announced.current = unread;
      setAnnouncement(name);
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [live, unread, name]);

  const rootStyle = {
    [SIZE]: `${String(size)}px`,
    width: size,
    height: size,
    ...style,
  } as CSSProperties;

  const badge = (
    <NotificationBadge
      variant={variant}
      count={unread}
      max={max}
      tone={tone}
      position="top-start"
      label={asChild ? name : ""}
      className="pointer-events-none absolute inset-0"
      badgeClassName={cn(placement[variant], cutout, settled, empty && leaving)}
    />
  );

  const status = live ? (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </span>
  ) : null;

  if (asChild) {
    return (
      <>
        <Slot.Root
          data-slot="notification-bell"
          data-state={empty ? "read" : "unread"}
          className={cn("relative", className)}
          style={rootStyle}
          {...props}
        >
          <Slot.Slottable>{children}</Slot.Slottable>
          {badge}
        </Slot.Root>
        {status}
      </>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <button
        type="button"
        data-slot="notification-bell"
        data-state={empty ? "read" : "unread"}
        aria-label={name}
        className={cn(notificationBellVariants({ appearance }), className)}
        style={rootStyle}
        {...props}
      >
        <motion.span
          data-slot="notification-bell-icon"
          aria-hidden="true"
          className="grid size-1/2 place-items-center"
          style={{ rotate: angle, originX: 0.5, originY: 0.1 }}
        >
          <BellGlyph clapper={clapper} />
        </motion.span>
        {badge}
      </button>
      {status}
    </MotionConfig>
  );
}

export { notificationBellVariants };
