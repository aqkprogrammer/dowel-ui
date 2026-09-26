import { describe, expect, it, vi } from "vitest";

import { ExpressionError, parseExpression, tokenize } from "./expression";
import { evaluateExpression, formatExpressionValue, runExpression } from "./expression-eval";
import {
  defaultExpressionFunctions,
  ExpressionArgumentError,
  type ExpressionFunctions,
  type ExpressionVariables,
} from "./expression-functions";

const VARIABLES: ExpressionVariables = {
  price: 12,
  qty: 3,
  discount: 0.1,
  empty: null,
  items: [4, 1, 7],
  user: { age: 36, name: "Ada" },
};

/** The value, or the error's message, kind and range. */
function run(source: string, variables = VARIABLES, functions?: ExpressionFunctions) {
  const result = runExpression(source, { variables, functions });
  if (result.ok) return result.value;
  const { message, kind, start, end, suggestion } = result.error;
  return { message, kind, start, end, suggestion };
}

function syntax(source: string) {
  try {
    parseExpression(source);
  } catch (thrown) {
    expect(thrown).toBeInstanceOf(ExpressionError);
    const error = thrown as ExpressionError;
    return { message: error.message, kind: error.kind, start: error.start, end: error.end };
  }
  throw new Error(`Expected ${source} not to parse`);
}

describe("tokenize", () => {
  it("covers every character, so the source can be painted back exactly", () => {
    const source = "round(price, 2) >= 10 && user.age != 'x' @ 😀 \"open";
    const tokens = tokenize(source);
    expect(tokens.map((token) => token.text).join("")).toBe(source);
    tokens.forEach((token, index) => {
      expect(source.slice(token.start, token.end)).toBe(token.text);
      if (index > 0) expect(token.start).toBe(tokens[index - 1]?.end);
    });
  });

  it("types each token", () => {
    const meaningful = tokenize("round (price, 2) >= 10 and user.age != 'x' or TRUE")
      .filter((token) => token.type !== "whitespace")
      .map((token) => [token.type, token.text]);
    expect(meaningful).toEqual([
      ["function", "round"],
      ["paren", "("],
      ["identifier", "price"],
      ["comma", ","],
      ["number", "2"],
      ["paren", ")"],
      ["operator", ">="],
      ["number", "10"],
      ["operator", "and"],
      ["identifier", "user.age"],
      ["operator", "!="],
      ["string", "'x'"],
      ["operator", "or"],
      ["boolean", "TRUE"],
    ]);
  });

  it("reads numbers, escapes and names in any script", () => {
    expect(
      tokenize("1.5e3 .5 42")
        .filter((t) => t.type === "number")
        .map((t) => t.text),
    ).toEqual(["1.5e3", ".5", "42"]);
    expect(tokenize(String.raw`"say \"hi\""`)[0]?.type).toBe("string");
    expect(tokenize("größe_2")[0]).toMatchObject({ type: "identifier", text: "größe_2" });
  });

  it("keeps a trailing dot on a half-typed path", () => {
    expect(tokenize("user.")[0]).toMatchObject({ type: "identifier", text: "user.", end: 5 });
  });

  it("turns what it cannot read into error tokens with a reason", () => {
    expect(tokenize("'open")[0]).toMatchObject({
      type: "error",
      start: 0,
      end: 5,
      message: "This text has no closing '.",
    });
    expect(tokenize("a & b")[2]?.message).toBe("Unexpected character &. Use && or and.");
    expect(tokenize("a | b")[2]?.message).toBe("Unexpected character |. Use || or or.");
    expect(tokenize("😀")[0]).toMatchObject({ type: "error", text: "😀", start: 0, end: 2 });
  });
});

describe("parseExpression", () => {
  it("builds calls, dotted paths and spelling-independent operators", () => {
    expect(parseExpression("round(user.age, 1)")).toMatchObject({
      type: "call",
      name: "round",
      nameEnd: 5,
      start: 0,
      end: 18,
      args: [
        { type: "identifier", name: "user.age", path: ["user", "age"], start: 6, end: 14 },
        { type: "number", value: 1 },
      ],
    });
    expect(parseExpression("a = b")).toMatchObject({ operator: "==", operatorStart: 2 });
    expect(parseExpression("a && b")).toMatchObject({ operator: "and" });
    expect(parseExpression("a <> b")).toMatchObject({ operator: "!=" });
    expect(parseExpression("! a")).toMatchObject({ type: "unary", operator: "not" });
    expect(parseExpression("'it\\'s'")).toMatchObject({ type: "string", value: "it's" });
    expect(parseExpression("False")).toMatchObject({ type: "boolean", value: false });
  });

  it.each([
    ["2 + 3 * 4", 14],
    ["(2 + 3) * 4", 20],
    ["10 - 4 - 3", 3],
    ["2 ^ 3 ^ 2", 512],
    ["-2 ^ 2", -4],
    ["2 ^ -1 * 4", 2],
    ["7 % 4 * 2", 6],
    ["not 1 > 2", true],
    ["true or false and false", true],
    ["!(1 = 1) || 2 <= 2", true],
  ])("gives %s the usual precedence", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  it.each([
    ["min(price, 3", "Expected ) to close ( at 4.", 3, 4],
    ["(1 + 2", "Expected ) to close ( at 1.", 0, 1],
    ["price *", "Expected a value after *.", 6, 7],
    ["price * * 2", "Expected a value between * and *.", 6, 9],
    ["(1 + )", "Expected a value after +.", 3, 4],
    ["price qty", "Expected an operator before qty.", 6, 9],
    ["round(price 2)", "Expected , or ) before 2.", 12, 13],
    ["(price 2)", "Expected an operator or ) before 2.", 7, 8],
    ["()", "Expected a value inside ( ).", 0, 2],
    ["min(1,)", "Expected a value after ,.", 5, 6],
    ["min(1,", "Expected a value after ,.", 5, 6],
    ["min(,1)", "Expected a value before ,.", 4, 5],
    [")", "Unexpected ) with no ( to close.", 0, 1],
    ["1)", "Unexpected ) with no ( to close.", 1, 2],
    ["* 2", "Expected a value before *.", 0, 1],
    ["user.", "Expected a field name after user.", 0, 5],
    ["math.round(1)", "Function names cannot contain a dot: math.round.", 0, 10],
    ["1 < 2 < 3", "Comparisons cannot be chained. Join them with and: a < b and b < c.", 6, 7],
    ["'open", "This text has no closing '.", 0, 5],
    ["1e400", "This number is too large.", 0, 5],
    ["price @ 2", "Unexpected character @.", 6, 7],
  ])("says what is wrong with %s, and where", (source, message, start, end) => {
    expect(syntax(source)).toEqual({ message, kind: "syntax", start, end });
  });

  it("allows a parenthesised comparison to be compared again", () => {
    expect(() => parseExpression("(1 < 2) = true")).not.toThrow();
  });

  it("calls an empty source empty rather than wrong", () => {
    expect(syntax("")).toMatchObject({ kind: "empty", message: "Enter an expression." });
    expect(syntax("   ")).toMatchObject({ kind: "empty" });
  });

  it("refuses input nested past its limit instead of overflowing the stack", () => {
    const deep = `${"(".repeat(5000)}1${")".repeat(5000)}`;
    expect(syntax(deep).message).toBe("This expression is too complex to evaluate.");
    expect(syntax(`1${"+1".repeat(1000)}`).message).toBe(
      "This expression is too complex to evaluate.",
    );
    expect(syntax(`${"- ".repeat(1000)}1`).kind).toBe("syntax");
    expect(() => parseExpression(`1${"+1".repeat(150)}`)).not.toThrow();
  });
});

describe("evaluateExpression", () => {
  it("evaluates a pricing rule", () => {
    expect(run("price * qty")).toBe(36);
    expect(run("price * qty * (1 - discount)")).toBeCloseTo(32.4);
    expect(run("user.age >= 18 and user.name = 'Ada'")).toBe(true);
  });

  it("evaluates a tree it is handed, with defaults when given no context", () => {
    expect(evaluateExpression(parseExpression("max(2, 5) + 1"))).toBe(6);
  });

  it("joins text with + and compares text in order", () => {
    expect(run("'a' + \"b\"")).toBe("ab");
    expect(run("'abc' < 'abd'")).toBe(true);
    expect(run("'a' != 'b'")).toBe(true);
    expect(run("empty = empty")).toBe(true);
    expect(run("empty = 1")).toBe(false);
  });

  it("runs the default functions", () => {
    expect(run("min(3, 1, 2)")).toBe(1);
    expect(run("max(items, 5)")).toBe(7);
    expect(run("round(2.5)")).toBe(3);
    expect(run("round(-2.5)")).toBe(-3);
    expect(run("round(1.005, 2)")).toBe(1.01);
    expect(run("round(1234, -2)")).toBe(1200);
    expect(run("abs(-4)")).toBe(4);
    expect(run("len('héllo😀')")).toBe(6);
    expect(run("len(items)")).toBe(3);
    expect(run("lower('AbC') + upper('d')")).toBe("abcD");
    expect(run("concat('Total: ', 0.1 + 0.2, ' ', true, empty, items)")).toBe(
      "Total: 0.3 true417",
    );
    expect(run("if(qty > 2, 'bulk', 'single')")).toBe("bulk");
  });

  it("evaluates only the branch if takes, and short-circuits and / or", () => {
    const zero = { ...VARIABLES, qty: 0 };
    expect(run("if(qty = 0, 0, price / qty)", zero)).toBe(0);
    expect(run("qty > 0 and price / qty > 2", zero)).toBe(false);
    expect(run("qty = 0 or price / qty > 2", zero)).toBe(true);
  });

  it("reads null and undefined as nothing", () => {
    expect(run("empty")).toBeNull();
    expect(run("gone", { gone: undefined })).toBeNull();
    expect(run("empty + 1")).toMatchObject({
      message: "Expected a number before +, got nothing.",
      kind: "type",
    });
  });

  it("names an unknown variable and suggests the likely one", () => {
    expect(run("prise * qty")).toEqual({
      message: "Unknown variable prise. Did you mean price?",
      kind: "unknown-variable",
      start: 0,
      end: 5,
      suggestion: "price",
    });
    expect(run("qyt")).toMatchObject({ suggestion: "qty" });
    expect(run("Price")).toMatchObject({ suggestion: "price" });
    expect(run("zebra")).toMatchObject({
      message: "Unknown variable zebra.",
      suggestion: undefined,
    });
  });

  it("underlines the one segment of a path that is wrong", () => {
    expect(run("1 + user.agee")).toEqual({
      message: "user has no field agee. Did you mean user.age?",
      kind: "unknown-variable",
      start: 9,
      end: 13,
      suggestion: "user.age",
    });
    expect(run("price.cents")).toMatchObject({
      message: "price is a number and has no fields.",
      start: 6,
      end: 11,
    });
    expect(run("user")).toMatchObject({
      message: "user holds fields, not a value. Try user.age.",
      suggestion: "user.age",
    });
  });

  it("tells a function from a variable", () => {
    expect(run("round")).toMatchObject({
      message: "round is a function. Call it with parentheses: round(…).",
    });
    expect(run("price(1)")).toMatchObject({
      message: "price is a variable, not a function.",
      kind: "unknown-function",
      start: 0,
      end: 5,
    });
    expect(run("roud(1)")).toMatchObject({
      message: "Unknown function roud. Did you mean round?",
      suggestion: "round",
    });
  });

  it("checks how many arguments a function gets", () => {
    expect(run("abs(1, 2, 3)")).toEqual({
      message: "abs takes 1 argument, got 3.",
      kind: "argument-count",
      start: 7,
      end: 11,
      suggestion: undefined,
    });
    expect(run("round()")).toMatchObject({
      message: "round takes 1 or 2 arguments, got 0.",
      start: 0,
      end: 7,
    });
    expect(run("min()")).toMatchObject({ message: "min takes at least 1 argument, got 0." });
    expect(run("if(true, 1)")).toMatchObject({ message: "if takes 3 arguments, got 2." });
    const range = { between: { evaluate: () => 1, minArgs: 1, maxArgs: 4 } };
    expect(run("between()", {}, range)).toMatchObject({
      message: "between takes 1 to 4 arguments, got 0.",
    });
  });

  it.each([
    ["'a' * 2", "Expected a number before *, got text.", 0, 3],
    ["2 - true", "Expected a number after -, got true/false.", 4, 8],
    ["price + 'x'", "Cannot add a number and text. Use concat() to join them as text.", 0, 11],
    ["1 < 'a'", "Cannot compare a number with text using <.", 0, 7],
    ["1 = '1'", "Cannot compare a number with text.", 0, 7],
    ["items = items", "Cannot compare a list with a list.", 0, 13],
    ["not 1", "Expected true/false after not, got a number.", 4, 5],
    ["-'a'", "Expected a number after -, got text.", 1, 4],
    ["1 and true", "Expected true/false before and, got a number.", 0, 1],
    ["false or 'x'", "Expected true/false after or, got text.", 9, 12],
    ["abs('x')", "abs needs a number, got text.", 4, 7],
    ["lower(1)", "lower needs text, got a number.", 6, 7],
    ["min(1, 'b')", "min needs numbers, got text.", 7, 10],
    ["round(1, 0.5)", "round needs a whole number of digits, -15 to 15.", 9, 12],
    ["if(1, 2, 3)", "if needs true/false as its condition, got a number.", 3, 4],
  ])("reports a type error in %s on the part that is wrong", (source, message, start, end) => {
    expect(run(source)).toMatchObject({ message, kind: "type", start, end });
  });

  it("makes division by zero an error, naming the variable that was zero", () => {
    expect(run("price / qty", { price: 12, qty: 0 })).toEqual({
      message: "Cannot divide by zero (qty is 0).",
      kind: "division-by-zero",
      start: 8,
      end: 11,
      suggestion: undefined,
    });
    expect(run("5 % 0")).toMatchObject({ message: "Cannot divide by zero.", start: 4 });
  });

  it("refuses results outside the finite numbers", () => {
    expect(run("10 ^ 400")).toMatchObject({
      message: "The result of ^ is too large.",
      kind: "out-of-range",
    });
    expect(run("(-8) ^ 0.5")).toMatchObject({
      message: "The result of ^ is not a real number.",
    });
  });

  it("calls custom functions within their declared arity", () => {
    const functions: ExpressionFunctions = {
      tax: (amount) => (amount as number) * 0.2,
      sum: (...values) => values.reduce<number>((total, value) => total + (value as number), 0),
    };
    expect(run("tax(10)", {}, functions)).toBe(2);
    expect(run("tax(1, 2)", {}, functions)).toMatchObject({
      message: "tax takes 1 argument, got 2.",
    });
    expect(run("sum(1, 2, 3)", {}, functions)).toBe(6);
    expect(run("sum()", {}, functions)).toBe(0);
  });

  it("uses the functions it is given instead of the defaults", () => {
    const tax = { tax: (amount: unknown) => amount };
    expect(run("round(1)", {}, tax)).toMatchObject({ kind: "unknown-function" });
    expect(run("round(tax(1.4))", {}, { ...defaultExpressionFunctions, ...tax })).toBe(1);
  });

  it("wraps a function's own failure and checks what it returns", () => {
    const functions: ExpressionFunctions = {
      boom: () => {
        throw new Error("the rate service is down");
      },
      odd: () => {
        // What this case is about: a function that throws something other than an Error.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an error";
      },
      object: () => ({ a: 1 }),
      nothing: () => undefined,
      huge: () => Infinity,
      picky: (a, b) => {
        if (typeof b !== "number")
          throw new ExpressionArgumentError(1, "picky needs a number.");
        return [a, b];
      },
    };
    expect(run("1 + boom()", {}, functions)).toEqual({
      message: "boom failed: the rate service is down",
      kind: "function-failed",
      start: 4,
      end: 10,
      suggestion: undefined,
    });
    expect(run("odd()", {}, functions)).toMatchObject({
      message: "odd failed: it threw a non-error value",
    });
    expect(run("object()", {}, functions)).toMatchObject({
      message: "object returned an object, which an expression cannot use.",
      kind: "type",
    });
    expect(run("nothing()", {}, functions)).toBeNull();
    expect(run("huge()", {}, functions)).toMatchObject({ kind: "out-of-range" });
    expect(run("picky(1, 'x')", {}, functions)).toMatchObject({ start: 9, end: 12 });
    expect(run("picky(1, 2)", {}, functions)).toEqual([1, 2]);
  });

  it("only makes if lazy for the default definition, recognised by identity", () => {
    const copy = { if: { ...defaultExpressionFunctions.if } } as ExpressionFunctions;
    expect(run("if(true, 1, 1 / 0)", {}, copy)).toMatchObject({ kind: "division-by-zero" });
    expect(run("if(true, 1, 1 / 0)")).toBe(1);
  });
});

describe("security", () => {
  it.each([
    ["__proto__", 0, 9],
    ["constructor", 0, 11],
    ["prototype", 0, 9],
    ["user.constructor", 5, 16],
    ["__proto__.polluted", 0, 9],
    ["constructor(1)", 0, 11],
  ])("refuses %s outright", (source, start, end) => {
    expect(run(source)).toMatchObject({ kind: "forbidden", start, end });
  });

  it("never reaches inherited properties or methods", () => {
    expect(run("toString")).toMatchObject({ kind: "unknown-variable" });
    expect(run("valueOf")).toMatchObject({ kind: "unknown-variable" });
    expect(run("user.hasOwnProperty")).toMatchObject({ kind: "unknown-variable" });
    expect(run("toString()")).toMatchObject({ kind: "unknown-function" });
    expect(run("hasOwnProperty('price')")).toMatchObject({ kind: "unknown-function" });
    expect(run("secret", Object.create({ secret: 1 }) as ExpressionVariables)).toMatchObject({
      kind: "unknown-variable",
    });
    const inherited = Object.create(defaultExpressionFunctions) as ExpressionFunctions;
    expect(run("toString()", {}, inherited)).toMatchObject({
      kind: "unknown-function",
    });
  });

  it("does not call getters or read hidden properties", () => {
    const getter = vi.fn(() => 1);
    const variables = Object.defineProperties(
      {},
      {
        secret: { get: getter, enumerable: true },
        hidden: { value: 2, enumerable: false },
      },
    ) as ExpressionVariables;
    expect(run("secret", variables)).toMatchObject({
      message: "secret is computed and cannot be read.",
      kind: "forbidden",
    });
    expect(run("hidden", variables)).toMatchObject({ kind: "unknown-variable" });
    expect(getter).not.toHaveBeenCalled();
  });

  it("does not call functions passed as variables", () => {
    const fn = vi.fn(() => 1);
    expect(run("fn()", { fn })).toMatchObject({
      message: "fn is a variable, not a function.",
    });
    expect(run("fn", { fn })).toMatchObject({
      message: "fn is a function. Pass it in functions to call it.",
      kind: "type",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("treats code in text as text", () => {
    expect(run("'constructor.constructor(\"alert(1)\")()'")).toBe(
      'constructor.constructor("alert(1)")()',
    );
    expect(syntax("constructor.constructor('return 1')()").message).toMatch(
      /Function names cannot contain a dot/,
    );
  });

  it("leaves Object.prototype alone and works on a null-prototype object", () => {
    const variables = Object.assign(Object.create(null) as Record<string, unknown>, { a: 2 });
    expect(run("a * 2", variables)).toBe(4);
    run("__proto__.polluted");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("stops at a list that contains itself", () => {
    const loop: unknown[] = [];
    loop.push(loop);
    expect(run("len(loop)", { loop })).toMatchObject({
      message: "loop is nested too deeply to use.",
    });
    expect(run("big", { big: BigInt(1) })).toMatchObject({
      message: "big holds a bigint, which an expression cannot use.",
    });
  });

  it("uses neither eval nor the Function constructor", () => {
    const sources = import.meta.glob<string>(["./*.ts", "./*.tsx", "!./*.test.*"], {
      eager: true,
      query: "?raw",
      import: "default",
    });
    expect(Object.keys(sources).length).toBeGreaterThan(4);
    for (const source of Object.values(sources)) {
      expect(source).not.toMatch(/\beval\s*\(|new\s+Function\b|\bFunction\s*\(/);
    }
  });
});

describe("formatExpressionValue", () => {
  it("writes each kind of value", () => {
    expect(formatExpressionValue(36, "en-US")).toBe("36");
    expect(formatExpressionValue(0.1 + 0.2, "en-US")).toBe("0.3");
    expect(formatExpressionValue(1234.5, "en-US")).toBe("1,234.5");
    expect(formatExpressionValue("12")).toBe('"12"');
    expect(formatExpressionValue(true)).toBe("true");
    expect(formatExpressionValue(null)).toBe("nothing");
    expect(formatExpressionValue([1, "a"], "en-US")).toBe('[1, "a"]');
  });
});
