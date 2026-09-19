"use client";

// Ported from SmoothUI CTA 3 (cta-3) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A compact call to action: a card-shaped banner with a headline, one line of
 * copy and a single action, side by side from the md breakpoint.
 *
 * The banner settles from a slight shrink when it first scrolls into view,
 * once — the source's whileInView spring as a hoisted keyframe on the motion
 * scale. Without IntersectionObserver (and on the server) it renders at rest.
 * The surface is a Card with the source's primary-tinted wash across it.
 */

const PREFIX = "dowel-cta-banner";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `@keyframes ${PREFIX}-settle{from{opacity:0;transform:scale(0.97)}}
[data-slot=cta-banner-panel][data-state=idle]{opacity:0}
[data-slot=cta-banner-panel][data-state=visible]{animation:${PREFIX}-settle ${scaled(400)} var(--ease-out-quint) both}`;

export interface CtaBannerAction {
  label: string;
  href: string;
}

export interface CtaBannerBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  /** The headline. */
  title?: string;
  description?: string;
  /** The single action. `null` hides it. */
  action?: CtaBannerAction | null;
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

/** A compact call to action: a banner with a headline, one line of copy and one action. */
export function CtaBannerBlock({
  title = "Start building today",
  description = "Install any component with a single command.",
  action = { label: "Get started", href: "#" },
  headingLevel = 2,
  className,
  ...props
}: CtaBannerBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [ref, state] = useReveal();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="cta-banner"
      className={cn("px-4 py-12 sm:px-6", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <Card
        ref={ref}
        data-slot="cta-banner-panel"
        data-state={state}
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-linear-to-r from-primary/5 via-background to-primary/5 p-6 sm:p-8 md:p-12"
      >
        <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-start">
          <div>
            <Heading id={headingId} className="text-xl font-bold md:text-2xl">
              {title}
            </Heading>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{description}</p>
            ) : null}
          </div>
          {action ? (
            <Button asChild variant="gradient" className="group shrink-0">
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
      </Card>
    </section>
  );
}
