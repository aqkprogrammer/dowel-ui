"use client";

// Original design.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Input } from "@/components/input";
import { Switch } from "@/components/switch";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An integrations directory: a grid of services to connect, with a search,
 * a filter by category, and a switch on each to turn it on or off.
 *
 * Each card is a list item whose switch is named by the service ("Slack"),
 * with its state in words beside it — "Connected" or "Not connected" — so it
 * is never colour or knob position alone. "Connected" is a filter like any
 * category. A status line counts what matches and how many are connected.
 * Turning one on calls `onConnectedChange`; reject from it to put the switch back.
 */

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  connected?: boolean;
  /** A logo. Decorative; defaults to the name's first letter. */
  icon?: ReactNode;
  /** A settings or docs link for the integration. */
  href?: string;
}

export interface IntegrationsBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  title?: string;
  description?: string;
  integrations?: Integration[];
  /** Called when a switch is flipped. Return a rejected promise to undo it. */
  onConnectedChange?: (id: string, connected: boolean) => void | Promise<void>;
  /** The headline's level. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: "chat",
    name: "Team Chat",
    category: "Communication",
    description: "Post alerts and summaries to a channel.",
    connected: true,
  },
  {
    id: "mail",
    name: "Mailer",
    category: "Communication",
    description: "Send transactional email from your workflows.",
  },
  {
    id: "repo",
    name: "Code Host",
    category: "Developer",
    description: "Open issues and link pull requests to tasks.",
    connected: true,
  },
  {
    id: "ci",
    name: "Pipelines",
    category: "Developer",
    description: "Report build status on every deploy.",
  },
  {
    id: "pay",
    name: "Payments",
    category: "Finance",
    description: "Sync invoices, refunds and payouts.",
  },
  {
    id: "books",
    name: "Ledger",
    category: "Finance",
    description: "Export transactions to your accounting.",
  },
  {
    id: "crm",
    name: "Pipeline CRM",
    category: "Sales",
    description: "Create contacts and deals from sign-ups.",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    category: "Data",
    description: "Stream events to your data warehouse nightly.",
  },
];

/** Services to connect, searchable and filterable, each with a labelled switch. */
export function IntegrationsBlock({
  title = "Integrations",
  description = "Connect the tools your team already uses.",
  integrations = DEFAULT_INTEGRATIONS,
  onConnectedChange,
  headingLevel = 2,
  className,
  ...props
}: IntegrationsBlockProps) {
  const headingId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [connected, setConnected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(integrations.map((item) => [item.id, Boolean(item.connected)])),
  );
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;

  const categories = [
    "All",
    "Connected",
    ...new Set(integrations.map((item) => item.category)),
  ];
  const needle = query.trim().toLowerCase();
  const shown = integrations.filter((item) => {
    const inFilter =
      filter === "All" ||
      (filter === "Connected" ? connected[item.id] : item.category === filter);
    return (
      inFilter &&
      (needle === "" ||
        `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(needle))
    );
  });
  const total = integrations.filter((item) => connected[item.id]).length;

  async function toggle(id: string, next: boolean) {
    setConnected((current) => ({ ...current, [id]: next }));
    try {
      await onConnectedChange?.(id, next);
    } catch {
      setConnected((current) => ({ ...current, [id]: !next }));
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="integrations"
      className={cn("px-4 py-16 sm:px-6 md:py-20", className)}
      {...props}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Heading
              id={headingId}
              className="text-3xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </Heading>
            {description ? <p className="text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5 md:w-72">
            <label htmlFor={searchId} className="text-sm font-medium text-foreground">
              Search integrations
            </label>
            <Input
              id={searchId}
              type="search"
              value={query}
              placeholder="Name or what it does"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </div>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={filter === name}
                onClick={() => {
                  setFilter(name);
                }}
                className={cn(
                  "h-8 rounded-full border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background",
                  focusRing,
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <p role="status" className="shrink-0 text-sm text-muted-foreground">
            {`${String(shown.length)} shown · ${String(total)} connected`}
          </p>
        </div>

        {shown.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => {
              const nameId = `${headingId}-${item.id}`;
              const on = Boolean(connected[item.id]);
              return (
                <li
                  key={item.id}
                  data-slot="integration"
                  data-connected={on || undefined}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground transition-colors data-[connected]:border-primary/40"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-base font-semibold text-foreground [&_svg]:size-5"
                    >
                      {item.icon ?? item.name.charAt(0)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span id={nameId} className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                    <Switch
                      aria-labelledby={nameId}
                      checked={on}
                      onCheckedChange={(next) => void toggle(item.id, next)}
                    />
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        on ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full",
                          on ? "bg-success" : "bg-muted-foreground/50",
                        )}
                      />
                      {on ? "Connected" : "Not connected"}
                    </span>
                    {item.href ? (
                      <a
                        href={item.href}
                        className={cn(
                          "rounded-sm font-medium text-primary hover:underline",
                          focusRing,
                        )}
                      >
                        Settings <span className="sr-only">{`for ${item.name}`}</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            No integrations match. Try another search or category.
          </p>
        )}
      </div>
    </section>
  );
}
