"use client";

// Original design.
import { useId, useState, type ComponentPropsWithRef } from "react";

import { Badge, type BadgeProps } from "@/components/badge";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A product changelog: releases newest first, each with its date, version,
 * a headline and its changes marked New, Improved or Fixed.
 *
 * Each release is an article in an ordered list, named by its headline, with
 * a real <time>. From `md` up the date and version sit in a column that
 * stays in view while the release scrolls past. Filter buttons narrow the
 * changes to one kind; releases left with nothing to show are dropped, and a
 * status line says how many remain. The kind of each change is a word, not
 * a colour.
 */

export type ChangeKind = "new" | "improved" | "fixed" | "security" | "removed";

export interface ChangelogChange {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogRelease {
  version: string;
  /** ISO date, e.g. "2026-10-13". */
  date: string;
  title: string;
  summary?: string;
  changes: ChangelogChange[];
  /** A link to the full notes. */
  href?: string;
}

const KIND_LABELS: Record<ChangeKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  security: "Security",
  removed: "Removed",
};

/** Badge variants, whose pairs are contrast-audited in every theme. */
const KIND_BADGES: Record<ChangeKind, NonNullable<BadgeProps["variant"]>> = {
  new: "default",
  improved: "info",
  fixed: "success",
  security: "warning",
  removed: "destructive",
};

export interface ChangelogBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title?: string;
  description?: string;
  releases?: ChangelogRelease[];
  /** Show buttons to filter by kind of change. Default true. */
  filterable?: boolean;
  /** A feed or subscribe link. `null` hides it. */
  subscribe?: { label: string; href: string } | null;
  /** Locale for dates. */
  locale?: string;
  /** The headline's level; each release's heading is one below it. */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
}

const DEFAULT_RELEASES: ChangelogRelease[] = [
  {
    version: "2.4.0",
    date: "2026-10-13",
    title: "Voice input and workflow graphs",
    summary: "Talk to your assistant, and watch its runs as a graph.",
    changes: [
      {
        kind: "new",
        text: "Voice input records, shows the level and transcribes where the browser can.",
      },
      {
        kind: "new",
        text: "Workflow graphs lay out agent runs in layers, with each step's status.",
      },
      { kind: "improved", text: "The navbar hides on scroll but never while it holds focus." },
      { kind: "fixed", text: "Menus return focus to their trigger after Escape." },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-09-29",
    title: "Backgrounds you can switch on",
    changes: [
      { kind: "new", text: "Light beams, flow fields and interactive grids." },
      { kind: "improved", text: "Canvas effects pause off-screen and in hidden tabs." },
      { kind: "security", text: "API keys are shown once and masked afterwards." },
    ],
  },
  {
    version: "2.2.1",
    date: "2026-09-12",
    title: "Fixes",
    changes: [
      { kind: "fixed", text: "Date pickers respect the first day of the week for the locale." },
      { kind: "removed", text: 'The deprecated `size="xs"` on Button.' },
    ],
  },
];

/** Releases newest first, each with its date, version and kinds of change, filterable by kind. */
export function ChangelogBlock({
  title = "Changelog",
  description = "New features, improvements and fixes, as they ship.",
  releases = DEFAULT_RELEASES,
  filterable = true,
  subscribe = { label: "Subscribe via RSS", href: "#" },
  locale,
  headingLevel = 2,
  className,
  ...props
}: ChangelogBlockProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<ChangeKind | "all">("all");
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const ReleaseHeading = `h${String(headingLevel + 1)}` as `h${2 | 3 | 4 | 5 | 6}`;
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  const kinds = (Object.keys(KIND_LABELS) as ChangeKind[]).filter((kind) =>
    releases.some((release) => release.changes.some((change) => change.kind === kind)),
  );
  const shown = releases
    .map((release) => ({
      ...release,
      changes:
        filter === "all" ? release.changes : release.changes.filter((c) => c.kind === filter),
    }))
    .filter((release) => filter === "all" || release.changes.length > 0);

  return (
    <section
      aria-labelledby={headingId}
      data-slot="changelog"
      className={cn("px-4 py-16 sm:px-6 md:py-24", className)}
      {...props}
    >
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Heading
              id={headingId}
              className="text-3xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </Heading>
            {description ? <p className="text-muted-foreground">{description}</p> : null}
          </div>
          {subscribe ? (
            <a
              href={subscribe.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline",
                focusRing,
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
                className="size-4"
              >
                <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              {subscribe.label}
            </a>
          ) : null}
        </header>

        {filterable && kinds.length > 1 ? (
          <div
            className="flex flex-wrap items-center gap-2 py-6"
            role="group"
            aria-label="Show changes"
          >
            {(["all", ...kinds] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={filter === kind}
                onClick={() => {
                  setFilter(kind);
                }}
                className={cn(
                  "h-8 rounded-full border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background",
                  focusRing,
                )}
              >
                {kind === "all" ? "All" : KIND_LABELS[kind]}
              </button>
            ))}
            <p role="status" className="ms-auto text-sm text-muted-foreground">
              {`${String(shown.length)} ${shown.length === 1 ? "release" : "releases"}`}
            </p>
          </div>
        ) : null}

        <ol className={cn("flex flex-col", !filterable && "pt-8")}>
          {shown.map((release) => {
            const id = `${headingId}-${release.version}`;
            return (
              <li
                key={release.version}
                data-slot="changelog-release"
                className="border-b border-border py-10 last:border-b-0"
              >
                <article
                  aria-labelledby={id}
                  className="grid gap-4 md:grid-cols-[11rem_1fr] md:gap-10"
                >
                  <div className="flex items-center gap-3 md:sticky md:top-24 md:flex-col md:items-start md:gap-1 md:self-start">
                    <time dateTime={release.date} className="text-sm text-muted-foreground">
                      {dates.format(new Date(`${release.date}T00:00:00Z`))}
                    </time>
                    <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-foreground">
                      v{release.version}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-4">
                    <ReleaseHeading id={id} className="text-xl font-semibold text-foreground">
                      {release.title}
                    </ReleaseHeading>
                    {release.summary ? (
                      <p className="text-muted-foreground">{release.summary}</p>
                    ) : null}
                    <ul className="flex flex-col gap-3">
                      {release.changes.map((change, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
                        >
                          <Badge
                            data-kind={change.kind}
                            variant={KIND_BADGES[change.kind]}
                            size="sm"
                            className="mt-0.5 w-18 shrink-0 justify-center"
                          >
                            {KIND_LABELS[change.kind]}
                          </Badge>
                          <span className="min-w-0">{change.text}</span>
                        </li>
                      ))}
                    </ul>
                    {release.href ? (
                      <a
                        href={release.href}
                        className={cn(
                          "self-start rounded-md text-sm font-medium text-primary hover:underline",
                          focusRing,
                        )}
                      >
                        Read the full notes{" "}
                        <span className="sr-only">{`for version ${release.version}`}</span>
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
