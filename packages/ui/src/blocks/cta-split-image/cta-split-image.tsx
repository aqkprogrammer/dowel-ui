"use client";

// Ported from SmoothUI CTA 2 (cta-2) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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
 * A two-column call to action: headline, copy and actions beside an image.
 *
 * When the block first scrolls into view the copy slides in from the inline
 * start and the image from the inline end, once — the source's whileInView
 * springs as hoisted keyframes on the motion scale. The source slid from the
 * left and right; here the travel follows reading direction, so in
 * right-to-left text each half still arrives from its own side. Without
 * IntersectionObserver (and on the server) both render at rest.
 */

const PREFIX = "dowel-cta-split-image";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const COPY = "[data-slot=cta-split-image-copy]";
const MEDIA = "[data-slot=cta-split-image-media]";

const STYLES = `@keyframes ${PREFIX}-slide{from{opacity:0;transform:translateX(var(--${PREFIX}-from))}}
${COPY}{--${PREFIX}-from:-24px}
${MEDIA}{--${PREFIX}-from:24px}
${COPY}:dir(rtl){--${PREFIX}-from:24px}
${MEDIA}:dir(rtl){--${PREFIX}-from:-24px}
${COPY}[data-state=idle],${MEDIA}[data-state=idle]{opacity:0}
${COPY}[data-state=visible],${MEDIA}[data-state=visible]{animation:${PREFIX}-slide ${scaled(400)} var(--ease-out-quint) both}`;

export interface CtaSplitImageAction {
  label: string;
  href: string;
}

export interface CtaSplitImageImage {
  src: string;
  /** Describe what the image shows; it is content, not decoration. */
  alt: string;
  width?: number;
  height?: number;
}

export interface CtaSplitImageBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** The headline. */
  title?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: CtaSplitImageAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: CtaSplitImageAction | null;
  /** The image beside the copy. Without one, a token gradient holds its place. */
  image?: CtaSplitImageImage;
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

/** A two-column call to action: headline, copy and actions beside an image. */
export function CtaSplitImageBlock({
  title = "Ship faster with animated components",
  description = "Stop building UI from scratch. Use production-ready, accessible components that work with your existing design system.",
  primaryAction = { label: "Browse components", href: "#" },
  secondaryAction = { label: "Read the docs", href: "#" },
  image,
  headingLevel = 2,
  className,
  ...props
}: CtaSplitImageBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [ref, state] = useReveal();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="cta-split-image"
      className={cn("px-4 py-24 sm:px-6 md:py-32", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div ref={ref} className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div data-slot="cta-split-image-copy" data-state={state}>
          <Heading
            id={headingId}
            className="text-3xl font-bold tracking-tight text-balance md:text-4xl"
          >
            {title}
          </Heading>
          {description ? (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-8 flex flex-wrap gap-4">
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

        <div data-slot="cta-split-image-media" data-state={state}>
          <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
            {image ? (
              <img
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                draggable={false}
                className="h-auto w-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                data-slot="cta-split-image-placeholder"
                className="aspect-[4/3] w-full bg-linear-to-br from-muted via-card to-accent"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
