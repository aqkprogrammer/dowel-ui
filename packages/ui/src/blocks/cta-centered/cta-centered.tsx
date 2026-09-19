"use client";

// Ported from SmoothUI CTA 1 (cta-1) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A centred call to action on a muted band with a soft primary glow.
 *
 * The copy rises into place when the band first scrolls into view, once — the
 * source's whileInView spring, which had no gesture behind it, as a hoisted
 * keyframe on the motion scale. Without IntersectionObserver (and on the
 * server) it renders at rest.
 */

const PREFIX = "dowel-cta-centered";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `@keyframes ${PREFIX}-rise{from{opacity:0;transform:translateY(24px)}}
[data-slot=cta-centered-content][data-state=idle]{opacity:0}
[data-slot=cta-centered-content][data-state=visible]{animation:${PREFIX}-rise ${scaled(400)} var(--ease-out-quint) both}`;

export interface CtaCenteredAction {
  label: string;
  href: string;
}

export interface CtaCenteredBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  /** The headline. */
  title?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: CtaCenteredAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: CtaCenteredAction | null;
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

/** A centred call to action on a muted band with a soft primary glow. */
export function CtaCenteredBlock({
  title = "Ready to build something great?",
  description = "Start building with accessible, animated components today. Free, open source and ready for production.",
  primaryAction = { label: "Get started", href: "#" },
  secondaryAction = { label: "Learn more", href: "#" },
  headingLevel = 2,
  className,
  ...props
}: CtaCenteredBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [ref, state] = useReveal();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="cta-centered"
      className={cn(
        "relative isolate overflow-hidden bg-muted/50 px-4 py-24 sm:px-6 md:py-32",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-primary)_8%,transparent),transparent_70%)]"
      />

      <div
        ref={ref}
        data-slot="cta-centered-content"
        data-state={state}
        className="mx-auto max-w-3xl text-center"
      >
        <Heading
          id={headingId}
          className="text-3xl font-bold tracking-tight text-balance md:text-4xl lg:text-5xl"
        >
          {title}
        </Heading>
        {description ? (
          <p className="mx-auto mt-4 max-w-xl text-lg text-balance text-muted-foreground">
            {description}
          </p>
        ) : null}
        {primaryAction || secondaryAction ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {primaryAction ? (
              <Button asChild variant="gradient" size="lg">
                <a href={primaryAction.href}>{primaryAction.label}</a>
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button asChild variant="outline" size="lg">
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
