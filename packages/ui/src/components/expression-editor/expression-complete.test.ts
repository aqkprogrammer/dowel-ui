import { describe, expect, it, vi } from "vitest";

import { tokenize } from "./expression";
import { getExpressionCompletions } from "./expression-complete";
import type { ExpressionVariables } from "./expression-functions";
import { paint, visibleRange } from "./expression-highlight";

const VARIABLES: ExpressionVariables = {
  price: 12,
  qty: 3,
  discount: 0.1,
  empty: null,
  items: [4, 1, 7],
  user: { age: 36, name: "Ada" },
};

describe("getExpressionCompletions", () => {
  const complete = (source: string, caret = source.length, explicit = false) =>
    getExpressionCompletions(source, caret, {
      variables: VARIABLES,
      explicit,
      locale: "en-US",
    });

  it("suggests the variables and functions a name starts with, with a preview", () => {
    expect(complete("pr")).toEqual({
      start: 0,
      end: 2,
      prefix: "pr",
      options: [{ name: "price", kind: "variable", detail: "12" }],
    });
    expect(complete("1 + ro")?.options[0]).toEqual({
      name: "round",
      kind: "function",
      detail: "round(value, digits?)",
      description: "Rounds half away from zero",
    });
    expect(complete("u")?.options.map((option) => [option.name, option.kind])).toEqual([
      ["user", "group"],
      ["upper", "function"],
    ]);
  });

  it("previews each kind of value", () => {
    const details = getExpressionCompletions("x", 1, {
      variables: {
        x1: [1, 2],
        x2: "a long piece of text here",
        x3: true,
        x4: null,
        x5: { a: 1 },
      },
      functions: { xf: () => 1 },
    })?.options.map((option) => option.detail);
    expect(details).toEqual([
      "list of 2",
      '"a long piece of tex…"',
      "true",
      "empty",
      "1 field",
      "xf(…)",
    ]);
  });

  it("suggests the fields of a group after a dot", () => {
    expect(complete("user.")?.options.map((option) => option.name)).toEqual([
      "user.age",
      "user.name",
    ]);
    expect(complete("user.n")).toMatchObject({ start: 0, end: 6, prefix: "user.n" });
    expect(complete("price.")).toBeNull();
    expect(complete("nobody.")).toBeNull();
  });

  it("replaces the whole name when the caret is inside it", () => {
    expect(complete("pri + 1", 2)).toMatchObject({ start: 0, end: 3, prefix: "pr" });
  });

  it("ranks names that start with the text above names that contain it", () => {
    const options = getExpressionCompletions("tot", 3, {
      variables: { subtotal: 1, total: 2 },
      functions: {},
    })?.options;
    expect(options?.map((option) => option.name)).toEqual(["total", "subtotal"]);
    expect(
      getExpressionCompletions("t", 1, { variables: { a1t: 1 }, functions: {} }),
    ).toBeNull();
  });

  it("offers nothing when there is nothing useful to offer", () => {
    expect(complete("price")).toBeNull();
    expect(complete("'pri")).toBeNull();
    expect(complete("12")).toBeNull();
    expect(complete("zzz")).toBeNull();
    expect(complete("price + ")).toBeNull();
  });

  it("offers everything on request, but not where a name would collide", () => {
    expect(complete("price * ", 8, true)?.options).toHaveLength(15);
    expect(complete("round(", 6, true)?.prefix).toBe("");
    expect(complete("", 0, true)?.start).toBe(0);
    expect(complete("12", 2, true)).toBeNull();
    expect(complete("true and", 8, true)).toBeNull();
    expect(complete("'a b", 3, true)).toBeNull();
    expect(
      getExpressionCompletions("p", 1, { limit: 1, variables: VARIABLES })?.options,
    ).toHaveLength(1);
  });

  it("never suggests a name evaluation would refuse", () => {
    const getter = vi.fn(() => 1);
    const variables = Object.defineProperty(
      JSON.parse('{"__proto__": 1, "price": 2, "fn": 0}') as Record<string, unknown>,
      "pricey",
      { get: getter, enumerable: true },
    );
    variables.fn = () => 1;
    const names = getExpressionCompletions("", 0, {
      variables,
      explicit: true,
      functions: {},
    })?.options.map((option) => option.name);
    expect(names).toEqual(["price"]);
    expect(getter).not.toHaveBeenCalled();
  });
});

describe("paint", () => {
  it("cuts tokens at the error range and the anchor", () => {
    const text = "price * qty";
    const out = paint(text, tokenize(text), { start: 2, end: 9 }, 8, "|");
    expect(out.filter((part) => part === "|")).toHaveLength(1);
    expect(paint("", [], null, 0, "|")).toEqual(["|"]);
  });

  it("never leaves an error with nothing to underline", () => {
    expect(visibleRange({ start: 3, end: 3 }, 5)).toEqual({ start: 3, end: 4 });
    expect(visibleRange({ start: 5, end: 5 }, 5)).toEqual({ start: 4, end: 5 });
    expect(visibleRange({ start: 9, end: 12 }, 5)).toEqual({ start: 4, end: 5 });
    expect(visibleRange({ start: 0, end: 0 }, 0)).toBeNull();
  });
});
