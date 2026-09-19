"use client";

// Ported from SmoothUI Testimonials 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * One large quotation at a time, rotating on a timer, with a row of
 * indicators whose active one fills as the clock runs down.
 *
 * The source advances every five seconds with no way to stop it. Moving
 * content that starts by itself needs a pause (WCAG 2.2.2), so this follows
 * the APG carousel's rotation rules — the same ones Dowel's carousels share:
 * a stop/start button, a pause while the pointer is over the block or focus
 * is inside it, the live region silent while rotating, and no automatic start
 * under reduced motion. The indicators are buttons, with arrow keys between
 * them. The quote rises in and the author blurs in on each change, as hoisted
 * keyframes on the reduced-motion scale. The fill runs on the real interval,
 * because it shows time: it restarts with the timer and, whenever rotation is
 * paused or stopped, the active indicator simply shows full.
 */

const PREFIX = "dowel-testimonial-rotator";

const STYLES = `
@keyframes ${PREFIX}-quote{from{opacity:0;translate:0 1.875rem}}
@keyframes ${PREFIX}-author{from{opacity:0;filter:blur(8px)}}
@keyframes ${PREFIX}-fill{from{inline-size:0}}
[data-slot=testimonial-rotator-quote]{animation:${PREFIX}-quote var(--duration-slower) var(--ease-out-quint) both}
[data-slot=testimonial-rotator-author]{animation:${PREFIX}-author var(--duration-slower) var(--ease-out-quint) both}
[data-slot=testimonial-rotator-fill][data-state=running]{animation:${PREFIX}-fill var(--${PREFIX}-interval) linear both}
`;

export interface RotatorTestimonial {
  /** Stable identity. Defaults to the name. */
  id?: string;
  quote: ReactNode;
  name: string;
  /** A line under the name: a role or affiliation. */
  subtitle?: ReactNode;
  /** Image URL for the avatar. Initials are shown without one, or while it loads. */
  avatarSrc?: string;
}

export const DEFAULT_ROTATOR_TESTIMONIALS: RotatorTestimonial[] = [
  {
    name: "Sarah Johnson",
    subtitle: "Frontend developer",
    quote: "It changed how I build interfaces — calm motion, careful design, excellent docs.",
  },
  {
    name: "Michael Chen",
    subtitle: "Product designer",
    quote: "Transitions feel natural, and the API is exactly what I expected it to be.",
  },
  {
    name: "Emily Rodriguez",
    subtitle: "Full-stack developer",
    quote: "Polished, animated interfaces without hours of implementation detail.",
  },
  {
    name: "David Kim",
    subtitle: "Product engineer",
    quote: "Fast to load, accessible by default, and it looks good. That balance is rare.",
  },
];

export interface TestimonialRotatorLabels {
  stop: string;
  start: string;
  /** Names each indicator button. */
  indicator: (index: number, count: number) => string;
  /** Names each testimonial as a slide. */
  slide: (index: number, count: number) => string;
}

const DEFAULT_LABELS: TestimonialRotatorLabels = {
  stop: "Stop rotating testimonials",
  start: "Start rotating testimonials",
  indicator: (index, count) => `Show testimonial ${String(index + 1)} of ${String(count)}`,
  slide: (index, count) => `${String(index + 1)} of ${String(count)}`,
};

export interface TestimonialRotatorBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** Names the section. Visually hidden unless `showHeading`, as the source has none. */
  heading?: ReactNode;
  showHeading?: boolean;
  testimonials?: RotatorTestimonial[];
  /** Controlled index of the testimonial shown. */
  index?: number;
  /** Initial testimonial when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Rotates on a timer, with a stop/start control. Never starts by itself under reduced motion. */
  autoPlay?: boolean;
  /** Milliseconds per testimonial while rotating. */
  interval?: number;
  /** Visible and accessible text, for localisation. */
  labels?: Partial<TestimonialRotatorLabels>;
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join("");
}

/** One large quotation at a time, rotating on a timer that can be stopped. */
export function TestimonialRotatorBlock({
  heading = "Testimonials",
  showHeading = false,
  testimonials = DEFAULT_ROTATOR_TESTIMONIALS,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  autoPlay = true,
  interval = 5000,
  labels: labelsProp,
  headingLevel = 2,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: TestimonialRotatorBlockProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const headingId = useId();
  const count = testimonials.length;
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const index = count === 0 ? 0 : Math.min(Math.max(indexProp ?? uncontrolled, 0), count - 1);
  const Heading = `h${String(headingLevel)}` as "h2";

  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  const [playing, setPlaying] = useState(autoPlay);
  // Under reduced motion rotation only runs once the reader has asked for it.
  const [chosen, setChosen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const enabled = autoPlay && playing && (chosen || !reduced);
  const rotating = enabled && !hovered && !focused && count > 1;

  const indicators = useRef<(HTMLButtonElement | null)[]>([]);

  function goTo(target: number) {
    const next = ((target % count) + count) % count;
    if (next === index) return;
    if (indexProp === undefined) setUncontrolled(next);
    onIndexChange?.(next);
  }

  // The latest goTo, for the timer, without restarting it on every render.
  const advance = useRef(() => {});
  useEffect(() => {
    advance.current = () => {
      goTo(index + 1);
    };
  });

  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => {
      advance.current();
    }, interval);
    return () => {
      clearTimeout(timer);
    };
  }, [rotating, interval, index]);

  function handleIndicatorKey(event: KeyboardEvent<HTMLButtonElement>) {
    const rtl = event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    const target = {
      ArrowRight: index + (rtl ? -1 : 1),
      ArrowLeft: index + (rtl ? 1 : -1),
      Home: 0,
      End: count - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = ((target % count) + count) % count;
    goTo(next);
    indicators.current[next]?.focus();
  }

  if (count === 0) return null;
  const current = testimonials[index] as RotatorTestimonial;

  return (
    <section
      aria-labelledby={headingId}
      aria-roledescription="carousel"
      data-slot="testimonial-rotator"
      className={cn("relative flex w-full flex-col items-center py-16", className)}
      style={{ [`--${PREFIX}-interval`]: `${String(interval)}ms`, ...style } as CSSProperties}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(false);
      }}
      onFocus={(event: FocusEvent<HTMLElement>) => {
        onFocus?.(event);
        // Focus on the rotation control does not pause: that is where a
        // keyboard user sits to start rotation and watch it run.
        const target = event.target as Element;
        setFocused(target.closest("[data-slot=testimonial-rotator-rotation]") === null);
      }}
      onBlur={(event: FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Heading
        id={headingId}
        className={cn(
          showHeading ? "mb-8 text-sm font-medium text-muted-foreground uppercase" : "sr-only",
        )}
      >
        {heading}
      </Heading>

      <div className="flex w-full max-w-5xl flex-col items-center px-4">
        <div
          data-slot="testimonial-rotator-viewport"
          aria-live={rotating ? "off" : "polite"}
          className="w-full"
        >
          <div
            key={current.id ?? current.name}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide(index, count)}
          >
            <figure>
              <blockquote
                data-slot="testimonial-rotator-quote"
                className="mb-8 min-h-28 text-center text-2xl leading-tight font-semibold text-balance text-foreground md:text-4xl"
              >
                <p>
                  <span aria-hidden="true">“</span>
                  {current.quote}
                  <span aria-hidden="true">”</span>
                </p>
              </blockquote>
              <figcaption
                data-slot="testimonial-rotator-author"
                className="flex items-center justify-center gap-4 pt-8"
              >
                <Avatar size="lg" aria-hidden="true" className="border border-border">
                  {current.avatarSrc ? <AvatarImage src={current.avatarSrc} alt="" /> : null}
                  <AvatarFallback>{initials(current.name)}</AvatarFallback>
                </Avatar>
                <span aria-hidden="true" className="mx-4 h-8 w-px bg-muted-foreground/30" />
                <span className="flex flex-col text-start">
                  <span className="text-lg font-medium text-foreground italic">
                    {current.name}
                  </span>
                  {current.subtitle ? (
                    <span className="text-base text-muted-foreground">{current.subtitle}</span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        {count > 1 ? (
          <div
            data-slot="testimonial-rotator-controls"
            className="mt-8 flex items-center justify-center gap-3"
          >
            {autoPlay ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                data-slot="testimonial-rotator-rotation"
                aria-label={enabled ? labels.stop : labels.start}
                className="size-8 rounded-full"
                onClick={() => {
                  setChosen(true);
                  setPlaying(!enabled);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="size-3.5"
                >
                  {enabled ? (
                    <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
                  ) : (
                    <path d="M8 5.5v13a.5.5 0 0 0 .76.43l10.4-6.5a.5.5 0 0 0 0-.86L8.76 5.07A.5.5 0 0 0 8 5.5z" />
                  )}
                </svg>
              </Button>
            ) : null}
            <div className="flex items-center gap-1">
              {testimonials.map((testimonial, position) => {
                const active = position === index;
                return (
                  <button
                    key={testimonial.id ?? testimonial.name}
                    ref={(element) => {
                      indicators.current[position] = element;
                    }}
                    type="button"
                    aria-label={labels.indicator(position, count)}
                    aria-current={active ? "true" : undefined}
                    tabIndex={active ? 0 : -1}
                    onClick={() => {
                      goTo(position);
                    }}
                    onKeyDown={handleIndicatorKey}
                    className={cn("flex h-6 items-center rounded-full px-1", focusRing)}
                  >
                    <span
                      data-active={active || undefined}
                      className={cn(
                        "relative block h-3 w-3 overflow-hidden rounded-full bg-foreground/10",
                        "transition-[width,border-radius] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                        "data-[active]:w-12 data-[active]:rounded-lg",
                      )}
                    >
                      {active ? (
                        <span
                          // Remounted whenever the timer restarts, so the two agree.
                          key={`${String(index)}-${String(rotating)}`}
                          data-slot="testimonial-rotator-fill"
                          data-state={rotating ? "running" : "idle"}
                          className="absolute inset-y-0 start-0 w-full rounded-lg bg-primary"
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
