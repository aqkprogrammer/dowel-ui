"use client";

import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * What an action will change, before it changes it.
 *
 * An approval that says "Delete rows?" asks the person to imagine the
 * consequences. This shows them: how many things change, how, which of them
 * cannot be taken back, and a sample by name — "43 records will change: 40
 * updated, 3 deleted. 3 cannot be undone." Everything that matters is a
 * sentence, so none of it depends on colour.
 *
 * Presentational: it renders a dry run's result, it does not run one. Inside
 * an `agent-approvals`, a tool's `preview` fills it in; anywhere else, pass the
 * data yourself.
 */

export type BlastRadiusKind = "create" | "update" | "delete";
export type BlastRadiusReversibility = "revertible" | "compensable" | "irreversible";

export interface BlastRadiusChange {
  id: string;
  /** What it is, in the person's words: "Acme renewal". */
  label: string;
  kind: BlastRadiusKind;
  /** Overrides `reversibility` for this one change. */
  reversibility?: BlastRadiusReversibility;
  /** What changes about it: "Stage: Negotiation → Closed lost". */
  detail?: string;
}

export interface BlastRadiusData {
  changes: BlastRadiusChange[];
  /** How many in all, when `changes` is a sample. */
  total?: number;
  /** Anything the list cannot say: "Also emails each owner." */
  note?: string;
}

export interface BlastRadiusNoun {
  one: string;
  other: string;
}

export interface BlastRadiusProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  data?: BlastRadiusData;
  /** While the dry run is still working. */
  loading?: boolean;
  /** Why the dry run could not say. The decision can still be made without it. */
  error?: string;
  /** How reversible a change is when it does not say. Usually the action's own. */
  reversibility?: BlastRadiusReversibility;
  /** What the things are called: `{ one: "deal", other: "deals" }`. */
  noun?: BlastRadiusNoun;
  /** How many changes to list by name before "and N more". */
  limit?: number;
  heading?: string;
}

const VERB: Record<BlastRadiusKind, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
};

const ORDER: BlastRadiusKind[] = ["delete", "update", "create"];

function count(n: number, noun: BlastRadiusNoun): string {
  return `${String(n)} ${n === 1 ? noun.one : noun.other}`;
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1) ?? ""}`;
}

export interface BlastRadiusSummary {
  total: number;
  byKind: Record<BlastRadiusKind, number>;
  /** Permanent changes among those listed. */
  permanent: number;
  /** Whether the list is a sample, so counts by kind are a lower bound. */
  sampled: boolean;
  sentence: string;
}

/**
 * The whole dry run in one sentence, and the counts behind it.
 *
 * When the list is a sample, counts by kind and the permanent count are what
 * the sample shows — so the sentence says "at least", rather than presenting
 * a guess as a total.
 */
export function summariseBlastRadius(
  data: BlastRadiusData,
  reversibility: BlastRadiusReversibility = "revertible",
  noun: BlastRadiusNoun = { one: "record", other: "records" },
): BlastRadiusSummary {
  const total = Math.max(data.total ?? data.changes.length, data.changes.length);
  const sampled = total > data.changes.length;
  const byKind: Record<BlastRadiusKind, number> = { create: 0, update: 0, delete: 0 };
  let permanent = 0;
  for (const change of data.changes) {
    byKind[change.kind] += 1;
    if ((change.reversibility ?? reversibility) === "irreversible") permanent += 1;
  }

  if (total === 0) {
    return { total, byKind, permanent, sampled, sentence: "Nothing will change." };
  }

  const kinds = ORDER.filter((kind) => byKind[kind] > 0).map(
    (kind) => `${sampled ? "at least " : ""}${String(byKind[kind])} ${VERB[kind]}`,
  );
  // A sample says nothing about the rest — unless the action itself is
  // permanent and nothing listed says otherwise, in which case it all is.
  const allPermanent =
    permanent === data.changes.length && (!sampled || reversibility === "irreversible");
  const permanence =
    permanent === 0
      ? ""
      : allPermanent
        ? total === 1
          ? " It cannot be undone."
          : " None of it can be undone."
        : ` ${sampled ? "At least " : ""}${String(permanent)} cannot be undone.`;

  const sentence =
    `${count(total, noun)} will change` +
    (kinds.length > 0 ? `: ${list(kinds)}.` : ".") +
    permanence;
  return { total, byKind, permanent, sampled, sentence };
}

export function BlastRadius({
  className,
  data,
  loading = false,
  error,
  reversibility = "revertible",
  noun = { one: "record", other: "records" },
  limit = 5,
  heading = "What this will change",
  ...props
}: BlastRadiusProps) {
  const headingId = useId();
  const summary = data ? summariseBlastRadius(data, reversibility, noun) : null;

  // Permanent changes first: they are the ones the decision turns on.
  const ranked = data
    ? [...data.changes].sort((a, b) => {
        const permanentA = (a.reversibility ?? reversibility) === "irreversible" ? 0 : 1;
        const permanentB = (b.reversibility ?? reversibility) === "irreversible" ? 0 : 1;
        return permanentA - permanentB || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind);
      })
    : [];
  const shown = ranked.slice(0, limit);
  const more = summary ? summary.total - shown.length : 0;

  const message = loading
    ? "Working out what this will change…"
    : error
      ? `Could not work out what this will change: ${error}`
      : (summary?.sentence ?? "");

  return (
    <section
      data-slot="blast-radius"
      data-state={loading ? "loading" : error ? "failed" : "ready"}
      aria-labelledby={headingId}
      aria-busy={loading || undefined}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3",
        className,
      )}
      {...props}
    >
      <h4 id={headingId} className="text-xs font-medium text-muted-foreground">
        {heading}
      </h4>
      {/* Polite, and present from the start: the dry run usually lands after
          the question is already on screen, and its answer is worth hearing. */}
      <p
        data-slot="blast-radius-summary"
        aria-live="polite"
        className={cn("text-sm", summary && summary.permanent > 0 && "font-medium")}
      >
        {message}
      </p>

      {!loading && !error && shown.length > 0 ? (
        <ul data-slot="blast-radius-changes" className="flex flex-col gap-1.5 text-sm">
          {shown.map((change) => {
            const permanent = (change.reversibility ?? reversibility) === "irreversible";
            return (
              <li
                key={change.id}
                data-kind={change.kind}
                data-permanent={permanent || undefined}
                className="flex flex-col gap-0.5 rounded-sm border-s-2 border-border ps-2 data-[kind=delete]:border-destructive/60"
              >
                <span>
                  <span className="font-medium">{change.label}</span>
                  <span className="text-muted-foreground"> will be {VERB[change.kind]}</span>
                  {permanent ? (
                    <span className="text-muted-foreground"> · cannot be undone</span>
                  ) : null}
                </span>
                {change.detail ? (
                  <span className="text-xs text-muted-foreground">{change.detail}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && !error && more > 0 ? (
        <p data-slot="blast-radius-more" className="text-xs text-muted-foreground">
          and {count(more, noun)} more
        </p>
      ) : null}

      {!loading && !error && data?.note ? (
        <p data-slot="blast-radius-note" className="text-xs text-muted-foreground">
          {data.note}
        </p>
      ) : null}
    </section>
  );
}
