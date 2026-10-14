import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { applyControlHints, extractProps, parseDefault, type PropsGroup } from "./props";

const dir = mkdtempSync(join(tmpdir(), "dowel-props-"));
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

let counter = 0;
/** Writes `source` to a fresh file and extracts its props. */
function extract(source: string): PropsGroup[] {
  counter += 1;
  const file = join(dir, `fixture-${String(counter)}.tsx`);
  writeFileSync(file, source);
  return extractProps(file);
}

function row(groups: PropsGroup[], prop: string, component?: string) {
  const group = component ? groups.find((entry) => entry.component === component) : groups[0];
  const found = group?.props.find((entry) => entry.name === prop);
  if (!found) throw new Error(`no prop ${prop}`);
  return found;
}

const BUTTON = `
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

const buttonVariants = cva("base", {
  variants: {
    variant: { solid: "", outline: "", ghost: "" },
    pill: { true: "", false: "" },
  },
  defaultVariants: { variant: "solid" },
});

type Origin = "top" | "center";
type Wrapped = Origin;

export interface ButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "color">, VariantProps<typeof buttonVariants> {
  /** Spins while true. */
  loading?: boolean;
  /** Strength, 0–1. */
  intensity?: number;
  label?: string;
  glowColor?: string;
  origin?: Origin;
  wrapped?: Wrapped;
  level?: 1 | 2 | 3;
  offset?: -1 | 0 | 1;
  size?: "sm" | "md" | undefined;
  maybe?: "a" | "b" | null;
  mixed?: "auto" | number;
  onPress?: (value: string) => void;
  items: string[];
  icon?: React.ReactNode;
  flags?: true | false;
}

export function Button({
  loading = false,
  intensity = 0.6,
  label = "Go",
  glowColor = "var(--color-primary)",
  origin = "center",
  level = 2,
  size = "lg",
  mixed = "auto",
  ...props
}: ButtonProps) {
  return null;
}
`;

describe("extractProps controls", () => {
  const groups = extract(BUTTON);

  it("reads cva axes as selects and booleans, with their cva default", () => {
    expect(row(groups, "variant").control).toEqual({
      kind: "select",
      options: ["solid", "outline", "ghost"],
      default: "solid",
    });
    expect(row(groups, "pill").control).toEqual({ kind: "boolean" });
  });

  it("derives booleans, numbers and text from keywords, with literal defaults", () => {
    expect(row(groups, "loading").control).toEqual({ kind: "boolean", default: false });
    expect(row(groups, "intensity").control).toEqual({ kind: "number", default: 0.6 });
    expect(row(groups, "label").control).toEqual({ kind: "text", default: "Go" });
  });

  it("gives props named for a colour a colour control", () => {
    expect(row(groups, "glowColor").control).toEqual({
      kind: "color",
      default: "var(--color-primary)",
    });
  });

  it("follows local aliases, even through another alias", () => {
    expect(row(groups, "origin").control).toEqual({
      kind: "select",
      options: ["top", "center"],
      default: "center",
    });
    expect(row(groups, "wrapped").control).toEqual({
      kind: "select",
      options: ["top", "center"],
    });
  });

  it("reads numeric literal unions, negatives included", () => {
    expect(row(groups, "level").control).toEqual({
      kind: "select",
      options: [1, 2, 3],
      default: 2,
    });
    expect(row(groups, "offset").control).toEqual({ kind: "select", options: [-1, 0, 1] });
  });

  it("ignores undefined and null in a union, and drops a default that is not an option", () => {
    expect(row(groups, "size").control).toEqual({ kind: "select", options: ["sm", "md"] });
    expect(row(groups, "maybe").control).toEqual({ kind: "select", options: ["a", "b"] });
  });

  it("gives no control to mixed unions, functions, arrays and nodes", () => {
    for (const prop of ["mixed", "onPress", "items", "icon"]) {
      expect(row(groups, prop).control).toBeUndefined();
    }
  });

  it("reads true | false as a boolean", () => {
    expect(row(groups, "flags").control).toEqual({ kind: "boolean" });
  });

  it("keeps the table's text type and default alongside the control", () => {
    const intensity = row(groups, "intensity");
    expect(intensity.type).toBe("number");
    expect(intensity.default).toBe("0.6");
    expect(intensity.description).toBe("Strength, 0–1.");
    expect(groups[0]?.element).toBe("button");
    expect(groups[0]?.omitted).toEqual(["color"]);
  });
});

describe("extractProps omissions", () => {
  const groups = extract(`
import type { ComponentPropsWithRef } from "react";
export interface BaseProps { tone?: "a" | "b"; size?: number; keep?: boolean }
export interface BeamProps extends Omit<ComponentPropsWithRef<"span">, "color">, Omit<BaseProps, "size"> {
  /** The beam's colour. */
  color?: string;
}
export function Beam(props: BeamProps) { return null; }
`);

  it("drops what an Omit removes from what it wraps", () => {
    const names = groups[0]?.props.map((prop) => prop.name);
    expect(names).toContain("tone");
    expect(names).toContain("keep");
    expect(names).not.toContain("size");
  });

  it("keeps a prop the component removes from the element and declares itself", () => {
    expect(row(groups, "color")).toMatchObject({
      type: "string",
      description: "The beam's colour.",
      control: { kind: "color" },
    });
    expect(groups[0]?.omitted).toEqual(["color", "size"]);
  });
});

describe("parseDefault", () => {
  it("reads plain literals and nothing else", () => {
    expect(parseDefault("true")).toBe(true);
    expect(parseDefault("false")).toBe(false);
    expect(parseDefault("12")).toBe(12);
    expect(parseDefault("-0.5")).toBe(-0.5);
    expect(parseDefault('"md"')).toBe("md");
    expect(parseDefault("'md'")).toBe("md");
    expect(parseDefault("DEFAULT_PALETTE")).toBeUndefined();
    expect(parseDefault("Math.PI / 2")).toBeUndefined();
    expect(parseDefault("`tpl`")).toBeUndefined();
    expect(parseDefault('"a" + "b"')).toBeUndefined();
  });
});

describe("applyControlHints", () => {
  const groups = extract(`
export interface CardProps { radius?: number; tint?: string; secret?: boolean; mode?: "a" | "b" }
export function Card({ radius = 12, tint = "primary" }: CardProps) { return null; }
export interface CardGroupProps { radius?: number }
export function CardGroup(props: CardGroupProps) { return null; }
`);

  it("returns the groups untouched without hints", () => {
    expect(applyControlHints(groups, undefined, "card")).toBe(groups);
  });

  it("adds a range to a number, in every part that has the prop, keeping its default", () => {
    const hinted = applyControlHints(groups, { radius: { min: 0, max: 48, step: 2 } }, "card");
    expect(row(hinted, "radius", "Card").control).toEqual({
      kind: "number",
      min: 0,
      max: 48,
      step: 2,
      default: 12,
    });
    expect(row(hinted, "radius", "CardGroup").control).toEqual({
      kind: "number",
      min: 0,
      max: 48,
      step: 2,
    });
  });

  it("overrides the kind, keeping a string default, and hides a prop", () => {
    const hinted = applyControlHints(
      groups,
      { tint: { kind: "color" }, secret: { hidden: true } },
      "card",
    );
    expect(row(hinted, "tint", "Card").control).toEqual({ kind: "color", default: "primary" });
    expect(row(hinted, "secret", "Card").control).toBeUndefined();
    // The row itself stays in the table.
    expect(row(hinted, "secret", "Card").type).toBe("boolean");
  });

  it("refuses a hint for a prop that does not exist", () => {
    expect(() => applyControlHints(groups, { radios: { min: 0 } }, "card")).toThrow(
      'card: meta.controls names "radios", which no exported component of it accepts.',
    );
  });

  it("refuses a range on a control that is not a number", () => {
    expect(() => applyControlHints(groups, { mode: { min: 0, max: 1 } }, "card")).toThrow(
      "card: mode: a range hint was given for a select control",
    );
  });
});
