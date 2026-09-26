/**
 * The formula language: a tokenizer and a Pratt parser.
 *
 * Small on purpose. Numbers, text in single or double quotes, true and false,
 * names with dotted paths (`user.age`), calls (`round(price, 2)`), the
 * arithmetic operators, comparisons, and `and` / `or` / `not` alongside their
 * `&&` / `||` / `!` spellings. No assignment, no loops, no member access by
 * computed key — nothing that could reach past the values it is given. What a
 * name means is the evaluator's business; see `expression-eval.ts`.
 *
 * The tokenizer never throws. It covers every character of the source, so the
 * editor can highlight half-typed input, and anything it cannot read becomes an
 * `error` token that carries its own message. The parser throws an
 * `ExpressionError` with the character range to underline.
 */

export type ExpressionTokenType =
  | "number"
  | "string"
  | "boolean"
  | "identifier"
  | "function"
  | "operator"
  | "paren"
  | "comma"
  | "whitespace"
  | "error";

export interface ExpressionToken {
  type: ExpressionTokenType;
  /** The source text, exactly as written. */
  text: string;
  /** Offset of the first character. */
  start: number;
  /** Offset after the last character: the range is `[start, end)`. */
  end: number;
  /** Why an `error` token could not be read. */
  message?: string;
}

export type ExpressionErrorKind =
  | "empty"
  | "syntax"
  | "unknown-variable"
  | "unknown-function"
  | "argument-count"
  | "type"
  | "division-by-zero"
  | "out-of-range"
  | "forbidden"
  | "function-failed";

/**
 * Everything that can go wrong, with where. `start` and `end` are offsets into
 * the source, `[start, end)`, so the editor can underline exactly the part
 * that is wrong.
 */
export class ExpressionError extends Error {
  constructor(
    message: string,
    public readonly kind: ExpressionErrorKind,
    public readonly start: number,
    public readonly end: number,
    /** A name that probably was meant, for "Did you mean …?". */
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = "ExpressionError";
  }
}

export type ExpressionBinaryOperator =
  "+" | "-" | "*" | "/" | "%" | "^" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";

interface NodeRange {
  start: number;
  end: number;
}

export type ExpressionNode =
  | (NodeRange & { type: "number"; value: number })
  | (NodeRange & { type: "string"; value: string })
  | (NodeRange & { type: "boolean"; value: boolean })
  | (NodeRange & {
      type: "identifier";
      /** The whole name as written: `user.age`. */
      name: string;
      /** Its segments: `["user", "age"]`. */
      path: string[];
    })
  | (NodeRange & {
      type: "call";
      name: string;
      /** Where the name ends, so an error can underline just the name. */
      nameEnd: number;
      args: ExpressionNode[];
    })
  | (NodeRange & { type: "unary"; operator: "-" | "not"; operand: ExpressionNode })
  | (NodeRange & {
      type: "binary";
      /** Spelling-independent: `=` is `==`, `&&` is `and`, `<>` is `!=`. */
      operator: ExpressionBinaryOperator;
      left: ExpressionNode;
      right: ExpressionNode;
      /** Where the operator itself sits. */
      operatorStart: number;
      operatorEnd: number;
    });

/* ------------------------------------------------------------------ */
/*  Tokenizer                                                          */
/* ------------------------------------------------------------------ */

const WHITESPACE = /\s+/y;
const NUMBER = /(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/y;
// A trailing dot is kept on the name so "user." reads as one half-typed path:
// the parser can say what is missing and autocomplete can offer the fields.
const NAME = /[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*\.?/uy;
const OPERATORS = [
  "==",
  "!=",
  "<>",
  "<=",
  ">=",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "=",
  "<",
  ">",
  "!",
];
const WORD_OPERATORS = new Set(["and", "or", "not"]);
const BOOLEANS = new Set(["true", "false"]);
const CALL_AHEAD = /\s*\(/y;

function match(pattern: RegExp, source: string, at: number): string | null {
  pattern.lastIndex = at;
  const found = pattern.exec(source);
  return found ? found[0] : null;
}

/** Reads a quoted string from its opening quote. */
function readString(source: string, start: number): ExpressionToken {
  const quote = source[start] ?? '"';
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) {
      return { type: "string", text: source.slice(start, index + 1), start, end: index + 1 };
    }
    index += 1;
  }
  const end = source.length;
  return {
    type: "error",
    text: source.slice(start, end),
    start,
    end,
    message: `This text has no closing ${quote}.`,
  };
}

/**
 * Splits a source into tokens that cover every character, whitespace and
 * unreadable characters included, so the result can be rendered back as the
 * exact source. Never throws.
 */
export function tokenize(source: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index] ?? "";
    const start = index;

    const space = match(WHITESPACE, source, index);
    if (space) {
      tokens.push({ type: "whitespace", text: space, start, end: (index += space.length) });
      continue;
    }

    if (char === '"' || char === "'") {
      const token = readString(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    const number = match(NUMBER, source, index);
    if (number) {
      tokens.push({ type: "number", text: number, start, end: (index += number.length) });
      continue;
    }

    const name = match(NAME, source, index);
    if (name) {
      index += name.length;
      const lower = name.toLowerCase();
      let type: ExpressionTokenType = "identifier";
      if (BOOLEANS.has(lower)) type = "boolean";
      else if (WORD_OPERATORS.has(lower)) type = "operator";
      else if (match(CALL_AHEAD, source, index)) type = "function";
      tokens.push({ type, text: name, start, end: index });
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", text: char, start, end: (index += 1) });
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", text: char, start, end: (index += 1) });
      continue;
    }

    const operator = OPERATORS.find((candidate) => source.startsWith(candidate, index));
    if (operator) {
      tokens.push({ type: "operator", text: operator, start, end: (index += operator.length) });
      continue;
    }

    // One code point, not one UTF-16 unit, so an emoji is one bad character.
    const bad = String.fromCodePoint(source.codePointAt(index) ?? 0);
    const hint = char === "&" ? " Use && or and." : char === "|" ? " Use || or or." : "";
    tokens.push({
      type: "error",
      text: bad,
      start,
      end: (index += bad.length),
      message: `Unexpected character ${bad}.${hint}`,
    });
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/** Deeper than any formula a person writes, and far short of the call stack. */
const MAX_DEPTH = 200;

const BINARY: Record<string, { power: number; operator: ExpressionBinaryOperator }> = {
  or: { power: 10, operator: "or" },
  "||": { power: 10, operator: "or" },
  and: { power: 20, operator: "and" },
  "&&": { power: 20, operator: "and" },
  "=": { power: 30, operator: "==" },
  "==": { power: 30, operator: "==" },
  "!=": { power: 30, operator: "!=" },
  "<>": { power: 30, operator: "!=" },
  "<": { power: 30, operator: "<" },
  "<=": { power: 30, operator: "<=" },
  ">": { power: 30, operator: ">" },
  ">=": { power: 30, operator: ">=" },
  "+": { power: 40, operator: "+" },
  "-": { power: 40, operator: "-" },
  "*": { power: 50, operator: "*" },
  "/": { power: 50, operator: "/" },
  "%": { power: 50, operator: "%" },
  "^": { power: 70, operator: "^" },
};
const COMPARISON = 30;
/*
 * `not` binds looser than a comparison, as in Python and SQL, so
 * `not price > 10` means `not (price > 10)`. The C reading, `(not price) > 10`,
 * compares true/false with a number, which is always a type error here.
 */
const NOT_POWER = 25;
// Above * and below ^, so -2^2 is -(2^2) = -4, as written in mathematics.
const NEGATE_POWER = 60;

function quote(token: ExpressionToken): string {
  return token.text.length > 24 ? `${token.text.slice(0, 23)}…` : token.text;
}

function decodeString(text: string): string {
  const body = text.slice(1, -1);
  return body.replace(/\\(.)/gs, (_, escaped: string) =>
    escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped === "r" ? "\r" : escaped,
  );
}

type Range = { start: number; end: number };

class Parser {
  private index = 0;
  private depth = 0;
  private readonly depths = new WeakMap<ExpressionNode, number>();

  constructor(private readonly tokens: ExpressionToken[]) {}

  parse(): ExpressionNode {
    const node = this.expression(0);
    const extra = this.peek();
    if (extra) {
      throw extra.text === ")"
        ? this.error("Unexpected ) with no ( to close.", extra)
        : this.error(`Expected an operator before ${quote(extra)}.`, extra);
    }
    return node;
  }

  private peek(): ExpressionToken | undefined {
    return this.tokens[this.index];
  }

  private previous(): ExpressionToken | undefined {
    return this.tokens[this.index - 1];
  }

  private error(message: string, at: Range): ExpressionError {
    return new ExpressionError(message, "syntax", at.start, at.end);
  }

  private tooDeep(at: Range): ExpressionError {
    return this.error("This expression is too complex to evaluate.", at);
  }

  /** Records how deep a node is, and refuses before the evaluator could overflow. */
  private node(node: ExpressionNode, ...children: ExpressionNode[]): ExpressionNode {
    const depth = 1 + Math.max(0, ...children.map((child) => this.depths.get(child) ?? 1));
    if (depth > MAX_DEPTH) throw this.tooDeep(node);
    this.depths.set(node, depth);
    return node;
  }

  /** A value was due and `token` came instead. Says so about whatever preceded it. */
  private missing(token: ExpressionToken): ExpressionError {
    const before = this.previous();
    if (before?.text === "(" && token.text === ")") {
      return this.error("Expected a value inside ( ).", {
        start: before.start,
        end: token.end,
      });
    }
    if (before?.type === "comma") return this.error("Expected a value after ,.", before);
    if (token.text === ")") return this.error("Unexpected ) with no ( to close.", token);
    return this.error(`Expected a value before ${token.text}.`, token);
  }

  private expression(minPower: number): ExpressionNode {
    this.depth += 1;
    if (this.depth > MAX_DEPTH)
      throw this.tooDeep(this.peek() ?? this.previous() ?? { start: 0, end: 0 });

    let left = this.prefix();
    let chainedComparison = false;

    for (;;) {
      const token = this.peek();
      if (token?.type !== "operator") break;
      const binary = BINARY[token.text.toLowerCase()];
      if (!binary || binary.power <= minPower) break;

      if (binary.power === COMPARISON && chainedComparison) {
        throw this.error(
          "Comparisons cannot be chained. Join them with and: a < b and b < c.",
          token,
        );
      }
      this.index += 1;
      // ^ is right-associative: 2^3^2 is 2^(3^2).
      const right = this.operand(
        binary.operator === "^" ? binary.power - 1 : binary.power,
        token,
      );
      left = this.node(
        {
          type: "binary",
          operator: binary.operator,
          left,
          right,
          start: left.start,
          end: right.end,
          operatorStart: token.start,
          operatorEnd: token.end,
        },
        left,
        right,
      );
      chainedComparison = binary.power === COMPARISON;
    }

    this.depth -= 1;
    return left;
  }

  /** The value after an operator, or a message about the operator if there is none. */
  private operand(power: number, operator: ExpressionToken): ExpressionNode {
    const next = this.peek();
    if (!next || next.text === ")" || next.type === "comma") {
      throw this.error(`Expected a value after ${operator.text}.`, operator);
    }
    if (next.type === "operator" && BINARY[next.text.toLowerCase()] && next.text !== "-") {
      throw this.error(`Expected a value between ${operator.text} and ${next.text}.`, {
        start: operator.start,
        end: next.end,
      });
    }
    return this.expression(power);
  }

  private prefix(): ExpressionNode {
    const token = this.peek();
    if (!token) {
      const previous = this.previous();
      throw previous
        ? this.error(`Expected a value after ${previous.text}.`, previous)
        : new ExpressionError("Enter an expression.", "empty", 0, 0);
    }

    switch (token.type) {
      case "number": {
        this.index += 1;
        const value = Number(token.text);
        if (!Number.isFinite(value)) throw this.error("This number is too large.", token);
        return this.node({ type: "number", value, start: token.start, end: token.end });
      }
      case "string":
        this.index += 1;
        return this.node({
          type: "string",
          value: decodeString(token.text),
          start: token.start,
          end: token.end,
        });
      case "boolean":
        this.index += 1;
        return this.node({
          type: "boolean",
          value: token.text.toLowerCase() === "true",
          start: token.start,
          end: token.end,
        });
      case "identifier":
        this.index += 1;
        if (token.text.endsWith(".")) {
          throw this.error(`Expected a field name after ${token.text}`, token);
        }
        return this.node({
          type: "identifier",
          name: token.text,
          path: token.text.split("."),
          start: token.start,
          end: token.end,
        });
      case "function":
        this.index += 1;
        return this.call(token);
      case "paren":
        if (token.text === ")") throw this.missing(token);
        this.index += 1;
        return this.group(token);
      case "comma":
        throw this.missing(token);
      case "operator": {
        const word = token.text.toLowerCase();
        if (word !== "-" && word !== "not" && word !== "!") throw this.missing(token);
        this.index += 1;
        const operand = this.operand(word === "-" ? NEGATE_POWER : NOT_POWER, token);
        return this.node(
          {
            type: "unary",
            operator: word === "-" ? "-" : "not",
            operand,
            start: token.start,
            end: operand.end,
          },
          operand,
        );
      }
      case "error":
      case "whitespace":
        // Both are removed before parsing; unreadable input is reported first.
        throw this.error(token.message ?? `Unexpected ${token.text}.`, token);
    }
  }

  private close(open: ExpressionToken, expected: string): ExpressionToken {
    const next = this.peek();
    if (next?.text === ")") {
      this.index += 1;
      return next;
    }
    if (next) throw this.error(`Expected ${expected} before ${quote(next)}.`, next);
    throw this.error(`Expected ) to close ( at ${String(open.start + 1)}.`, open);
  }

  private group(open: ExpressionToken): ExpressionNode {
    const inner = this.expression(0);
    this.close(open, "an operator or )");
    // The group's range is the inner node's: parentheses change grouping, not meaning.
    return inner;
  }

  private call(name: ExpressionToken): ExpressionNode {
    if (name.text.includes(".")) {
      throw this.error(`Function names cannot contain a dot: ${name.text}.`, name);
    }
    const open = this.peek() ?? name;
    this.index += 1;

    const args: ExpressionNode[] = [];
    if (this.peek()?.text !== ")") {
      for (;;) {
        const next = this.peek();
        if (!next) {
          const previous = this.previous();
          if (previous?.type === "comma")
            throw this.error("Expected a value after ,.", previous);
          break;
        }
        if (next.type === "comma" || next.text === ")") throw this.missing(next);
        args.push(this.expression(0));
        if (this.peek()?.type !== "comma") break;
        this.index += 1;
      }
    }
    const close = this.close(open, ", or )");
    return this.node(
      {
        type: "call",
        name: name.text,
        nameEnd: name.end,
        args,
        start: name.start,
        end: close.end,
      },
      ...args,
    );
  }
}

/**
 * Parses a source into a tree, or throws an `ExpressionError` saying what is
 * wrong and where. A character the tokenizer could not read is reported
 * before any grammar problem, because it is usually the cause of one.
 */
export function parseExpression(source: string): ExpressionNode {
  const tokens = tokenize(source);
  const unreadable = tokens.find((token) => token.type === "error");
  if (unreadable) {
    throw new ExpressionError(
      unreadable.message ?? `Unexpected ${unreadable.text}.`,
      "syntax",
      unreadable.start,
      unreadable.end,
    );
  }
  const meaningful = tokens.filter((token) => token.type !== "whitespace");
  return new Parser(meaningful).parse();
}
