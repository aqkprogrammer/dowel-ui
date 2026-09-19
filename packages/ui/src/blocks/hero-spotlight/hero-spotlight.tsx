"use client";

// Ported from SmoothUI Hero 5 (header-5) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A dark hero lit by a spotlight beam, with a scatter of twinkling dust.
 *
 * - It is dark in every theme, as the source was, by scoping the theme's own
 *   `.dark` tokens to the block rather than by hard-coding a palette. Every
 *   colour is still a token, so a preset restyles it.
 * - The beam opens and the copy rises when the block first scrolls into view,
 *   once — the source's whileInView. Without IntersectionObserver (and on the
 *   server) both render at rest. A spring with no gesture behind it is a
 *   keyframe on the motion scale.
 * - The source's dust pulsed forever. Decoration never loops forever here:
 *   each mote twinkles three times and rests, and under reduced motion it
 *   simply rests.
 */

const PREFIX = "dowel-hero-spotlight";
const MOTES = 20;
const BEAM_OPACITY = 0.3;

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `@keyframes ${PREFIX}-beam{from{opacity:0;transform:scaleX(0)}}
@keyframes ${PREFIX}-rise{from{opacity:0;transform:translateY(24px)}}
@keyframes ${PREFIX}-twinkle{0%,100%{opacity:.2}50%{opacity:.8}}
[data-slot=hero-spotlight-beam]{opacity:${String(BEAM_OPACITY)}}
[data-slot=hero-spotlight-beam][data-state=idle],[data-slot=hero-spotlight-content][data-state=idle]{opacity:0}
[data-slot=hero-spotlight-beam][data-state=visible]{animation:${PREFIX}-beam ${scaled(800)} cubic-bezier(0.23, 1, 0.32, 1) both}
[data-slot=hero-spotlight-content][data-state=visible]{animation:${PREFIX}-rise ${scaled(400)} var(--ease-out-quint) both}
[data-slot=hero-spotlight-mote]{opacity:.2;animation:${PREFIX}-twinkle calc(var(--period) * var(--motion-scale, 1)) var(--ease-in-out-quint) calc(var(--delay) * var(--motion-scale, 1)) 3 both}`;

export interface HeroSpotlightAction {
  label: string;
  href: string;
}

export interface HeroSpotlightBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** The headline. */
  title?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroSpotlightAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroSpotlightAction | null;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type RevealState = "static" | "idle" | "visible";

const noop = () => () => {};

/** "idle" until the element first scrolls into view, then "visible"; "static" where that cannot be observed. */
function useReveal() {
  const observable = useSyncExternalStore(
    noop,
    () => typeof IntersectionObserver !== "undefined",
    () => false,
  );
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!observable || seen || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [observable, seen]);

  const state: RevealState = observable ? (seen ? "visible" : "idle") : "static";
  return [ref, state] as const;
}

/** A dark hero lit by a spotlight beam, with a scatter of twinkling dust. */
export function HeroSpotlightBlock({
  title = "Build stunning interfaces",
  description = "Beautifully animated, accessible components built with React and Tailwind CSS. Open source and ready for production.",
  primaryAction = { label: "Get started", href: "#" },
  secondaryAction = { label: "Documentation", href: "#" },
  headingLevel = 2,
  className,
  ...props
}: HeroSpotlightBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [ref, state] = useReveal();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-spotlight"
      className={cn("dark", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        ref={ref}
        className="relative isolate flex min-h-[37.5rem] items-center justify-center overflow-hidden bg-background px-4 py-24 text-foreground sm:px-6 md:py-32"
      >
        <div
          aria-hidden="true"
          data-slot="hero-spotlight-beam"
          data-state={state}
          className="pointer-events-none absolute inset-x-0 inset-y-0 -z-10 mx-auto w-[37.5rem] max-w-full bg-[conic-gradient(from_180deg_at_50%_0%,transparent_40%,color-mix(in_oklab,var(--color-primary)_60%,transparent)_50%,transparent_60%)]"
        />

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {Array.from({ length: MOTES }, (_, index) => (
            <span
              key={index}
              data-slot="hero-spotlight-mote"
              className="absolute size-1 rounded-full bg-foreground/60"
              style={
                {
                  insetInlineStart: `${String((index * 37 + 13) % 100)}%`,
                  top: `${String((index * 53 + 7) % 100)}%`,
                  "--period": `${String(2000 + (index % 3) * 1000)}ms`,
                  "--delay": `${String((index % 5) * 500)}ms`,
                } as Vars
              }
            />
          ))}
        </div>

        <div
          data-slot="hero-spotlight-content"
          data-state={state}
          className="mx-auto max-w-4xl text-center"
        >
          <Heading
            id={headingId}
            className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-balance text-transparent md:text-6xl lg:text-7xl"
          >
            {title}
          </Heading>
          {description ? (
            <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {primaryAction ? (
                <Button
                  asChild
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/85 active:bg-foreground/75"
                >
                  <a href={primaryAction.href}>{primaryAction.label}</a>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild size="lg" variant="outline" className="bg-transparent">
                  <a href={secondaryAction.href}>{secondaryAction.label}</a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
