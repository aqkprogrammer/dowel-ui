"use client";

// Ported from SmoothUI Photo Stack (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { MotionConfig, motion, type PanInfo } from "motion/react";
import { Direction } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/button";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A deck of photos. Flick the top one away and it springs to the back.
 *
 * This is one of the places `motion` earns its keep (ADR 0014): the card
 * leaves on a spring that carries the velocity of the flick, which a CSS
 * transition cannot know. Everything else is a pointer-free path to the same
 * result — tap the top photo, press Enter or Space on it, use the arrow keys,
 * or the optional previous/next buttons — so the drag is a convenience, never
 * the only way through. Under reduced motion the drag is off and cards move
 * without animating.
 */

export interface PhotoStackPhoto {
  id: string;
  src: string;
  /** Describes the photo. Also names the slide when there is no `name`. */
  alt: string;
  /** Caption title over the top photo. */
  name?: string;
  /** Caption line under the name. */
  subtitle?: string;
}

/** Resting offset and scale for each position in the pile (0 = top). */
const POSITIONS = [
  { x: 0, y: 0, scale: 1 },
  { x: 16, y: 12, scale: 0.95 },
  { x: 32, y: 24, scale: 0.9 },
] as const;

/** A flick further or faster than this sends the card to the back. */
const DISTANCE = 80;
const VELOCITY = 500;

export function flickedAway(info: Pick<PanInfo, "offset" | "velocity">) {
  return Math.abs(info.offset.x) > DISTANCE || Math.abs(info.velocity.x) > VELOCITY;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Live, unlike a one-off read: turning the setting on mid-session stops the drag. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function isRtl(element: Element) {
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

export interface PhotoStackProps extends ComponentPropsWithRef<"div"> {
  /** The photos. The first starts on top. */
  photos: PhotoStackPhoto[];
  /** The photo on top (controlled). */
  index?: number;
  /** The photo on top at first (uncontrolled). */
  defaultIndex?: number;
  /** Called when another photo comes to the top. */
  onIndexChange?: (index: number) => void;
  /** Shows previous and next buttons under the stack. */
  controls?: boolean;
}

/** A draggable pile of photos you flick, tap or key through. */
export function PhotoStack({
  className,
  photos,
  index,
  defaultIndex = 0,
  onIndexChange,
  controls = false,
  ...props
}: PhotoStackProps) {
  const count = photos.length;
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const current = count === 0 ? 0 : (((index ?? uncontrolled) % count) + count) % count;
  const [announcement, setAnnouncement] = useState("");
  const reduceMotion = usePrefersReducedMotion();
  const flip = Direction.useDirection() === "rtl" ? -1 : 1;
  const hintId = `dowel-photo-stack-${useId().replace(/:/g, "")}`;
  // A released drag is followed by a click. Without this the card would cycle
  // twice and land second from the top instead of at the back.
  const dragged = useRef(false);
  // The button that cycles lives on the top photo, so it is a new element
  // after every cycle. Focus follows it rather than falling to the page.
  const pile = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    pile.current?.querySelector<HTMLElement>('[data-slot="photo-stack-next"]')?.focus();
  }, [current]);

  function go(step: 1 | -1) {
    if (count < 2) return;
    const next = (current + step + count) % count;
    if (index === undefined) setUncontrolled(next);
    onIndexChange?.(next);
    const photo = photos[next];
    if (photo) {
      setAnnouncement(`${photo.name ?? photo.alt}, ${String(next + 1)} of ${String(count)}`);
    }
  }

  /** Arrow keys on any of the stack's buttons move through the photos. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const rtl = flip === -1 || isRtl(event.currentTarget);
    const steps: Record<string, 1 | -1> = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    go(step);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={props["aria-labelledby"] ? undefined : "Photos"}
        data-slot="photo-stack"
        className={cn("flex w-56 flex-col items-center gap-4", className)}
        {...props}
      >
        <div
          ref={pile}
          data-slot="photo-stack-pile"
          className="relative aspect-7/9 w-full select-none"
        >
          {photos.map((photo, i) => {
            const position = (i - current + count) % count;
            const rest = POSITIONS[Math.min(position, POSITIONS.length - 1)] ?? POSITIONS[0];
            const top = position === 0;
            const label = `${photo.name ?? photo.alt}, ${String(i + 1)} of ${String(count)}`;

            return (
              <motion.div
                key={photo.id}
                role="group"
                aria-roledescription="slide"
                aria-label={label}
                aria-hidden={top ? undefined : true}
                inert={!top}
                data-slot="photo-stack-photo"
                data-position={position}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg",
                  top && !reduceMotion && "cursor-grab active:cursor-grabbing",
                )}
                style={{ zIndex: count - position }}
                initial={false}
                animate={{ x: rest.x * flip, y: rest.y, scale: rest.scale, rotate: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                drag={top && !reduceMotion ? "x" : false}
                dragSnapToOrigin
                onDragStart={() => {
                  dragged.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (flickedAway(info)) go(1);
                  // The trailing click, if any, arrives before this runs.
                  setTimeout(() => {
                    dragged.current = false;
                  }, 0);
                }}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  draggable={false}
                  className="size-full object-cover object-top"
                />
                {photo.name || photo.subtitle ? (
                  <div
                    data-slot="photo-stack-caption"
                    className={cn(
                      "absolute inset-x-0 bottom-0 flex flex-col gap-px p-3.5 text-white",
                      "bg-linear-to-t from-overlay to-transparent",
                      "transition-opacity duration-[var(--duration-normal)]",
                      !top && "opacity-0",
                    )}
                  >
                    {photo.name ? (
                      <span className="text-sm font-semibold">{photo.name}</span>
                    ) : null}
                    {photo.subtitle ? (
                      <span className="text-xs opacity-85">{photo.subtitle}</span>
                    ) : null}
                  </div>
                ) : null}
                {top ? (
                  <button
                    type="button"
                    aria-label="Show next photo"
                    aria-describedby={hintId}
                    data-slot="photo-stack-next"
                    className={cn(
                      "absolute inset-0 rounded-[inherit] bg-transparent",
                      focusRing,
                    )}
                    onKeyDown={handleKeyDown}
                    onClick={() => {
                      if (dragged.current) {
                        dragged.current = false;
                        return;
                      }
                      refocus.current = true;
                      go(1);
                    }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-card"
                    style={{ opacity: position === 1 ? 0.2 : 0.36 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {controls ? (
          <div data-slot="photo-stack-controls" className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              onKeyDown={handleKeyDown}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={mirrorForDirection}
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next photo"
              onClick={() => go(1)}
              onKeyDown={handleKeyDown}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={mirrorForDirection}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
        ) : null}

        <span id={hintId} className="sr-only">
          Sends the top photo to the back. Arrow keys move through the photos.
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </MotionConfig>
  );
}
