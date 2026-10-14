"use client";

// Original design.
import { useId, type ComponentPropsWithRef } from "react";

import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { FlowField } from "@/components/flow-field";
import { cn } from "@/lib/utils";

/*
 * A developer-facing hero over a flowing current: the headline and copy on
 * the start side, an install command to copy, two actions, and a row of
 * figures.
 *
 * FlowField draws the current on a canvas — paused off-screen and in hidden
 * tabs, still under reduced motion, parting around the pointer — and fades
 * out toward the bottom so the section ends cleanly. It is decoration. The
 * figures are a description list, so each number is read with what it
 * counts.
 */

export interface HeroFlowFieldAction {
  label: string;
  href: string;
}

export interface HeroFlowFieldStat {
  /** The figure, as shown: "276", "<5 kB", "AA". */
  value: string;
  /** What it counts. */
  label: string;
}

export interface HeroFlowFieldBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** A short line above the headline. `null` hides it. */
  eyebrow?: string | null;
  /** The headline. */
  title?: string;
  description?: string;
  /** A command to copy, e.g. an install line. `null` hides it. */
  command?: string | null;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroFlowFieldAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroFlowFieldAction | null;
  /** Figures under the copy. An empty list hides the row. */
  stats?: HeroFlowFieldStat[];
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Streak colour: a token or any CSS colour. Default "primary". */
  flowColor?: string;
}

const DEFAULT_STATS: HeroFlowFieldStat[] = [
  { value: "270+", label: "components" },
  { value: "50+", label: "blocks" },
  { value: "AA", label: "contrast in every theme" },
];

/** A developer hero over a flowing current, with a command to copy and a row of figures. */
export function HeroFlowFieldBlock({
  eyebrow = "Source-first React components",
  title = "Ship the interface, not the boilerplate",
  description = "Install accessible components as code you own. Every one is themed, keyboard-ready and tested before it reaches your repository.",
  command = "npx dowel add button",
  primaryAction = { label: "Read the docs", href: "#" },
  secondaryAction = { label: "View on GitHub", href: "#" },
  stats = DEFAULT_STATS,
  headingLevel = 1,
  flowColor = "primary",
  className,
  ...props
}: HeroFlowFieldBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-flow-field"
      className={cn("relative isolate overflow-hidden bg-background", className)}
      {...props}
    >
      <FlowField
        fade="bottom"
        color={flowColor}
        density={0.9}
        opacity={0.45}
        className="px-4 pt-24 pb-20 sm:px-6 md:pt-32 md:pb-28"
      >
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6">
          {eyebrow ? (
            <p className="text-sm font-medium tracking-wide text-primary">{eyebrow}</p>
          ) : null}
          <Heading
            id={headingId}
            className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl"
          >
            {title}
          </Heading>
          {description ? (
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
          {command ? (
            <div
              data-slot="hero-flow-field-command"
              className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/85 py-1 ps-4 pe-1 font-mono text-sm backdrop-blur"
            >
              <span aria-hidden="true" className="text-muted-foreground select-none">
                $
              </span>
              <code className="min-w-0 truncate text-foreground">{command}</code>
              <CopyButton
                value={command}
                variant="ghost"
                size="icon-sm"
                aria-label="Copy command"
              />
            </div>
          ) : null}
          {primaryAction || secondaryAction ? (
            <div className="flex flex-wrap items-center gap-3">
              {primaryAction ? (
                <Button asChild size="lg">
                  <a href={primaryAction.href}>{primaryAction.label}</a>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild size="lg" variant="outline">
                  <a href={secondaryAction.href}>{secondaryAction.label}</a>
                </Button>
              ) : null}
            </div>
          ) : null}
          {stats.length > 0 ? (
            <dl className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse gap-1">
                  <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </FlowField>
    </section>
  );
}
