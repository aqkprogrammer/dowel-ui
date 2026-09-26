/**
 * Values, the rules for reading them safely, and the functions every
 * expression can call unless told otherwise.
 *
 * Kept apart from the evaluator so the completion list reads variables through
 * exactly the same rules evaluation does, and so the default functions can be
 * read, and copied, on their own.
 */

export type ExpressionValue = number | string | boolean | null | readonly ExpressionValue[];

/** Values a name can refer to. Nested objects are reached with dotted paths. */
export type ExpressionVariables = Readonly<Record<string, unknown>>;

export type ExpressionFunction = (...args: ExpressionValue[]) => unknown;

export interface ExpressionFunctionDefinition {
  /** Called with the arguments already evaluated. */
  evaluate: ExpressionFunction;
  /** Fewest arguments it accepts. Defaults to 0. */
  minArgs?: number;
  /** Most arguments it accepts. Defaults to no limit. */
  maxArgs?: number;
  /** How it is called, shown in suggestions: `round(value, digits?)`. */
  signature?: string;
  /** What it does, in a few words. */
  description?: string;
}

/**
 * The allowlist of callable functions. A bare function takes exactly as many
 * arguments as it declares, or any number if it declares none (a rest
 * parameter); a definition states its limits.
 */
export type ExpressionFunctions = Readonly<
  Record<string, ExpressionFunction | ExpressionFunctionDefinition>
>;

/**
 * Thrown by a function to say one of its arguments is wrong, so the error
 * underlines that argument rather than the whole call.
 */
export class ExpressionArgumentError extends Error {
  constructor(
    /** Zero-based position of the argument. */
    public readonly index: number,
    message: string,
  ) {
    super(message);
    this.name = "ExpressionArgumentError";
  }
}

/** Names that lead to an object's machinery rather than its data. */
export const FORBIDDEN_NAMES: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An own, enumerable data property, or nothing. Never walks the prototype
 * chain and never calls a getter, so reading a path cannot run code.
 */
export function readOwn(
  target: object,
  key: string,
): { found: true; value: unknown } | { found: false; accessor: boolean } {
  if (FORBIDDEN_NAMES.has(key)) return { found: false, accessor: false };
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (!descriptor?.enumerable) return { found: false, accessor: false };
  if (!("value" in descriptor)) return { found: false, accessor: true };
  return { found: true, value: descriptor.value };
}

/** Own enumerable names, minus the forbidden ones. */
export function ownNames(target: object): string[] {
  return Object.keys(target).filter((key) => !FORBIDDEN_NAMES.has(key));
}

export function describeType(value: ExpressionValue): string {
  if (value === null) return "nothing";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "number") return "a number";
  if (typeof value === "string") return "text";
  return "true/false";
}

/* ------------------------------------------------------------------ */
/*  Suggestions                                                        */
/* ------------------------------------------------------------------ */

/** Optimal string alignment distance: a swapped pair of letters counts once. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = Array.from({ length: rows * cols }, (_, i) =>
    i < cols ? i : i % cols === 0 ? i / cols : 0,
  );
  const at = (i: number, j: number) => d[i * cols + j] ?? 0;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      d[i * cols + j] = best;
    }
  }
  return at(a.length, b.length);
}

/** The closest candidate, if it is close enough to be a typo rather than a guess. */
export function closestName(name: string, candidates: readonly string[]): string | undefined {
  const lower = name.toLowerCase();
  const limit = Math.max(1, Math.floor(name.length / 3));
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(lower, candidate.toLowerCase());
    if (distance < bestDistance && distance <= limit && distance < name.length) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/*  Default functions                                                  */
/* ------------------------------------------------------------------ */

function numberArg(args: readonly ExpressionValue[], index: number, fn: string): number {
  const value = args[index] ?? null;
  if (typeof value !== "number") {
    throw new ExpressionArgumentError(
      index,
      `${fn} needs a number, got ${describeType(value)}.`,
    );
  }
  return value;
}

function textArg(args: readonly ExpressionValue[], index: number, fn: string): string {
  const value = args[index] ?? null;
  if (typeof value !== "string") {
    throw new ExpressionArgumentError(index, `${fn} needs text, got ${describeType(value)}.`);
  }
  return value;
}

/** Numbers from the arguments, with any list spread into them. */
function numbers(args: readonly ExpressionValue[], fn: string): number[] {
  const found: number[] = [];
  args.forEach((arg, index) => {
    for (const item of Array.isArray(arg) ? arg : [arg]) {
      if (typeof item !== "number") {
        throw new ExpressionArgumentError(
          index,
          `${fn} needs numbers, got ${describeType(item as ExpressionValue)}.`,
        );
      }
      found.push(item);
    }
  });
  if (found.length === 0)
    throw new ExpressionArgumentError(0, `${fn} needs at least one number.`);
  return found;
}

/** A value as text, numbers without binary noise: 0.1 + 0.2 joins as "0.3". */
function textOf(value: ExpressionValue): string {
  if (value === null) return "";
  if (typeof value === "number") return String(Number(value.toPrecision(15)));
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return value.map(textOf).join("");
}

function round(value: number, digits: number): number {
  // Half away from zero, as spreadsheets do; the nudge stops 1.005 rounding to 1.
  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  if (digits >= 0) {
    const factor = 10 ** digits;
    return (sign * Math.round(magnitude * factor * (1 + Number.EPSILON))) / factor;
  }
  const factor = 10 ** -digits;
  return sign * Math.round(magnitude / factor) * factor;
}

/**
 * `if`. The evaluator recognises this definition by identity and evaluates only
 * the branch it takes, so `if(qty = 0, 0, price / qty)` never divides by zero.
 * A copy of it is an ordinary function whose arguments are all evaluated.
 */
export const IF_FUNCTION: ExpressionFunctionDefinition = {
  evaluate: (condition, then, otherwise) => (condition === true ? then : otherwise),
  minArgs: 3,
  maxArgs: 3,
  signature: "if(condition, then, else)",
  description: "then when the condition is true, otherwise else",
};

export const defaultExpressionFunctions: Readonly<
  Record<string, ExpressionFunctionDefinition>
> = Object.freeze({
  min: {
    evaluate: (...args) => Math.min(...numbers(args, "min")),
    minArgs: 1,
    signature: "min(a, b, …)",
    description: "The smallest number",
  },
  max: {
    evaluate: (...args) => Math.max(...numbers(args, "max")),
    minArgs: 1,
    signature: "max(a, b, …)",
    description: "The largest number",
  },
  round: {
    evaluate: (...args) => {
      const value = numberArg(args, 0, "round");
      const digits = args.length > 1 ? numberArg(args, 1, "round") : 0;
      if (!Number.isInteger(digits) || Math.abs(digits) > 15) {
        throw new ExpressionArgumentError(
          1,
          "round needs a whole number of digits, -15 to 15.",
        );
      }
      return round(value, digits);
    },
    minArgs: 1,
    maxArgs: 2,
    signature: "round(value, digits?)",
    description: "Rounds half away from zero",
  },
  abs: {
    evaluate: (...args) => Math.abs(numberArg(args, 0, "abs")),
    minArgs: 1,
    maxArgs: 1,
    signature: "abs(value)",
    description: "The number without its sign",
  },
  if: IF_FUNCTION,
  len: {
    evaluate: (...args) => {
      const value = args[0] ?? null;
      if (Array.isArray(value)) return value.length;
      // Characters as people count them: an emoji is one, not two.
      return [...textArg(args, 0, "len")].length;
    },
    minArgs: 1,
    maxArgs: 1,
    signature: "len(text)",
    description: "How many characters, or items in a list",
  },
  lower: {
    evaluate: (...args) => textArg(args, 0, "lower").toLowerCase(),
    minArgs: 1,
    maxArgs: 1,
    signature: "lower(text)",
    description: "The text in lower case",
  },
  upper: {
    evaluate: (...args) => textArg(args, 0, "upper").toUpperCase(),
    minArgs: 1,
    maxArgs: 1,
    signature: "upper(text)",
    description: "The text in upper case",
  },
  concat: {
    evaluate: (...args) => args.map(textOf).join(""),
    minArgs: 1,
    signature: "concat(a, b, …)",
    description: "Joins values into one piece of text",
  },
});
