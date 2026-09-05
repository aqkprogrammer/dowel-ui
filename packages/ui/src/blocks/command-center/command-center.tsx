"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/command";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import {
  LogViewer,
  LogViewerToolbar,
  useLogStream,
  type LogLine,
} from "@/components/log-viewer";
import { Meter, MeterLegend, MeterValue } from "@/components/meter";
import { cn } from "@/lib/utils";

/**
 * Operations at a glance: what is up, what is broken, how much room is left,
 * and what the systems are saying — with every action an operator reaches for
 * one keystroke away.
 *
 * The overall status is a sentence, computed from the worst service, and it
 * comes first. A wall of green tiles with one red one is a page you have to
 * scan; "one service is down" is a page that tells you.
 *
 * Health is never colour alone. Each service carries its state as a word, the
 * incidents carry their severity as a word, and the words are what get sorted
 * on: outages before degradation, critical before minor. The colours agree
 * with the words; they do not replace them.
 */

export type ServiceHealth = "operational" | "degraded" | "outage" | "maintenance";

export interface CommandCenterService {
  id: string;
  name: string;
  health: ServiceHealth;
  /** e.g. "99.98%". A string, because the period is a presentation choice. */
  uptime?: string;
  /** Current p95 latency in milliseconds. */
  latencyMs?: number;
  region?: string;
  /** Where the service's own page lives. */
  href?: string;
}

export type IncidentSeverity = "critical" | "major" | "minor";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface CommandCenterIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detail?: string;
  /** Machine-readable start time. */
  startedAt: string;
  /** Human label, e.g. "12 minutes ago". */
  startedLabel: string;
  href?: string;
}

export interface CommandCenterCapacity {
  id: string;
  label: string;
  used: number;
  max: number;
  /** Fraction of `max` past which the meter reports strain. */
  warnAt?: number;
  format?: (value: number) => string;
}

export interface CommandCenterAction {
  id: string;
  label: string;
  description?: string;
  /** Shown beside the label, e.g. "⌘R". Decorative — the item is the control. */
  shortcut?: string;
  group?: string;
  keywords?: string[];
  onSelect: () => void;
}

export interface CommandCenterBlockProps {
  title?: string;
  description?: string;
  services: CommandCenterService[];
  incidents?: CommandCenterIncident[];
  capacity?: CommandCenterCapacity[];
  /** Recent log lines, newest last. */
  logs?: LogLine[];
  logsLabel?: string;
  onDownloadLogs?: () => void;
  /** What the command palette offers. Empty means no palette. */
  actions?: CommandCenterAction[];
  /** Machine-readable time of the last refresh. */
  updatedAt?: string;
  /** Human label for it, e.g. "10 seconds ago". */
  updatedLabel?: string;
  headerActions?: ReactNode;
  className?: string;
}

const HEALTH_LABEL: Record<ServiceHealth, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  maintenance: "Maintenance",
};

const HEALTH_VARIANT: Record<ServiceHealth, "success" | "warning" | "destructive" | "info"> = {
  operational: "success",
  degraded: "warning",
  outage: "destructive",
  maintenance: "info",
};

/** Worst first, which is the order anyone on call wants. */
const HEALTH_RANK: Record<ServiceHealth, number> = {
  outage: 0,
  degraded: 1,
  maintenance: 2,
  operational: 3,
};

const SEVERITY_RANK: Record<IncidentSeverity, number> = { critical: 0, major: 1, minor: 2 };

const SEVERITY_VARIANT: Record<IncidentSeverity, "destructive" | "warning" | "secondary"> = {
  critical: "destructive",
  major: "warning",
  minor: "secondary",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

/**
 * One sentence about the whole fleet.
 *
 * Exported so an application can put the same sentence in a page title or a
 * notification and be certain it agrees with what the page says.
 */
export function describeFleet(services: CommandCenterService[]): {
  sentence: string;
  worst: ServiceHealth;
} {
  if (services.length === 0) {
    return { sentence: "No services are being watched.", worst: "operational" };
  }

  const down = services.filter((service) => service.health === "outage");
  const degraded = services.filter((service) => service.health === "degraded");
  const maintenance = services.filter((service) => service.health === "maintenance");

  const name = (list: CommandCenterService[]) =>
    list.length === 1 ? (list[0]?.name ?? "") : `${String(list.length)} services`;

  if (down.length > 0) {
    return {
      sentence: `${name(down)} ${down.length === 1 ? "is" : "are"} down${
        degraded.length > 0 ? `, and ${name(degraded)} degraded` : ""
      }.`,
      worst: "outage",
    };
  }
  if (degraded.length > 0) {
    return {
      sentence: `${name(degraded)} ${degraded.length === 1 ? "is" : "are"} degraded.`,
      worst: "degraded",
    };
  }
  if (maintenance.length > 0) {
    return {
      sentence: `All systems operational. ${name(maintenance)} ${
        maintenance.length === 1 ? "is" : "are"
      } in maintenance.`,
      worst: "maintenance",
    };
  }
  return { sentence: "All systems operational.", worst: "operational" };
}

function count(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";
}

export function CommandCenterBlock({
  title = "Command center",
  description = "What is up, what is not, and what to do about it.",
  services,
  incidents = [],
  capacity = [],
  logs = [],
  logsLabel = "Recent logs",
  onDownloadLogs,
  actions = [],
  updatedAt,
  updatedLabel,
  headerActions,
  className,
}: CommandCenterBlockProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const stream = useLogStream({ lines: logs });

  const fleet = describeFleet(services);
  const sortedServices = [...services].sort(
    (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name),
  );

  const open = incidents
    .filter((incident) => incident.status !== "resolved")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const resolved = incidents.filter((incident) => incident.status === "resolved");

  const hasPalette = actions.length > 0;

  // ⌘K is an accelerator, not the only way in: the button beside the heading
  // is always there, so nobody has to know the shortcut to find the actions.
  useEffect(() => {
    if (!hasPalette) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      setPaletteOpen((previous) => !previous);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hasPalette]);

  const groups = new Map<string, CommandCenterAction[]>();
  for (const action of actions) {
    const key = action.group ?? "Actions";
    const list = groups.get(key) ?? [];
    list.push(action);
    groups.set(key, list);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
            {updatedLabel ? (
              <>
                {" "}
                Updated <time dateTime={updatedAt}>{updatedLabel}</time>.
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {hasPalette ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPaletteOpen(true);
              }}
            >
              Actions
              <kbd className="ms-1 rounded-sm border border-border px-1 font-mono text-2xs text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          ) : null}
        </div>
      </div>

      {/*
        The sentence, first. Not a live region: this page is refreshed by the
        application, and a status that re-announces itself on every poll is a
        status nobody can work beside. An application that wants a change
        announced puts the same sentence in a toast.
      */}
      <Alert
        variant={
          fleet.worst === "outage"
            ? "destructive"
            : fleet.worst === "degraded"
              ? "warning"
              : fleet.worst === "maintenance"
                ? "info"
                : "success"
        }
      >
        <AlertTitle>{fleet.sentence}</AlertTitle>
        <AlertDescription>
          {count(services.length)} {services.length === 1 ? "service" : "services"} watched
          {open.length > 0
            ? `, ${count(open.length)} open ${open.length === 1 ? "incident" : "incidents"}`
            : ", no open incidents"}
          .
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>Services</h2>
              </CardTitle>
              <CardDescription>Worst first.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedServices.length === 0 ? (
                <EmptyState size="sm">
                  <EmptyStateTitle>Nothing is being watched</EmptyStateTitle>
                  <EmptyStateDescription>
                    Services will appear here once a check is pointed at them.
                  </EmptyStateDescription>
                </EmptyState>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {sortedServices.map((service) => (
                    <li
                      key={service.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {service.href ? (
                            <a
                              href={service.href}
                              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                            >
                              {service.name}
                            </a>
                          ) : (
                            service.name
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          {service.region ? <span>{service.region}</span> : null}
                          {service.uptime ? <span>{service.uptime} uptime</span> : null}
                          {service.latencyMs === undefined ? null : (
                            <span className="tabular-nums">
                              p95 {count(service.latencyMs)} ms
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge size="sm" variant={HEALTH_VARIANT[service.health]}>
                        {HEALTH_LABEL[service.health]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {logs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle asChild>
                  <h2>{logsLabel}</h2>
                </CardTitle>
                <CardDescription>
                  Filter by text or level. New lines are not read aloud unless you ask.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogViewer
                  label={logsLabel}
                  lines={stream.visible}
                  height={280}
                  onDownload={onDownloadLogs}
                >
                  <LogViewerToolbar
                    query={stream.query}
                    onQueryChange={stream.setQuery}
                    regex={stream.regex}
                    onRegexChange={stream.setRegex}
                    levels={stream.levels}
                    onToggleLevel={stream.toggleLevel}
                    counts={stream.counts}
                    invalidPattern={stream.invalidPattern}
                    showing={stream.visible.length}
                    total={stream.total}
                  />
                </LogViewer>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>Incidents</h2>
              </CardTitle>
              <CardDescription>Open ones first, most severe at the top.</CardDescription>
            </CardHeader>
            <CardContent>
              {open.length === 0 && resolved.length === 0 ? (
                <EmptyState size="sm">
                  <EmptyStateTitle>No incidents</EmptyStateTitle>
                  <EmptyStateDescription>
                    Nothing is open, and nothing recently was.
                  </EmptyStateDescription>
                </EmptyState>
              ) : (
                <ul className="grid gap-2">
                  {[...open, ...resolved].map((incident) => (
                    <li
                      key={incident.id}
                      data-resolved={incident.status === "resolved" || undefined}
                      className="rounded-lg border border-border px-3 py-2 data-[resolved]:opacity-70"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" variant={SEVERITY_VARIANT[incident.severity]}>
                          {incident.severity}
                        </Badge>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {incident.href ? (
                            <a
                              href={incident.href}
                              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                            >
                              {incident.title}
                            </a>
                          ) : (
                            incident.title
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABEL[incident.status]}
                        </span>
                      </div>
                      {incident.detail ? (
                        <p className="mt-1 text-xs text-muted-foreground">{incident.detail}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Started{" "}
                        <time dateTime={incident.startedAt}>{incident.startedLabel}</time>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {capacity.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle asChild>
                  <h2>Capacity</h2>
                </CardTitle>
                <CardDescription>How much room is left.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {capacity.map((entry) => (
                  <Meter
                    key={entry.id}
                    label={entry.label}
                    segments={[{ id: entry.id, label: "Used", value: entry.used }]}
                    max={entry.max}
                    warnAt={entry.warnAt}
                    format={entry.format}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-foreground">{entry.label}</span>
                      <MeterValue className="text-muted-foreground" />
                    </div>
                    <MeterLegend className="sr-only" />
                  </Meter>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {hasPalette ? (
        <CommandDialog
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          title="Actions"
          description="Search for an action and press Enter to run it."
        >
          <CommandInput placeholder="What do you want to do?" />
          <CommandList>
            <CommandEmpty>No action matches.</CommandEmpty>
            {[...groups.entries()].map(([heading, list]) => (
              <CommandGroup key={heading} heading={heading}>
                {list.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    keywords={action.keywords}
                    onSelect={() => {
                      setPaletteOpen(false);
                      action.onSelect();
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{action.label}</span>
                      {action.description ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      ) : null}
                    </span>
                    {action.shortcut ? (
                      <CommandShortcut>{action.shortcut}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      ) : null}
    </div>
  );
}
