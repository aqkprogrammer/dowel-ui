"use client";

// Ported from SmoothUI Hero 6 (header-6) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import { Button } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A quiet hero: a headline, one line of copy and a single text link.
 *
 * - When it first scrolls into view the block fades in and the headline's
 *   letters draw together from a slight spread — the source's whileInView
 *   tween of letter-spacing, as a hoisted keyframe on the motion scale. Once;
 *   at rest without IntersectionObserver or on the server.
 * - The link is a Button in its link variant, restyled to the foreground as
 *   the source's underlined text link, with an arrow that follows reading
 *   direction.
 */

const PREFIX = "dowel-hero-minimal";
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `@keyframes ${PREFIX}-fade{from{opacity:0}}
@keyframes ${PREFIX}-gather{from{letter-spacing:0.05em}}
[data-slot=hero-minimal-content][data-state=idle]{opacity:0}
[data-slot=hero-minimal-content][data-state=visible]{animation:${PREFIX}-fade ${scaled(400)} ${EASE} both}
[data-slot=hero-minimal-content][data-state=visible] [data-slot=hero-minimal-title]{animation:${PREFIX}-gather ${scaled(600)} ${EASE} both}`;

export interface HeroMinimalAction {
  label: string;
  href: string;
}

export interface HeroMinimalBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  /** The headline. */
  title?: string;
  description?: string;
  /** The single text link. `null` hides it. */
  action?: HeroMinimalAction | null;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

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

/** A quiet hero: a headline, one line of copy and a single text link. */
export function HeroMinimalBlock({
  title = "Less is more",
  description = "Simple, elegant components that speak for themselves.",
  action = { label: "Explore components", href: "#" },
  headingLevel = 2,
  className,
  ...props
}: HeroMinimalBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [ref, state] = useReveal();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-minimal"
      className={cn(
        "flex min-h-[31.25rem] items-center justify-center px-4 py-24 sm:px-6 md:py-32",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        ref={ref}
        data-slot="hero-minimal-content"
        data-state={state}
        className="mx-auto max-w-2xl text-center"
      >
        <Heading
          id={headingId}
          data-slot="hero-minimal-title"
          className="text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl"
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-6 text-lg text-pretty text-muted-foreground">{description}</p>
        ) : null}
        {action ? (
          <Button
            asChild
            variant="link"
            className="group mt-10 gap-1 text-foreground underline hover:text-muted-foreground"
          >
            <a href={action.href}>
              {action.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
                  mirrorForDirection,
                )}
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
