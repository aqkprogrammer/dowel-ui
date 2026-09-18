"use client";

// Ported from SmoothUI Apple Invites (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, KeyboardEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  CarouselButton,
  RotationButton,
  chain,
  handleCarouselKey,
  useAutoRotate,
  useCarouselIndex,
  wrapIndex,
} from "./carousel-controls";

/*
 * Three invitation cards fanned out: the current one upright in front, its
 * neighbours tilted behind it on either side, the rest faded out in the middle.
 *
 * The source mounts only the three visible cards and animates them with motion
 * springs and AnimatePresence, using popmotion's `wrap` for the index. Every
 * card is mounted here instead, and each moves between four resting places by
 * a CSS transition, so there is no animation library, no enter/exit bookkeeping
 * and reduced motion makes each move instant.
 *
 * The sideways offset and tilt are CSS variables that flip sign under
 * `dir="rtl"`, so "next" always sits toward the inline end. The source scaled
 * its type with a JavaScript breakpoint table; the card is a size container
 * here, so its type scales with its width in CSS.
 */

type Place = "current" | "next" | "previous" | "hidden";

const PLACES: Record<Place, CSSProperties & Record<`--${string}`, string>> = {
  current: {
    "--invite-x": "0%",
    "--invite-r": "0deg",
    "--invite-s": "1",
    opacity: 1,
    zIndex: 3,
  },
  next: {
    "--invite-x": "80%",
    "--invite-r": "12deg",
    "--invite-s": "0.9",
    opacity: 0.8,
    zIndex: 2,
  },
  previous: {
    "--invite-x": "-80%",
    "--invite-r": "-12deg",
    "--invite-s": "0.9",
    opacity: 0.8,
    zIndex: 2,
  },
  hidden: {
    "--invite-x": "0%",
    "--invite-r": "0deg",
    "--invite-s": "0.8",
    opacity: 0,
    zIndex: 1,
  },
};

/** A card. Its position comes from the variables in PLACES. */
const inviteCarouselVariants = cva(
  cn(
    "@container col-start-1 row-start-1 overflow-hidden rounded-3xl bg-primary text-foreground shadow-xl",
    "translate-x-(--invite-x) scale-(--invite-s) rotate-(--invite-r)",
    "rtl:translate-x-[calc(var(--invite-x)*-1)] rtl:rotate-[calc(var(--invite-r)*-1)]",
    "transition-[translate,rotate,scale,opacity] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
  ),
);

export interface InviteParticipant {
  avatar: string;
  /** Used as the avatar's alternative text. */
  name: string;
}

export interface InviteCarouselEvent {
  id: string | number;
  title?: ReactNode;
  subtitle?: ReactNode;
  location?: ReactNode;
  /** A short status, e.g. "Hosting" or "Going", shown in a pill at the top. */
  badge?: ReactNode;
  /** An icon before the badge text. Decorative. */
  badgeIcon?: ReactNode;
  /** Background image URL. */
  image?: string;
  /** Alternative text for `image`. Omitted, the image is treated as decorative. */
  imageAlt?: string;
  /** A background node instead of an image, e.g. a gradient. */
  background?: ReactNode;
  participants?: InviteParticipant[];
}

export interface InviteCarouselLabels {
  previous: string;
  next: string;
  stop: string;
  start: string;
  slide: (index: number, count: number) => string;
}

const DEFAULT_LABELS: InviteCarouselLabels = {
  previous: "Previous invitation",
  next: "Next invitation",
  stop: "Stop automatic slide show",
  start: "Start automatic slide show",
  slide: (index, count) => `${String(index + 1)} of ${String(count)}`,
};

export interface InviteCarouselProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  events: InviteCarouselEvent[];
  /** Controlled current card. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Advances on a timer (the source always did), with a stop/start control. */
  autoPlay?: boolean;
  /** Milliseconds per card while playing. */
  interval?: number;
  /** Any CSS length, including `clamp()` for a responsive width. */
  cardWidth?: string;
  /** Height as a multiple of width. */
  aspectRatio?: number;
  cardClassName?: string;
  showNavigation?: boolean;
  labels?: Partial<InviteCarouselLabels>;
}

function placeOf(position: number, index: number, count: number): Place {
  let offset = wrapIndex(position - index, count);
  if (offset > count / 2) offset -= count;
  if (offset === 0) return "current";
  if (offset === 1) return "next";
  if (offset === -1) return "previous";
  return "hidden";
}

/** Event invitations fanned out as tilted cards, advancing on their own or by hand. */
export function InviteCarousel({
  className,
  events,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  autoPlay = true,
  interval = 3000,
  cardWidth = "15rem",
  aspectRatio = 1.5625,
  cardClassName,
  showNavigation = true,
  labels: labelsProp,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: InviteCarouselProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const count = events.length;
  const carousel = useCarouselIndex({
    count,
    index: indexProp,
    defaultIndex,
    onIndexChange,
    loop: true,
  });
  const { index, goTo } = carousel;
  const rotation = useAutoRotate({
    autoPlay,
    interval,
    count,
    resetKey: index,
    advance: carousel.next,
  });

  if (count === 0) return null;

  const hasControls = showNavigation || autoPlay;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    handleCarouselKey(event, {
      next: carousel.next,
      previous: carousel.previous,
      first: () => {
        goTo(0);
      },
      last: () => {
        goTo(count - 1);
      },
    });
  }

  return (
    <section
      data-slot="invite-carousel"
      aria-roledescription="carousel"
      aria-label={props["aria-labelledby"] ? undefined : "Invitations"}
      className={cn(
        "relative flex w-full flex-col items-center gap-6 overflow-x-clip py-6",
        className,
      )}
      onPointerEnter={chain(rotation.rootProps.onPointerEnter, onPointerEnter)}
      onPointerLeave={chain(rotation.rootProps.onPointerLeave, onPointerLeave)}
      onFocus={chain(rotation.rootProps.onFocus, onFocus)}
      onBlur={chain(rotation.rootProps.onBlur, onBlur)}
      {...props}
    >
      <div
        data-slot="invite-carousel-viewport"
        aria-live={rotation.rotating ? "off" : "polite"}
        className="grid place-items-center"
      >
        {events.map((event, position) => {
          const place = placeOf(position, index, count);
          const current = place === "current";
          return (
            <div
              key={event.id}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.slide(position, count)}
              aria-hidden={current ? undefined : true}
              inert={current ? undefined : true}
              data-slot="invite-carousel-card"
              data-place={place}
              className={cn(inviteCarouselVariants(), cardClassName)}
              style={{
                ...PLACES[place],
                width: cardWidth,
                aspectRatio: `1 / ${String(aspectRatio)}`,
              }}
            >
              <InviteCard event={event} />
            </div>
          );
        })}
      </div>

      {hasControls ? (
        <div
          data-slot="invite-carousel-controls"
          className="relative z-10 flex items-center gap-2"
        >
          {autoPlay ? (
            <RotationButton
              enabled={rotation.enabled}
              onToggle={rotation.toggle}
              onKeyDown={handleKeyDown}
              stopLabel={labels.stop}
              startLabel={labels.start}
            />
          ) : null}
          {showNavigation ? (
            <>
              <CarouselButton
                direction="previous"
                aria-label={labels.previous}
                onClick={carousel.previous}
                onKeyDown={handleKeyDown}
              />
              <CarouselButton
                direction="next"
                aria-label={labels.next}
                onClick={carousel.next}
                onKeyDown={handleKeyDown}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** The face of one card. Sizes are in container units, floored for legibility. */
function InviteCard({ event }: { event: InviteCarouselEvent }) {
  return (
    <div className="relative size-full">
      <div data-slot="invite-carousel-background" className="absolute inset-0">
        {event.background ??
          (event.image ? (
            <img
              src={event.image}
              alt={event.imageAlt ?? ""}
              draggable={false}
              className="size-full object-cover"
            />
          ) : null)}
      </div>

      {event.badge != null ? (
        <span
          data-slot="invite-carousel-badge"
          className={cn(
            "absolute start-[max(0.5rem,6.5cqi)] top-[max(0.5rem,6.5cqi)] z-10 flex items-center gap-[max(0.25rem,3cqi)]",
            "rounded-full bg-background/60 px-[max(0.5rem,5cqi)] py-[max(0.0625rem,1cqi)] font-medium backdrop-blur-xl",
            "text-[length:max(0.625rem,5cqi)] [&_svg]:size-[max(0.75rem,6cqi)] [&_svg]:shrink-0",
          )}
        >
          {event.badgeIcon != null ? <span aria-hidden="true">{event.badgeIcon}</span> : null}
          {event.badge}
        </span>
      ) : null}

      {/* A scrim that blurs and tints the lower half, so text reads on any image. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-background/90 via-background/50 to-transparent [mask-image:linear-gradient(to_top,var(--color-foreground)_40%,transparent)] backdrop-blur-sm"
      />

      <div
        data-slot="invite-carousel-content"
        className="absolute inset-x-0 bottom-0 z-10 p-[max(0.75rem,10cqi)] text-center leading-[1.4]"
      >
        {event.participants && event.participants.length > 0 ? (
          <div className="mb-[max(0.25rem,3cqi)] flex items-center justify-center gap-[max(0.25rem,3cqi)]">
            {event.participants.map((participant, position) => (
              <img
                key={`${participant.avatar}-${String(position)}`}
                src={participant.avatar}
                alt={participant.name}
                draggable={false}
                className="size-[max(1.25rem,10cqi)] rounded-full object-cover"
              />
            ))}
          </div>
        ) : null}
        {event.title != null ? (
          <p className="mb-[max(0.125rem,1.5cqi)] text-[length:max(0.875rem,7.5cqi)] font-bold break-words">
            {event.title}
          </p>
        ) : null}
        {event.subtitle != null ? (
          <p className="text-[length:max(0.625rem,5cqi)] break-words opacity-90">
            {event.subtitle}
          </p>
        ) : null}
        {event.location != null ? (
          <p className="text-[length:max(0.625rem,5cqi)] break-words opacity-90">
            {event.location}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export { inviteCarouselVariants };
