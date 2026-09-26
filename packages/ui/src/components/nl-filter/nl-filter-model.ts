/**
 * Filters as data: the types, and what can be said and checked about one.
 *
 * Pure: no React and no clock. The component, `applyFilters` and an app's own
 * parser (usually a model call) all speak the same `FilterChip` shape, so a
 * parser can be swapped without touching anything that reads the filters.
 */

export type FilterFieldType = "text" | "number" | "enum" | "date";

export type FilterOperator =
  "is" | "is not" | "contains" | ">" | "<" | ">=" | "<=" | "before" | "after";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  /** What a row is read by: `row[key]`, unless `applyFilters` is given a getter. */
  key: string;
  /** What the chip says: "Status". */
  label: string;
  type: FilterFieldType;
  /** For `enum`: every value it can take. A label typed on its own is enough: "failed". */
  options?: FilterOption[];
  /**
   * Other words for the field. A synonym can also stand in front of a value
   * with no operator, so with `["on"]` on Branch, "on main" reads as Branch is
   * main. The label and key cannot, because a text field's own name is too
   * common a word to trust without one.
   */
  synonyms?: string[];
}

export interface FilterChip {
  id: string;
  /** The field's `key`. */
  field: string;
  operator: FilterOperator;
  /** An enum option's `value`, a number, a `YYYY-MM-DD` date, or text. */
  value: string | number;
}

/** A filter before it has an id: what a parser returns. */
export type FilterDraft = Omit<FilterChip, "id">;

export interface ParsedFilter {
  chips: FilterDraft[];
  /** Whatever the parser could not turn into a filter, in the person's words. */
  unparsed?: string;
}

/**
 * Turns text into filters. May return a promise, and should stop work when
 * `signal` aborts: a newer submission has replaced this one.
 */
export type FilterParser = (
  text: string,
  fields: FilterField[],
  signal: AbortSignal,
) => Promise<ParsedFilter> | ParsedFilter;

const OPERATORS: Record<FilterFieldType, FilterOperator[]> = {
  text: ["is", "is not", "contains"],
  number: ["is", "is not", ">", "<", ">=", "<="],
  enum: ["is", "is not"],
  date: ["is", "is not", "before", "after", ">=", "<="],
};

/** The operators that make sense for a type of field, in the order a menu shows them. */
export function operatorsFor(type: FilterFieldType): FilterOperator[] {
  return [...OPERATORS[type]];
}

// Words, not symbols: most screen readers skip ">" at their default
// punctuation level, which turns "Duration > 3" into "Duration 3".
const OPERATOR_WORDS: Record<FilterOperator, string> = {
  is: "is",
  "is not": "is not",
  contains: "contains",
  ">": "greater than",
  "<": "less than",
  ">=": "at least",
  "<=": "at most",
  before: "before",
  after: "after",
};

const DATE_WORDS: Partial<Record<FilterOperator, string>> = {
  ">": "after",
  "<": "before",
  ">=": "on or after",
  "<=": "on or before",
};

/** An operator in words: `">="` is "at least", or "on or after" for a date. */
export function operatorLabel(operator: FilterOperator, type?: FilterFieldType): string {
  return (type === "date" ? DATE_WORDS[operator] : undefined) ?? OPERATOR_WORDS[operator];
}

export function lower(text: string): string {
  return text.trim().toLowerCase();
}

/** Finds a field by key, label or synonym, ignoring case. */
function findField(fields: readonly FilterField[], name: string): FilterField | undefined {
  const wanted = lower(name);
  return (
    fields.find((field) => field.key === name) ??
    fields.find(
      (field) =>
        lower(field.key) === wanted ||
        lower(field.label) === wanted ||
        (field.synonyms ?? []).some((synonym) => lower(synonym) === wanted),
    )
  );
}

/** The three parts a chip shows: field, operator and value, each in words. */
export function filterParts(
  filter: FilterDraft,
  fields: readonly FilterField[],
): { field: string; operator: string; value: string } {
  const field = fields.find((candidate) => candidate.key === filter.field);
  const value = String(filter.value);
  return {
    field: field?.label ?? filter.field,
    operator: operatorLabel(filter.operator, field?.type),
    value:
      field?.type === "enum"
        ? (field.options?.find((option) => option.value === value)?.label ?? value)
        : value,
  };
}

/** A filter as one sentence: "Status is Failed". */
export function describeFilter(filter: FilterDraft, fields: readonly FilterField[]): string {
  const parts = filterParts(filter, fields);
  return `${parts.field} ${parts.operator} ${parts.value}`;
}

const DATE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/;

/**
 * A calendar date as `YYYY-MM-DD`, or null. Only year-month-day: "03/04/2025"
 * means a different day on each side of the Atlantic, so it is not guessed at.
 */
export function normaliseDate(text: string): string | null {
  const match = DATE.exec(text.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A number as typed, allowing thousands separators: "1,200" is 1200. */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/,(?=\d{3}(?:\D|$))/g, "");
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** A raw value as the field's type, or null when it is not one. */
export function coerceValue(field: FilterField, raw: unknown): string | number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;
  switch (field.type) {
    case "number":
      return typeof raw === "number" ? (Number.isFinite(raw) ? raw : null) : parseNumber(text);
    case "date":
      return normaliseDate(text);
    case "enum": {
      const wanted = lower(text);
      const option =
        field.options?.find((candidate) => candidate.value === text) ??
        field.options?.find(
          (candidate) => lower(candidate.value) === wanted || lower(candidate.label) === wanted,
        );
      return option ? option.value : null;
    }
    case "text":
      return text;
  }
}

/**
 * Checks a filter against the fields and puts it in canonical form, or
 * returns null when it cannot be one.
 *
 * Meant for a parser's output, which for a model is untrusted: the field may be
 * named by label rather than key, a number may arrive as a string, an enum by
 * its label, and `>` on a date means `after`. Anything that still does not fit
 * — an unknown field, an operator the type does not take, a value that is not
 * one of the options — is refused rather than shown as a chip that can never
 * match.
 */
export function normaliseFilter(
  filter: FilterDraft,
  fields: readonly FilterField[],
): FilterDraft | null {
  // Typed, but a model's output only claims to be.
  const candidate = filter as Partial<FilterDraft> | null;
  if (typeof candidate?.field !== "string") return null;
  const field = findField(fields, candidate.field);
  if (!field) return null;
  let operator = filter.operator;
  if (field.type === "date" && operator === ">") operator = "after";
  if (field.type === "date" && operator === "<") operator = "before";
  if (!OPERATORS[field.type].includes(operator)) return null;
  const value = coerceValue(field, filter.value);
  if (value === null) return null;
  return { field: field.key, operator, value };
}
