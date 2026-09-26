/**
 * The default parser: text in, filters out, with no model and no network.
 */

import {
  coerceValue,
  lower,
  type FilterDraft,
  type FilterField,
  type FilterFieldType,
  type FilterOperator,
  type FilterOption,
  type FilterParser,
  type ParsedFilter,
} from "./nl-filter-model";

type Intent =
  "is" | "not" | "contains" | "gt" | "lt" | "gte" | "lte" | "before" | "after" | "on";

const INTENTS: Record<FilterFieldType, Partial<Record<Intent, FilterOperator>>> = {
  text: { is: "is", not: "is not", contains: "contains" },
  enum: { is: "is", not: "is not" },
  number: { is: "is", not: "is not", gt: ">", lt: "<", gte: ">=", lte: "<=" },
  date: {
    is: "is",
    on: "is",
    not: "is not",
    gt: "after",
    after: "after",
    lt: "before",
    before: "before",
    gte: ">=",
    lte: "<=",
  },
};

function resolve(intent: Intent, type: FilterFieldType): FilterOperator | null {
  return INTENTS[type][intent] ?? null;
}

// A leading colon is GitHub's style ("created:>2024-01-01"), so it is optional
// in front of any symbol.
const SYMBOL_OPERATOR = /\s*(:?(?:!=|>=|<=|==|[≠≥≤<>=~!])|:)\s*/uy;

function symbolIntent(symbol: string): Intent {
  const bare = symbol.length > 1 && symbol.startsWith(":") ? symbol.slice(1) : symbol;
  if (bare === "!=" || bare === "≠" || bare === "!") return "not";
  if (bare === ">=" || bare === "≥") return "gte";
  if (bare === "<=" || bare === "≤") return "lte";
  if (bare === ">") return "gt";
  if (bare === "<") return "lt";
  if (bare === "~") return "contains";
  return "is";
}

const WORD_INTENTS: [string, Intent][] = [
  ["is not equal to", "not"],
  ["not equal to", "not"],
  ["does not equal", "not"],
  ["doesn't equal", "not"],
  ["is not", "not"],
  ["isn't", "not"],
  ["not", "not"],
  ["is equal to", "is"],
  ["equal to", "is"],
  ["equals", "is"],
  ["is", "is"],
  ["contains", "contains"],
  ["containing", "contains"],
  ["includes", "contains"],
  ["like", "contains"],
  ["greater than", "gt"],
  ["more than", "gt"],
  ["over", "gt"],
  ["above", "gt"],
  ["exceeds", "gt"],
  ["less than", "lt"],
  ["fewer than", "lt"],
  ["under", "lt"],
  ["below", "lt"],
  ["at least", "gte"],
  ["no less than", "gte"],
  ["at most", "lte"],
  ["no more than", "lte"],
  ["up to", "lte"],
  ["before", "before"],
  ["earlier than", "before"],
  ["prior to", "before"],
  ["until", "lte"],
  ["after", "after"],
  ["later than", "after"],
  ["since", "gte"],
  ["on", "on"],
];

function escape(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

/** A phrase as a pattern: any run of spaces between its words, any case. */
function phrase(text: string): string {
  return text.trim().split(/\s+/).map(escape).join("\\s+");
}

// A word ends where letters and digits do, so "status" never matches the
// start of "statuses".
const END = "(?![\\p{L}\\p{N}_])";

const WORD_OPERATOR = new RegExp(
  `\\s+(${[
    ...WORD_INTENTS.map(([words]) => words),
    // "is over", "is before": the "is" adds nothing, so it is allowed in front
    // of any operator that does not start with it already.
    ...WORD_INTENTS.filter(([words]) => !words.startsWith("is")).map(
      ([words]) => `is ${words}`,
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .map(phrase)
    .join("|")})(?=\\s|$)\\s*`,
  "iuy",
);

function wordIntent(words: string): Intent {
  const normal = lower(words)
    .replace(/\s+/g, " ")
    .replace(/^is (?!not|equal)/, "");
  return WORD_INTENTS.find(([candidate]) => candidate === normal)?.[1] ?? "is";
}

const QUOTES: Record<string, string> = { '"': '"', "“": "”" };
const SEPARATOR = /[\s,;]+/uy;
const WHITESPACE = /\s+/uy;
// A comma inside a number ("1,200") belongs to it; anywhere else it separates.
const RAW_WORD = /(?:[^\s,;"“]|,(?=\d))+/uy;
const NEGATION = /not\s+/iuy;

interface Name {
  field: FilterField;
  pattern: RegExp;
  synonym: boolean;
}

interface OptionName {
  field: FilterField;
  option: FilterOption;
  pattern: RegExp;
}

interface Word {
  text: string;
  /** Could be dropped: a connecting word, or one the caller said to ignore. */
  droppable: boolean;
}

type Match =
  { kind: "filter"; filter: FilterDraft; end: number } | { kind: "failed"; end: number };

function sticky(text: string): RegExp {
  return new RegExp(phrase(text) + END, "iuy");
}

function byLength<T extends { length: number }>(a: T, b: T): number {
  return b.length - a.length;
}

function namesOf(fields: readonly FilterField[]): Name[] {
  const seen = new Set<string>();
  const names: (Name & { length: number })[] = [];
  for (const field of fields) {
    const own = [field.label, field.key].map((text) => ({ text, synonym: false }));
    const synonyms = (field.synonyms ?? []).map((text) => ({ text, synonym: true }));
    for (const { text, synonym } of [...own, ...synonyms]) {
      const key = lower(text).replace(/\s+/g, " ");
      if (key.length === 0 || seen.has(key)) continue;
      seen.add(key);
      names.push({ field, pattern: sticky(text), synonym, length: key.length });
    }
  }
  // Longest first, so "created at" wins over "created". The sort is stable,
  // so between names of the same length the earlier field wins.
  return names.sort(byLength);
}

function optionNamesOf(fields: readonly FilterField[]): OptionName[] {
  const names: (OptionName & { length: number })[] = [];
  for (const field of fields) {
    if (field.type !== "enum") continue;
    for (const option of field.options ?? []) {
      for (const text of new Set([option.label, option.value])) {
        if (text.trim().length === 0) continue;
        names.push({ field, option, pattern: sticky(text), length: text.length });
      }
    }
  }
  return names.sort(byLength);
}

function readQuoted(text: string, position: number): { raw: string; end: number } | null {
  const close = QUOTES[text.charAt(position)];
  if (!close) return null;
  const end = text.indexOf(close, position + 1);
  return end === -1
    ? { raw: text.slice(position + 1), end: text.length }
    : { raw: text.slice(position + 1, end), end: end + 1 };
}

function readRaw(text: string, position: number): { raw: string; end: number } | null {
  RAW_WORD.lastIndex = position;
  const match = RAW_WORD.exec(text);
  if (!match) return null;
  // Sentence punctuation is not part of a value: "branch:main." is main.
  const raw = match[0].replace(/(?<=.)[.!?)]+$/u, "");
  return { raw, end: RAW_WORD.lastIndex };
}

function readValue(
  text: string,
  position: number,
  field: FilterField,
  options: readonly OptionName[],
): { value: string | number | null; end: number } | null {
  const quoted = readQuoted(text, position);
  if (quoted) return { value: coerceValue(field, quoted.raw), end: quoted.end };
  if (field.type === "enum") {
    for (const entry of options) {
      if (entry.field !== field) continue;
      entry.pattern.lastIndex = position;
      if (entry.pattern.test(text)) {
        return { value: entry.option.value, end: entry.pattern.lastIndex };
      }
    }
  }
  const raw = readRaw(text, position);
  return raw ? { value: coerceValue(field, raw.raw), end: raw.end } : null;
}

function startsSomethingElse(
  text: string,
  position: number,
  names: readonly Name[],
  options: readonly OptionName[],
): boolean {
  const word = readRaw(text, position);
  if (word && CONNECTIVES.has(lower(word.raw))) return true;
  return [...names, ...options].some((entry) => {
    entry.pattern.lastIndex = position;
    return entry.pattern.test(text);
  });
}

/** A field name at `position`, then an operator, then a value. */
function matchFilter(
  text: string,
  position: number,
  names: readonly Name[],
  options: readonly OptionName[],
): Match | null {
  for (const name of names) {
    name.pattern.lastIndex = position;
    if (!name.pattern.test(text)) continue;
    const { field } = name;
    let cursor = name.pattern.lastIndex;
    let operator: FilterOperator | null;
    let explicit = true;

    SYMBOL_OPERATOR.lastIndex = cursor;
    const symbol = SYMBOL_OPERATOR.exec(text);
    WORD_OPERATOR.lastIndex = cursor;
    const words = symbol ? null : WORD_OPERATOR.exec(text);
    if (symbol) {
      operator = resolve(symbolIntent(symbol[1] ?? ":"), field.type);
      cursor = SYMBOL_OPERATOR.lastIndex;
    } else if (words) {
      operator = resolve(wordIntent(words[1] ?? ""), field.type);
      // "branch on main" is not Branch on-date main; let the words fall
      // through to be read another way.
      if (!operator) continue;
      cursor = WORD_OPERATOR.lastIndex;
    } else {
      // No operator at all: "status failed", "duration 3", "on main". Only when
      // the value proves the reading, or the name is a synonym written to be
      // used this way.
      if (field.type === "text" && !name.synonym) continue;
      WHITESPACE.lastIndex = cursor;
      if (!WHITESPACE.test(text)) continue;
      cursor = WHITESPACE.lastIndex;
      // "filter by status": with "by" a synonym for Author, the next word is
      // another field, not an author called "status".
      if (field.type === "text" && startsSomethingElse(text, cursor, names, options)) continue;
      operator = "is";
      explicit = false;
    }

    const read = cursor < text.length ? readValue(text, cursor, field, options) : null;
    if (!operator || !read || read.value === null) {
      if (!explicit) continue;
      // An operator says a filter was meant. Refuse it whole, so the notice
      // shows "status:unknown" rather than two unrelated words.
      return { kind: "failed", end: read?.end ?? cursor };
    }
    return {
      kind: "filter",
      filter: { field: field.key, operator, value: read.value },
      end: read.end,
    };
  }
  return null;
}

/** An enum option on its own — "failed", "not cancelled" — or quoted. */
function matchOption(
  text: string,
  position: number,
  options: readonly OptionName[],
): Match | null {
  NEGATION.lastIndex = position;
  const negated = NEGATION.test(text);
  const start = negated ? NEGATION.lastIndex : position;
  const operator: FilterOperator = negated ? "is not" : "is";

  const quoted = readQuoted(text, start);
  if (quoted) {
    const wanted = lower(quoted.raw);
    const entry = options.find(
      (candidate) =>
        lower(candidate.option.label) === wanted || lower(candidate.option.value) === wanted,
    );
    return entry
      ? {
          kind: "filter",
          filter: { field: entry.field.key, operator, value: entry.option.value },
          end: quoted.end,
        }
      : null;
  }

  for (const entry of options) {
    entry.pattern.lastIndex = start;
    if (entry.pattern.test(text)) {
      return {
        kind: "filter",
        filter: { field: entry.field.key, operator, value: entry.option.value },
        end: entry.pattern.lastIndex,
      };
    }
  }
  return null;
}

/** Words that join a query together and mean nothing once the filters are out. */
const CONNECTIVES = new Set(
  "and or with where whose which that are is the a an all any only show me find list get filter by & && | || - +".split(
    " ",
  ),
);

function isDroppable(word: string, ignore: ReadonlySet<string>): boolean {
  const bare = lower(word).replace(/^[^\p{L}\p{N}&|+-]+|[^\p{L}\p{N}&|+-]+$/gu, "");
  if (CONNECTIVES.has(bare) || ignore.has(bare)) return true;
  return bare.endsWith("s") && ignore.has(bare.slice(0, -1));
}

/** A run of unread words, less the connecting words at either end of it. */
function trimRun(run: Word[]): string {
  let start = 0;
  let end = run.length;
  while (start < end && run[start]?.droppable) start += 1;
  while (end > start && run[end - 1]?.droppable) end -= 1;
  return run
    .slice(start, end)
    .map((word) => word.text)
    .join(" ");
}

export interface FilterParserOptions {
  /**
   * More words to drop when nothing else claims them — usually what the rows
   * are called, so "failed deploys" does not report "deploys" as not
   * understood. A trailing "s" is allowed for.
   */
  ignore?: string[];
}

function parseWith(
  text: string,
  fields: readonly FilterField[],
  ignore: ReadonlySet<string>,
): ParsedFilter {
  const names = namesOf(fields);
  const options = optionNamesOf(fields);
  const filters: FilterDraft[] = [];
  const runs: Word[][] = [[]];
  let position = 0;

  for (;;) {
    SEPARATOR.lastIndex = position;
    if (SEPARATOR.test(text)) position = SEPARATOR.lastIndex;
    if (position >= text.length) break;

    const match =
      matchFilter(text, position, names, options) ?? matchOption(text, position, options);
    if (match?.kind === "filter") {
      filters.push(match.filter);
      runs.push([]);
      position = match.end;
      continue;
    }

    const end =
      match?.end ??
      readQuoted(text, position)?.end ??
      readRaw(text, position)?.end ??
      position + 1;
    const word = text.slice(position, end).trim();
    runs.at(-1)?.push({
      text: word,
      droppable: match === null && isDroppable(word, ignore),
    });
    position = end;
  }

  const unparsed = runs
    .map(trimRun)
    .filter((run) => run.length > 0)
    .join(" ");
  return unparsed.length > 0 ? { chips: filters, unparsed } : { chips: filters };
}

/**
 * The default parser: no model, no network, and the same answer every time.
 *
 * Reads `field:value`, `field>3`, `field!=x`, `field:"two words"`, and the same
 * in words — "duration over 3", "status is not failed", "created before
 * 2025-01-01". A field is named by its label, key or a synonym, in any case.
 * An enum option on its own is enough ("failed" is Status is Failed; "not
 * failed" is Status is not Failed). Everything else comes back as `unparsed`,
 * less the connecting words around it.
 *
 * It deliberately does not guess. "this week" needs a clock and a calendar,
 * "main" could be any text field's value; both come back unparsed, for the
 * person to rephrase or for an app's own parser to handle.
 */
export function parseFilterText(text: string, fields: FilterField[]): ParsedFilter {
  return parseWith(text, fields, new Set());
}

/** The default parser, with options. */
export function createFilterParser(options: FilterParserOptions = {}): FilterParser {
  const ignore = new Set((options.ignore ?? []).map(lower));
  return (text, fields) => parseWith(text, fields, ignore);
}
