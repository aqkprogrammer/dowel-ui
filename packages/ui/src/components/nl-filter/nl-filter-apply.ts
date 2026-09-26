/**
 * Runs filters over rows in memory. For a list that is already on the client;
 * a server-side list sends the chips to its own query instead.
 */

import {
  normaliseDate,
  parseNumber,
  type FilterDraft,
  type FilterField,
  type FilterFieldType,
} from "./nl-filter-model";

/** Reads a field's value from a row. The default is `row[field.key]`. */
export type FilterValueGetter<Row> = (row: Row, field: FilterField) => unknown;

function readKey(row: unknown, field: FilterField): unknown {
  return typeof row === "object" && row !== null
    ? (row as Record<string, unknown>)[field.key]
    : undefined;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * A value as the calendar day it falls on, `YYYY-MM-DD`, so dates compare as
 * strings. An ISO string keeps the day it was written with, rather than
 * whichever day it is in the reader's time zone; a Date or a timestamp uses
 * the local day, which is the one the person sees.
 */
function dayOf(value: unknown): string | null {
  if (typeof value === "string") {
    const written = normaliseDate(value.slice(0, 10));
    if (written) return written;
  }
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function numberOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return parseNumber(value);
  if (value instanceof Date) return value.getTime();
  return null;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).toLowerCase();
  }
  return value instanceof Date ? (dayOf(value) ?? "") : "";
}

/** How a value orders against the filter's, or null when they cannot be compared. */
function order(value: unknown, target: unknown, type: FilterFieldType): number | null {
  if (type === "number") {
    const a = numberOf(value);
    const b = numberOf(target);
    return a === null || b === null ? null : Math.sign(a - b);
  }
  const a = type === "date" ? dayOf(value) : textOf(value);
  const b = type === "date" ? dayOf(target) : textOf(target);
  if (a === null || b === null) return null;
  return a === b ? 0 : a < b ? -1 : 1;
}

function matches(value: unknown, filter: FilterDraft, field: FilterField): boolean {
  // A list matches when any of its items does — a deploy tagged ["api",
  // "web"] is tagged api — and "is not" when none of them is.
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return filter.operator === "is not"
      ? items.every((item) => matches(item, filter, field))
      : items.some((item) => matches(item, filter, field));
  }
  if (value === null || value === undefined || value === "") {
    return filter.operator === "is not";
  }
  if (filter.operator === "contains") {
    return textOf(value).includes(textOf(filter.value));
  }
  const result = order(value, filter.value, field.type);
  switch (filter.operator) {
    case "is":
      return result === 0;
    case "is not":
      return result !== 0;
    case ">":
    case "after":
      return result !== null && result > 0;
    case "<":
    case "before":
      return result !== null && result < 0;
    case ">=":
      return result !== null && result >= 0;
    case "<=":
      return result !== null && result <= 0;
  }
}

/**
 * The rows every filter lets through.
 *
 * Filters on different fields must all hold. Several `is` filters on the same
 * field match any of them — a row cannot be both Failed and Cancelled, so
 * "failed or cancelled" would otherwise always be empty — while every other
 * operator must hold as well. Text compares without case, numbers as numbers,
 * dates by calendar day. A filter on a field that is not in `fields` is read
 * as text by its key.
 */
export function applyFilters<Row>(
  rows: readonly Row[],
  filters: readonly FilterDraft[],
  fields: readonly FilterField[],
  getValue: FilterValueGetter<Row> = readKey,
): Row[] {
  const groups = new Map<
    string,
    { field: FilterField; any: FilterDraft[]; all: FilterDraft[] }
  >();
  for (const filter of filters) {
    let group = groups.get(filter.field);
    if (!group) {
      const field = fields.find((candidate) => candidate.key === filter.field) ?? {
        key: filter.field,
        label: filter.field,
        type: "text" as const,
      };
      group = { field, any: [], all: [] };
      groups.set(filter.field, group);
    }
    (filter.operator === "is" ? group.any : group.all).push(filter);
  }

  return rows.filter((row) =>
    [...groups.values()].every(({ field, any, all }) => {
      const value = getValue(row, field);
      return (
        (any.length === 0 || any.some((filter) => matches(value, filter, field))) &&
        all.every((filter) => matches(value, filter, field))
      );
    }),
  );
}
