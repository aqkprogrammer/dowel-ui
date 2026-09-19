"use client";

// Ported from SmoothUI Cursor Follow (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion, useMotionValue, useSpring } from "motion/react";
import {
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A dot that trails the pointer inside a container, and swells into a label
 * over anything carrying `data-cursor-text`.
 *
 * Following the pointer with physics is one of the three things ADR 0014
 * allows `motion` for: the position is a spring chasing the pointer every
 * frame, which a CSS transition restarted on each move cannot do smoothly.
 * The dot's shape change is plain CSS.
 *
 * It is decoration and nothing else: aria-hidden, pointer-events none, never
 * the only place a label appears (put the same words in alt text or a visible
 * caption). It does not exist for touch — there is no pointer to follow — and
 * it does not render at all under reduced motion. The source hid the system
 * cursor; here that is opt-in, because a custom cursor that lags is harder to
 * aim with, and some people rely on a large system cursor.
 */

const cursorFollowVariants = cva(
  cn(
    "flex h-4 max-w-4 min-w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-xs font-medium whitespace-nowrap shadow-lg",
    "transition-[height,max-width,padding,opacity,scale] duration-[var(--duration-normal)] ease-[var(--ease-in-out-quint)]",
    "data-[labelled]:h-10 data-[labelled]:max-w-80 data-[labelled]:scale-110 data-[labelled]:px-4",
    "data-[state=hidden]:scale-75 data-[state=hidden]:opacity-0",
  ),
  {
    variants: {
      /** `solid` is the source's filled dot; `invert` and `blur` treat what is behind it. */
      appearance: {
        solid: "bg-primary text-primary-foreground",
        invert: "border border-border text-foreground backdrop-invert",
        blur: "border border-border bg-background/40 text-foreground backdrop-blur-sm",
      },
    },
    defaultVariants: {
      appearance: "solid",
    },
  },
);

const SPRING = { damping: 40, stiffness: 350 };

const REDUCE = "(prefers-reduced-motion: reduce)";

/** Live reduced-motion preference; false on the server, where nothing moves anyway. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCE);
      query.addEventListener("change", notify);
      return () => {
        query.removeEventListener("change", notify);
      };
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

export interface CursorFollowProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof cursorFollowVariants> {
  /** Hides the system cursor inside the container. Off by default. */
  hideCursor?: boolean;
  /** Classes for the follower. */
  followerClassName?: string;
}

/** A container whose pointer is trailed by a springy dot that can show a label. */
export function CursorFollow({
  className,
  followerClassName,
  appearance,
  hideCursor = false,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerOver,
  ...props
}: CursorFollowProps) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  const tracks = (event: PointerEvent<HTMLDivElement>) =>
    !reduced && event.pointerType !== "touch";

  function place(event: PointerEvent<HTMLDivElement>, jump: boolean) {
    const box = event.currentTarget.getBoundingClientRect();
    const nextX = event.clientX - box.left;
    const nextY = event.clientY - box.top;
    x.set(nextX);
    y.set(nextY);
    // Arriving, the dot appears under the pointer instead of flying in from
    // wherever it last was.
    if (jump) {
      springX.jump(nextX);
      springY.jump(nextY);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="cursor-follow"
        className={cn(
          "relative isolate",
          hideCursor && !reduced && "cursor-none [&_*]:cursor-none",
          className,
        )}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (!tracks(event)) return;
          place(event, true);
          setVisible(true);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (!tracks(event)) return;
          place(event, !visible);
          if (!visible) setVisible(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setVisible(false);
          setLabel(null);
        }}
        onPointerOver={(event) => {
          onPointerOver?.(event);
          const target = (event.target as Element).closest("[data-cursor-text]");
          setLabel(target?.getAttribute("data-cursor-text") || null);
        }}
        {...props}
      >
        {children}
        {reduced ? null : (
          <div
            aria-hidden="true"
            data-slot="cursor-follow-layer"
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          >
            <motion.div
              className="absolute"
              style={{ left: 0, top: 0, x: springX, y: springY }}
            >
              <div
                data-slot="cursor-follow-follower"
                data-state={visible ? "visible" : "hidden"}
                data-labelled={label ? "" : undefined}
                className={cn(cursorFollowVariants({ appearance }), followerClassName)}
              >
                {label ? (
                  <span className="animate-[dowel-cursor-follow-in_var(--duration-normal)_var(--ease-out-quint)]">
                    {label}
                  </span>
                ) : null}
              </div>
            </motion.div>
            <style href="dowel-cursor-follow" precedence="dowel">
              {"@keyframes dowel-cursor-follow-in{from{opacity:0;filter:blur(8px)}}"}
            </style>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

export { cursorFollowVariants };
