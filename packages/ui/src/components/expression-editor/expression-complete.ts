/**
 * What to suggest at the caret: the variables and functions whose names start
 * with what has been typed, each with a preview of what it is.
 *
 * Reads variables through the same own-data-property rule as the evaluator,
 * so a suggestion is never offered for a name that evaluation would refuse.
 */

import { tokenize } from "./expression";
import {
  defaultExpressionFunctions,
  isRecord,
  ownNames,
  readOwn,
  type ExpressionFunctions,
  type ExpressionVariables,
} from "./expression-functions";

export interface ExpressionCompletion {
  /** The full name to insert: `price`, `user.age`, `round`. */
  name: string;
  /**
   * `group` is a variable that holds fields: accepting it inserts `user.` and
   * suggests the fields next. Accepting a `function` inserts `round(`.
   */
  kind: "variable" | "group" | "function";
  /** A preview: the value, `3 fields`, or the function's signature. */
  detail: string;
  description?: string;
}

export interface ExpressionCompletions {
  /** The range the accepted name replaces, `[start, end)`. */
  start: number;
  end: number;
  /** What has been typed so far, from `start` to the caret. */
  prefix: string;
  options: ExpressionCompletion[];
}

export interface ExpressionCompletionOptions {
  variables?: ExpressionVariables;
  functions?: ExpressionFunctions;
  /** Suggest even with nothing typed, as when the list is asked for with Ctrl+Space. */
  explicit?: boolean;
  /** At most this many options. */
  limit?: number;
  /** For the number previews. */
  locale?: string;
}

function preview(
  value: unknown,
  locale?: string,
): { kind: ExpressionCompletion["kind"]; detail: string } {
  if (isRecord(value)) {
    const count = ownNames(value).length;
    return { kind: "group", detail: `${String(count)} ${count === 1 ? "field" : "fields"}` };
  }
  if (Array.isArray(value))
    return { kind: "variable", detail: `list of ${String(value.length)}` };
  if (typeof value === "string") {
    const shown = value.length > 20 ? `${value.slice(0, 19)}…` : value;
    return { kind: "variable", detail: `"${shown}"` };
  }
  if (typeof value === "number") {
    return {
      kind: "variable",
      detail: new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value),
    };
  }
  if (typeof value === "boolean") return { kind: "variable", detail: String(value) };
  return { kind: "variable", detail: "empty" };
}

/** Starts-with matches first, then names that merely contain the text. */
function rank<T extends { name: string }>(items: T[], typed: string, limit: number): T[] {
  const needle = typed.toLowerCase();
  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const leaf = (item.name.split(".").at(-1) ?? item.name).toLowerCase();
    if (leaf.startsWith(needle)) starts.push(item);
    else if (needle.length > 1 && leaf.includes(needle)) contains.push(item);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * The suggestions for a caret position, or `null` when there is nothing to
 * suggest: the caret is not at the end of a name, or nothing matches, or the
 * only match is exactly what is already typed.
 */
export function getExpressionCompletions(
  source: string,
  caret: number,
  {
    variables = {},
    functions = defaultExpressionFunctions,
    explicit = false,
    limit = 50,
    locale,
  }: ExpressionCompletionOptions = {},
): ExpressionCompletions | null {
  const here = tokenize(source).find((token) => token.start < caret && caret <= token.end);
  const name = here?.type === "identifier" || here?.type === "function";

  let start = caret;
  let end = caret;
  if (here && name) {
    start = here.start;
    end = here.end;
  } else if (!explicit) {
    return null;
  } else if (
    here &&
    here.type !== "whitespace" &&
    here.type !== "paren" &&
    here.type !== "comma"
  ) {
    // In text, at the end of a number or a word like "and", a name typed here
    // would join onto what is already there.
    if (here.type !== "operator" || /\p{L}/u.test(here.text)) return null;
  }

  const prefix = source.slice(start, caret);
  const dot = prefix.lastIndexOf(".");
  const typed = prefix.slice(dot + 1);
  const options: ExpressionCompletion[] = [];

  if (dot >= 0) {
    let container: unknown = variables;
    for (const segment of prefix.slice(0, dot).split(".")) {
      const read = isRecord(container) ? readOwn(container, segment) : null;
      container = read?.found ? read.value : undefined;
    }
    if (!isRecord(container)) return null;
    const parent = prefix.slice(0, dot);
    for (const key of ownNames(container)) {
      const read = readOwn(container, key);
      if (!read.found || typeof read.value === "function") continue;
      options.push({ name: `${parent}.${key}`, ...preview(read.value, locale) });
    }
  } else {
    for (const key of ownNames(variables)) {
      const read = readOwn(variables, key);
      if (!read.found || typeof read.value === "function") continue;
      options.push({ name: key, ...preview(read.value, locale) });
    }
    for (const key of ownNames(functions)) {
      const entry = functions[key];
      const definition = typeof entry === "object" ? entry : undefined;
      options.push({
        name: key,
        kind: "function",
        detail: definition?.signature ?? `${key}(…)`,
        description: definition?.description,
      });
    }
  }

  const ranked = rank(options, typed, limit);
  if (ranked.length === 0) return null;
  if (ranked.length === 1 && ranked[0]?.name === prefix && ranked[0].kind !== "group")
    return null;
  return { start, end, prefix, options: ranked };
}
