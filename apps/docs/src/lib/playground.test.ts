import { describe, expect, it } from "vitest";

import type { GeneratedControl } from "./controls.generated";
import type { StoryMeta } from "./story-types";

const derived = {
  beam: [
    {
      prop: "tone",
      kind: "select",
      options: ["primary", "brand", "info"],
      default: "primary",
    },
    { prop: "glow", kind: "boolean" },
    { prop: "interactive", kind: "boolean", default: true },
    { prop: "duration", kind: "number", min: 1000, max: 15000, step: 500, default: 6000 },
    { prop: "seed", kind: "number", default: 7 },
    { prop: "level", kind: "select", options: [1, 2, 3], default: 2 },
    { prop: "color", kind: "color" },
    { prop: "label", kind: "text" },
    { prop: "asChild", kind: "boolean" },
    { prop: "id", kind: "text" },
  ],
} satisfies Record<string, GeneratedControl[]>;

import {
  controlsFor,
  decodeOverrides,
  encodeOverrides,
  generateJsx,
  hasRange,
  initialValue,
  MAX_TEXT_PARAM,
} from "./playground";

function meta(argTypes: StoryMeta["argTypes"]): StoryMeta {
  return { argTypes, controlsDisabled: false, decorators: [] };
}

describe("controlsFor", () => {
  it("derives controls from the registry, leaving out props no control should set", () => {
    const controls = controlsFor(derived.beam, undefined);
    expect(controls.map((control) => control.prop)).toEqual([
      // Choices first, free text last.
      "level",
      "tone",
      "glow",
      "interactive",
      "duration",
      "seed",
      "color",
      "label",
    ]);
    const duration = controls.find((control) => control.prop === "duration");
    expect(duration).toMatchObject({ kind: "number", min: 1000, max: 15000, step: 500 });
    expect(duration && hasRange(duration)).toBe(true);
    const seed = controls.find((control) => control.prop === "seed");
    expect(seed && hasRange(seed)).toBe(false);
  });

  it("lets a story's argTypes narrow options, tighten a range, add a control or hide one", () => {
    const controls = controlsFor(
      derived.beam,
      meta({
        tone: { control: "inline-radio", options: ["primary", "brand"], disabled: false },
        duration: { control: "range", min: 2000, max: 4000, disabled: false },
        glow: { control: "boolean", disabled: true },
        extra: { control: "text", disabled: false },
      }),
    );
    expect(controls.find((control) => control.prop === "tone")).toMatchObject({
      options: ["primary", "brand"],
      fallback: "primary",
    });
    expect(controls.find((control) => control.prop === "duration")).toMatchObject({
      min: 2000,
      max: 4000,
      step: 500,
      fallback: 6000,
    });
    expect(controls.some((control) => control.prop === "glow")).toBe(false);
    expect(controls.find((control) => control.prop === "extra")).toMatchObject({
      kind: "text",
    });
  });

  it("ignores a select argType with fewer than two options and nothing to fall back on", () => {
    const controls = controlsFor(
      undefined,
      meta({ size: { control: "select", options: ["md"], disabled: false } }),
    );
    expect(controls).toEqual([]);
  });
});

describe("initialValue", () => {
  const [level, tone, glow, interactive, duration, seed, , label] = controlsFor(
    derived.beam,
    undefined,
  );
  it("prefers the story's value, then the component's default", () => {
    if (!tone || !duration) throw new Error("missing");
    expect(initialValue(tone, { tone: "info" })).toBe("info");
    expect(initialValue(tone, {})).toBe("primary");
    expect(initialValue(duration, {})).toBe(6000);
    expect(level && initialValue(level, {})).toBe(2);
  });

  it("starts booleans off and everything else unset when nothing says otherwise", () => {
    if (!glow || !label || !seed || !interactive) throw new Error("missing");
    expect(initialValue(glow, {})).toBe(false);
    expect(initialValue(interactive, {})).toBe(true);
    expect(initialValue(label, {})).toBeUndefined();
    // A story's non-primitive arg is not a control value.
    expect(initialValue(label, { label: { nested: true } })).toBeUndefined();
  });
});

describe("generateJsx", () => {
  const controls = controlsFor(derived.beam, undefined);

  it("leaves out defaults and unset values", () => {
    expect(
      generateJsx(
        "Beam",
        { tone: "primary", duration: 6000, glow: false, label: undefined, level: 2 },
        controls,
        "Go",
      ),
    ).toBe("<Beam>Go</Beam>");
  });

  it("writes numbers as expressions, booleans bare, and false only against a true default", () => {
    expect(
      generateJsx("Beam", { level: 3, glow: true, interactive: false }, controls, "Go"),
    ).toBe("<Beam level={3} glow interactive={false}>Go</Beam>");
  });

  it("self-closes a tag with no children, wrapping when long", () => {
    expect(generateJsx("Beam", {}, controls, "")).toBe("<Beam />");
    expect(generateJsx("Beam", { glow: true, level: 1 }, controls, "")).toBe(
      "<Beam level={1} glow />",
    );
    expect(
      generateJsx(
        "Beam",
        { tone: "brand", duration: 2500, color: "var(--color-info)", label: "Launch now" },
        controls,
        "",
      ),
    ).toBe(
      [
        "<Beam",
        '  tone="brand"',
        "  duration={2500}",
        '  color="var(--color-info)"',
        '  label="Launch now"',
        "/>",
      ].join("\n"),
    );
  });

  it("quotes strings safely and wraps long tags", () => {
    const code = generateJsx(
      "Beam",
      { tone: "brand", label: 'Say "hi"', color: "var(--color-info)", duration: 2500 },
      controls,
      "Go",
    );
    expect(code).toBe(
      [
        "<Beam",
        '  tone="brand"',
        "  duration={2500}",
        '  color="var(--color-info)"',
        '  label={"Say \\"hi\\""}',
        ">",
        "  Go",
        "</Beam>",
      ].join("\n"),
    );
  });
});

describe("URL state", () => {
  const controls = controlsFor(derived.beam, undefined);

  it("round-trips every kind of value through the query string", () => {
    const overrides = {
      tone: "brand",
      level: 3,
      glow: true,
      interactive: false,
      duration: 2500,
      color: "oklch(0.7 0.1 250)",
      label: "Launch",
    };
    const params = new URLSearchParams(encodeOverrides(overrides, controls));
    expect(params.get("p.glow")).toBe("1");
    expect(params.get("p.interactive")).toBe("0");
    expect(decodeOverrides(params, controls)).toEqual(overrides);
  });

  it("only writes props that have a control", () => {
    expect(encodeOverrides({ onClick: "x", tone: "info", glow: undefined }, controls)).toEqual([
      ["p.tone", "info"],
    ]);
  });

  it("rejects values a control could not have chosen", () => {
    const params = new URLSearchParams({
      "p.tone": "neon",
      "p.level": "7",
      "p.glow": "yes",
      "p.seed": "Infinity",
      "p.duration": "",
      "p.color": "red;background:url(https://evil.example/x)",
      "p.label": "x".repeat(MAX_TEXT_PARAM + 1),
      "p.asChild": "1",
      "p.id": "main",
    });
    expect(decodeOverrides(params, controls)).toEqual({});
  });

  it("clamps a number to its slider's range and keeps an unranged number as given", () => {
    const params = new URLSearchParams({ "p.duration": "99999", "p.seed": "-4.5" });
    expect(decodeOverrides(params, controls)).toEqual({ duration: 15000, seed: -4.5 });
  });

  it("matches number options by their text and returns them as numbers", () => {
    expect(decodeOverrides(new URLSearchParams({ "p.level": "1" }), controls)).toEqual({
      level: 1,
    });
  });
});
