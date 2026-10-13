"use client";

// Original design.
import { useId, useState, type ComponentPropsWithRef } from "react";

import { Button } from "@/components/button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Input } from "@/components/input";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Open roles, grouped by team, with a search and a filter by team.
 *
 * Each team is a heading over a list of roles; each role is one link — the
 * title is the link text, and the location and type follow in the row, so a
 * screen reader's links list reads as job titles rather than "Apply" eight
 * times. The search matches title, team and location. A status line says how
 * many roles match, and when none do, an empty state offers to clear the
 * filters.
 */

export interface CareersRole {
  id: string;
  title: string;
  team: string;
  location: string;
  /** "Full-time", "Contract", … */
  type: string;
  remote?: boolean;
  href: string;
}

export interface CareersBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title?: string;
  description?: string;
  roles?: CareersRole[];
  /** The headline's level; team headings are one below it. */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  /** Where to go when nothing fits — a general application. `null` hides it. */
  fallback?: { label: string; href: string } | null;
}

const DEFAULT_ROLES: CareersRole[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    team: "Engineering",
    location: "London",
    type: "Full-time",
    remote: true,
    href: "#",
  },
  {
    id: "2",
    title: "Design Systems Engineer",
    team: "Engineering",
    location: "Berlin",
    type: "Full-time",
    href: "#",
  },
  {
    id: "3",
    title: "Machine Learning Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    remote: true,
    href: "#",
  },
  {
    id: "4",
    title: "Product Designer",
    team: "Design",
    location: "New York",
    type: "Full-time",
    href: "#",
  },
  {
    id: "5",
    title: "Brand Designer",
    team: "Design",
    location: "Remote",
    type: "Contract",
    remote: true,
    href: "#",
  },
  {
    id: "6",
    title: "Developer Advocate",
    team: "Marketing",
    location: "San Francisco",
    type: "Full-time",
    href: "#",
  },
];

/** Open roles grouped by team, searchable and filterable. */
export function CareersBlock({
  title = "Open roles",
  description = "Join a small team building tools that thousands of developers rely on.",
  roles = DEFAULT_ROLES,
  headingLevel = 2,
  fallback = { label: "Send a general application", href: "#" },
  className,
  ...props
}: CareersBlockProps) {
  const headingId = useId();
  const searchId = useId();
  const [team, setTeam] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const TeamHeading = `h${String(headingLevel + 1)}` as `h${2 | 3 | 4 | 5 | 6}`;

  const teams = [...new Set(roles.map((role) => role.team))];
  const needle = query.trim().toLowerCase();
  const matches = roles.filter(
    (role) =>
      (team === null || role.team === team) &&
      (needle === "" ||
        `${role.title} ${role.team} ${role.location} ${role.type}`
          .toLowerCase()
          .includes(needle)),
  );
  const groups = teams
    .map((name) => ({ name, roles: matches.filter((role) => role.team === name) }))
    .filter((group) => group.roles.length > 0);

  const filtered = team !== null || needle !== "";
  const clear = () => {
    setTeam(null);
    setQuery("");
  };

  return (
    <section
      aria-labelledby={headingId}
      data-slot="careers"
      className={cn("px-4 py-16 sm:px-6 md:py-24", className)}
      {...props}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Heading
            id={headingId}
            className="text-3xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </Heading>
          {description ? (
            <p className="max-w-2xl text-muted-foreground">{description}</p>
          ) : null}
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <label htmlFor={searchId} className="text-sm font-medium text-foreground">
              Search roles
            </label>
            <Input
              id={searchId}
              type="search"
              value={query}
              placeholder="Title, team or location"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </div>
          {teams.length > 1 ? (
            <div role="group" aria-label="Team" className="flex flex-wrap gap-2">
              {[null, ...teams].map((name) => (
                <button
                  key={name ?? "all"}
                  type="button"
                  aria-pressed={team === name}
                  onClick={() => {
                    setTeam(name);
                  }}
                  className={cn(
                    "h-8 rounded-full border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    "aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background",
                    focusRing,
                  )}
                >
                  {name ?? "All teams"}
                </button>
              ))}
            </div>
          ) : null}
          <p role="status" className="text-sm text-muted-foreground">
            {`${String(matches.length)} ${matches.length === 1 ? "open role" : "open roles"}`}
          </p>
        </div>

        {groups.length > 0 ? (
          <div className="flex flex-col gap-10">
            {groups.map((group) => {
              const groupId = `${headingId}-${group.name}`;
              return (
                <div key={group.name} className="flex flex-col gap-3">
                  <TeamHeading
                    id={groupId}
                    className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {group.name}
                  </TeamHeading>
                  <ul
                    aria-labelledby={groupId}
                    className="flex flex-col divide-y divide-border rounded-xl border border-border"
                  >
                    {group.roles.map((role) => (
                      <li key={role.id}>
                        <a
                          href={role.href}
                          data-slot="careers-role"
                          className={cn(
                            "group flex flex-col gap-1 rounded-xl px-5 py-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:gap-6",
                            focusRing,
                          )}
                        >
                          <span className="font-medium text-foreground sm:flex-1">
                            {role.title}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>
                              {role.location}
                              {role.remote && role.location !== "Remote"
                                ? " · Remote friendly"
                                : ""}
                            </span>
                            <span>{role.type}</span>
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={cn(
                              "hidden size-4 text-muted-foreground transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 sm:block rtl:group-hover:-translate-x-0.5",
                              mirrorForDirection,
                            )}
                          >
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState bordered>
            <EmptyStateTitle>
              {filtered ? "No roles match" : "No open roles right now"}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {filtered
                ? "Try another search or team."
                : "We're always glad to hear from people who'd like to join."}
            </EmptyStateDescription>
            <EmptyStateActions>
              {filtered ? (
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              ) : null}
              {fallback ? (
                <Button asChild variant="ghost">
                  <a href={fallback.href}>{fallback.label}</a>
                </Button>
              ) : null}
            </EmptyStateActions>
          </EmptyState>
        )}
      </div>
    </section>
  );
}
