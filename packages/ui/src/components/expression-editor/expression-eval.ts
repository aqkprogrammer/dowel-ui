/**
 * Evaluates a parsed expression against the values and functions it is given,
 * and nothing else.
 *
 * The safety comes from what is absent rather than from filtering: there is no
 * `eval` and no `Function` constructor, so the source is never JavaScript. A
 * name is looked up only among the own, enumerable data properties of the
 * `variables` object — never on its prototype, never through a getter — and
 * `__proto__`, `constructor` and `prototype` are refused outright wherever they
 * appear in a path. A call runs only a function that is an own property of the
 * `functions` allowlist, so `toString()` is an unknown function, not a method.
 *
 * Division by zero is an error, not `Infinity`. A formula that divides by a
 * quantity of zero has almost always hit a case its author did not think of,
 * and `Infinity` saved into a price or passed to an API hides that until
 * something downstream breaks. `if(qty = 0, 0, price / qty)` is the way to say
 * what should happen instead, and `if` only evaluates the branch it takes. For
 * the same reason any arithmetic that leaves the finite numbers is an error.
 */

import { ExpressionError, parseExpression, type ExpressionNode } from "./expression";
import {
  closestName,
  defaultExpressionFunctions,
  describeType,
  ExpressionArgumentError,
  FORBIDDEN_NAMES,
  IF_FUNCTION,
  isRecord,
  ownNames,
  readOwn,
  type ExpressionFunction,
  type ExpressionFunctions,
  type ExpressionValue,
  type ExpressionVariables,
} from "./expression-functions";

export interface ExpressionContext {
  variables?: ExpressionVariables;
  /** Replaces the defaults. Spread `defaultExpressionFunctions` to add to them. */
  functions?: ExpressionFunctions;
}

export type ExpressionResult =
  | { ok: true; value: ExpressionValue; ast: ExpressionNode }
  | { ok: false; error: ExpressionError; ast: ExpressionNode | null };

/* ------------------------------------------------------------------ */
/*  Evaluation                                                         */
/* ------------------------------------------------------------------ */

interface Callable {
  evaluate: ExpressionFunction;
  min: number;
  max: number;
  lazy: boolean;
}

/** Lists nest; a list that contains itself has to stop somewhere. */
const MAX_LIST_DEPTH = 32;

function fail(
  message: string,
  kind: ExpressionError["kind"],
  at: { start: number; end: number },
  suggestion?: string,
): never {
  throw new ExpressionError(message, kind, at.start, at.end, suggestion);
}

/** Converts something from outside — a variable, a function's return — into a value. */
function toValue(raw: unknown, what: string, at: ExpressionNode, depth = 0): ExpressionValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean")
    return raw;
  if (Array.isArray(raw)) {
    if (depth > MAX_LIST_DEPTH) fail(`${what} is nested too deeply to use.`, "type", at);
    return raw.map((item: unknown) => toValue(item, what, at, depth + 1));
  }
  if (typeof raw === "function") {
    fail(`${what} is a function. Pass it in functions to call it.`, "type", at);
  }
  if (isRecord(raw)) {
    const first = ownNames(raw)[0];
    fail(
      `${what} holds fields, not a value.${first ? ` Try ${what}.${first}.` : ""}`,
      "type",
      at,
      first ? `${what}.${first}` : undefined,
    );
  }
  return fail(`${what} holds a ${typeof raw}, which an expression cannot use.`, "type", at);
}

function argumentCount(name: string, min: number, max: number): string {
  const plural = (n: number) => (n === 1 ? "argument" : "arguments");
  if (min === max) return `${name} takes ${String(min)} ${plural(min)}`;
  if (max === Infinity) return `${name} takes at least ${String(min)} ${plural(min)}`;
  const joiner = max === min + 1 ? " or " : " to ";
  return `${name} takes ${String(min)}${joiner}${String(max)} arguments`;
}

function order<T extends number | string>(
  operator: "<" | "<=" | ">" | ">=",
  a: T,
  b: T,
): boolean {
  if (operator === "<") return a < b;
  if (operator === "<=") return a <= b;
  if (operator === ">") return a > b;
  return a >= b;
}

class Evaluator {
  private readonly variables: ExpressionVariables;
  private readonly functions: ExpressionFunctions;

  constructor(context: ExpressionContext) {
    this.variables = context.variables ?? {};
    this.functions = context.functions ?? defaultExpressionFunctions;
  }

  run(node: ExpressionNode): ExpressionValue {
    switch (node.type) {
      case "number":
      case "string":
      case "boolean":
        return node.value;
      case "identifier":
        return this.lookup(node);
      case "unary":
        return this.unary(node);
      case "binary":
        return this.binary(node);
      case "call":
        return this.call(node);
    }
  }

  private lookup(node: Extract<ExpressionNode, { type: "identifier" }>): ExpressionValue {
    let container: unknown = this.variables;
    let offset = node.start;
    let raw: unknown;

    node.path.forEach((segment, index) => {
      const at = { start: offset, end: offset + segment.length };
      const parent = node.path.slice(0, index).join(".");
      offset += segment.length + 1;

      if (FORBIDDEN_NAMES.has(segment)) {
        fail(`${segment} cannot be used as a name.`, "forbidden", at);
      }
      if (!isRecord(container)) {
        fail(
          `${parent} is ${describeType(toValue(container, parent, node))} and has no fields.`,
          "type",
          at,
        );
      }
      const read = readOwn(container, segment);
      if (read.found) {
        container = raw = read.value;
        return;
      }
      if (read.accessor) {
        fail(
          `${[parent, segment].filter(Boolean).join(".")} is computed and cannot be read.`,
          "forbidden",
          at,
        );
      }
      const suggestion = closestName(segment, ownNames(container));
      if (index === 0) {
        if (Object.hasOwn(this.functions, segment) && node.path.length === 1) {
          fail(
            `${segment} is a function. Call it with parentheses: ${segment}(…).`,
            "unknown-variable",
            at,
          );
        }
        fail(
          `Unknown variable ${segment}.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
          "unknown-variable",
          at,
          suggestion,
        );
      }
      const full = suggestion ? `${parent}.${suggestion}` : undefined;
      fail(
        `${parent} has no field ${segment}.${full ? ` Did you mean ${full}?` : ""}`,
        "unknown-variable",
        at,
        full,
      );
    });

    return toValue(raw, node.name, node);
  }

  private resolve(node: Extract<ExpressionNode, { type: "call" }>): Callable {
    const at = { start: node.start, end: node.nameEnd };
    if (FORBIDDEN_NAMES.has(node.name))
      fail(`${node.name} cannot be used as a name.`, "forbidden", at);

    const entry = Object.hasOwn(this.functions, node.name)
      ? this.functions[node.name]
      : undefined;
    if (typeof entry === "function") {
      return { evaluate: entry, min: entry.length, max: entry.length || Infinity, lazy: false };
    }
    if (entry && typeof entry === "object" && typeof entry.evaluate === "function") {
      return {
        evaluate: entry.evaluate,
        min: entry.minArgs ?? 0,
        max: entry.maxArgs ?? Infinity,
        lazy: entry === IF_FUNCTION,
      };
    }
    if (readOwn(this.variables, node.name).found) {
      fail(`${node.name} is a variable, not a function.`, "unknown-function", at);
    }
    const suggestion = closestName(node.name, ownNames(this.functions));
    return fail(
      `Unknown function ${node.name}.${suggestion ? ` Did you mean ${suggestion}?` : ""}`,
      "unknown-function",
      at,
      suggestion,
    );
  }

  private call(node: Extract<ExpressionNode, { type: "call" }>): ExpressionValue {
    const fn = this.resolve(node);
    const count = node.args.length;
    if (count < fn.min || count > fn.max) {
      const extra = node.args.slice(fn.max);
      const at =
        extra.length > 0
          ? { start: extra[0]?.start ?? node.start, end: extra.at(-1)?.end ?? node.end }
          : node;
      fail(
        `${argumentCount(node.name, fn.min, fn.max)}, got ${String(count)}.`,
        "argument-count",
        at,
      );
    }

    if (fn.lazy) {
      const [condition, then, otherwise] = node.args as [
        ExpressionNode,
        ExpressionNode,
        ExpressionNode,
      ];
      const test = this.run(condition);
      if (typeof test !== "boolean") {
        fail(
          `${node.name} needs true/false as its condition, got ${describeType(test)}.`,
          "type",
          condition,
        );
      }
      return this.run(test ? then : otherwise);
    }

    const args = node.args.map((arg) => this.run(arg));
    let returned: unknown;
    try {
      returned = fn.evaluate(...args);
    } catch (thrown) {
      if (thrown instanceof ExpressionArgumentError) {
        fail(thrown.message, "type", node.args[thrown.index] ?? node);
      }
      // Anything else is the function's own failure, whatever it threw: its
      // ranges, if it has any, belong to some other source.
      const reason = thrown instanceof Error ? thrown.message : "it threw a non-error value";
      fail(`${node.name} failed: ${reason}`, "function-failed", node);
    }
    if (
      isRecord(returned) ||
      typeof returned === "function" ||
      typeof returned === "bigint" ||
      typeof returned === "symbol"
    ) {
      const what = isRecord(returned) ? "an object" : `a ${typeof returned}`;
      fail(`${node.name} returned ${what}, which an expression cannot use.`, "type", node);
    }
    const value = toValue(returned, `${node.name}(…)`, node);
    if (typeof value === "number" && !Number.isFinite(value)) {
      fail(`${node.name} returned a number too large to use.`, "out-of-range", node);
    }
    return value;
  }

  private unary(node: Extract<ExpressionNode, { type: "unary" }>): ExpressionValue {
    const value = this.run(node.operand);
    if (node.operator === "-") {
      if (typeof value !== "number") {
        fail(`Expected a number after -, got ${describeType(value)}.`, "type", node.operand);
      }
      return -value;
    }
    if (typeof value !== "boolean") {
      fail(`Expected true/false after not, got ${describeType(value)}.`, "type", node.operand);
    }
    return !value;
  }

  private binary(node: Extract<ExpressionNode, { type: "binary" }>): ExpressionValue {
    const { operator } = node;
    const symbol = operator === "==" ? "=" : operator;

    if (operator === "and" || operator === "or") {
      const left = this.run(node.left);
      if (typeof left !== "boolean") {
        fail(
          `Expected true/false before ${operator}, got ${describeType(left)}.`,
          "type",
          node.left,
        );
      }
      // Short-circuits, so `qty > 0 and price / qty > 2` is safe when qty is 0.
      if (operator === "and" ? !left : left) return left;
      const right = this.run(node.right);
      if (typeof right !== "boolean") {
        fail(
          `Expected true/false after ${operator}, got ${describeType(right)}.`,
          "type",
          node.right,
        );
      }
      return right;
    }

    const left = this.run(node.left);
    const right = this.run(node.right);

    if (operator === "==" || operator === "!=") {
      if (
        left !== null &&
        right !== null &&
        (Array.isArray(left) || Array.isArray(right) || typeof left !== typeof right)
      ) {
        fail(`Cannot compare ${describeType(left)} with ${describeType(right)}.`, "type", node);
      }
      return operator === "==" ? left === right : left !== right;
    }

    if (operator === "<" || operator === "<=" || operator === ">" || operator === ">=") {
      if (typeof left === "number" && typeof right === "number")
        return order(operator, left, right);
      if (typeof left === "string" && typeof right === "string")
        return order(operator, left, right);
      fail(
        `Cannot compare ${describeType(left)} with ${describeType(right)} using ${symbol}.`,
        "type",
        node,
      );
    }

    if (operator === "+" && typeof left === "string" && typeof right === "string")
      return left + right;
    if (operator === "+" && (typeof left === "string" || typeof right === "string")) {
      fail(
        `Cannot add ${describeType(left)} and ${describeType(right)}. Use concat() to join them as text.`,
        "type",
        node,
      );
    }
    if (typeof left !== "number") {
      fail(`Expected a number before ${symbol}, got ${describeType(left)}.`, "type", node.left);
    }
    if (typeof right !== "number") {
      fail(
        `Expected a number after ${symbol}, got ${describeType(right)}.`,
        "type",
        node.right,
      );
    }
    if ((operator === "/" || operator === "%") && right === 0) {
      const named = node.right.type === "identifier" ? ` (${node.right.name} is 0)` : "";
      fail(`Cannot divide by zero${named}.`, "division-by-zero", node.right);
    }

    const result =
      operator === "+"
        ? left + right
        : operator === "-"
          ? left - right
          : operator === "*"
            ? left * right
            : operator === "/"
              ? left / right
              : operator === "%"
                ? left % right
                : left ** right;

    if (Number.isNaN(result))
      fail(`The result of ${symbol} is not a real number.`, "out-of-range", node);
    if (!Number.isFinite(result))
      fail(`The result of ${symbol} is too large.`, "out-of-range", node);
    return result;
  }
}

/**
 * Evaluates a parsed expression. Throws an `ExpressionError` with the range to
 * underline; an error thrown by a function in the allowlist is wrapped in one.
 */
export function evaluateExpression(
  ast: ExpressionNode,
  context: ExpressionContext = {},
): ExpressionValue {
  return new Evaluator(context).run(ast);
}

/** Parses and evaluates in one step, and never throws an `ExpressionError`. */
export function runExpression(
  source: string,
  context: ExpressionContext = {},
): ExpressionResult {
  let ast: ExpressionNode | null = null;
  try {
    ast = parseExpression(source);
    return { ok: true, value: evaluateExpression(ast, context), ast };
  } catch (thrown) {
    if (thrown instanceof ExpressionError) return { ok: false, error: thrown, ast };
    throw thrown;
  }
}

/**
 * A value as the result line shows it: numbers formatted for the locale with
 * no binary noise, text in quotes so "12" and 12 look different.
 */
export function formatExpressionValue(value: ExpressionValue, locale?: string): string {
  if (value === null) return "nothing";
  if (typeof value === "number") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(value);
  }
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return String(value);
  return `[${value.map((item) => formatExpressionValue(item, locale)).join(", ")}]`;
}
