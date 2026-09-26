import { describe, expect, it } from "vitest";

import {
  describePoint,
  describeSeries,
  planTones,
  scrubIndexFromKey,
  sonifierDuration,
  valueToFrequency,
} from "./sonify";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRODUCTION = { label: "Production", values: [12, 42, 18, null, 25, 3, 17] };
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const REVENUE = {
  label: "Revenue",
  values: [3.4, 3.1, 4.0, 4.6, 5.2, 5.9, 6.4, 7.1, 8.3, 9.8, 9.1, 9.5],
};

describe("valueToFrequency", () => {
  it("maps the range onto two octaves, exponentially", () => {
    expect(valueToFrequency(0, 0, 100)).toBe(220);
    expect(valueToFrequency(100, 0, 100)).toBe(880);
    // Halfway in value is halfway in pitch — one octave up, not the linear 550 Hz.
    expect(valueToFrequency(50, 0, 100)).toBeCloseTo(440);
    expect(valueToFrequency(25, 0, 100)).toBeCloseTo(220 * Math.SQRT2);
  });

  it("clamps values outside the range", () => {
    expect(valueToFrequency(-10, 0, 100)).toBe(220);
    expect(valueToFrequency(500, 0, 100)).toBe(880);
  });

  it("puts a flat series in the middle and takes its own pitch range", () => {
    expect(valueToFrequency(7, 7, 7)).toBeCloseTo(440);
    expect(valueToFrequency(10, 0, 10, { low: 100, high: 400 })).toBe(400);
  });

  it("gives a missing value no pitch", () => {
    expect(valueToFrequency(Number.NaN, 0, 10)).toBeNaN();
    expect(valueToFrequency(Infinity, 0, 10)).toBeNaN();
  });
});

describe("planTones", () => {
  it("spaces a tone per point evenly across the duration, leaving a gap between notes", () => {
    const tones = planTones([0, 50, 100, 50], { durationMs: 1000 });
    expect(tones.map((tone) => tone.start)).toEqual([0, 250, 500, 750]);
    expect(tones.map((tone) => tone.index)).toEqual([0, 1, 2, 3]);
    expect(tones[0]?.duration).toBeCloseTo(212.5);
    expect(tones.map((tone) => Math.round(tone.frequency))).toEqual([220, 440, 880, 440]);
    expect(tones.every((tone) => !tone.missing)).toBe(true);
  });

  it("keeps a missing value's slot and marks it with a short low click", () => {
    const tones = planTones([1, null, Number.NaN, 3], { durationMs: 2000 });
    expect(tones[1]).toEqual({
      index: 1,
      start: 500,
      duration: 40,
      frequency: 110,
      missing: true,
    });
    expect(tones[2]?.missing).toBe(true);
    expect(tones[3]?.frequency).toBe(880);
  });

  it("uses a shared scale when given one", () => {
    const [tone] = planTones([50], { durationMs: 100, min: 0, max: 100, low: 200, high: 800 });
    expect(tone?.frequency).toBeCloseTo(400);
  });

  it("plans nothing for no values or no time", () => {
    expect(planTones([], { durationMs: 1000 })).toEqual([]);
    expect(planTones([1, 2], { durationMs: 0 })).toEqual([]);
  });
});

describe("sonifierDuration", () => {
  it("gives each point its time, up to a cap", () => {
    expect(sonifierDuration(7)).toBe(2100);
    expect(sonifierDuration(7, "slow")).toBe(3500);
    expect(sonifierDuration(7, "fast")).toBe(1050);
    expect(sonifierDuration(365)).toBe(12_000);
  });
});

describe("describeSeries", () => {
  it("says the span, range, trend and extremes in one sentence", () => {
    expect(describeSeries(REVENUE, MONTHS)).toBe(
      "Revenue: 12 points from Jan to Dec, ranging from 3.1 to 9.8, rising overall, highest at Oct, lowest at Feb.",
    );
  });

  it("says falling, or no clear trend", () => {
    const falling = { label: "Queue", values: [...REVENUE.values].reverse() };
    expect(describeSeries(falling, MONTHS)).toContain("falling overall");
    const noisy = { label: "Noise", values: [5, 1, 9, 2, 2, 9, 1, 5] };
    expect(describeSeries(noisy)).toContain("no clear trend");
  });

  it("counts missing values rather than hiding them", () => {
    expect(describeSeries(PRODUCTION, DAYS, { unit: "deployments" })).toBe(
      "Production: 7 points from Mon to Sun, 1 missing, ranging from 3 to 42 deployments, falling overall, highest at Tue, lowest at Sat.",
    );
    expect(describeSeries({ label: "Gaps", values: [null, Number.NaN] }, ["A", "B"])).toBe(
      "Gaps: 2 points from A to B, all missing.",
    );
  });

  it("numbers points when there are no categories", () => {
    expect(describeSeries({ label: "Load", values: [1, 2, 3, 9] })).toBe(
      "Load: 4 points, ranging from 1 to 9, rising overall, highest at point 4, lowest at point 1.",
    );
  });

  it("handles one point, a flat series and no data", () => {
    expect(describeSeries({ label: "Once", values: [4] }, ["Mon"])).toBe(
      "Once: 1 point, 4 at Mon.",
    );
    expect(describeSeries({ label: "Uptime", values: [100, 100, 100] }, ["a", "b", "c"])).toBe(
      "Uptime: 3 points from a to c, all 100.",
    );
    expect(describeSeries({ label: "Empty", values: [] })).toBe("Empty: no data.");
  });

  it("formats values, categories and units", () => {
    const format = {
      formatValue: (value: number) => `$${value.toFixed(1)}`,
      formatCategory: (category: string) => category.toUpperCase(),
    };
    expect(describeSeries({ label: "Sales", values: [1, 2] }, ["jan", "feb"], format)).toBe(
      "Sales: 2 points from JAN to FEB, ranging from $1.0 to $2.0, rising overall, highest at FEB, lowest at JAN.",
    );
  });
});

describe("describePoint", () => {
  it("reads a point with its unit, singular or plural", () => {
    const unit = { one: "deployment", other: "deployments" };
    expect(describePoint([1, 42], DAYS, 0, { unit })).toBe("Mon: 1 deployment");
    expect(describePoint([1, 42], DAYS, 1, { unit })).toBe("Tue: 42 deployments");
    expect(describePoint([1, null], DAYS, 1, { unit })).toBe("Tue: no value");
    expect(describePoint([5], undefined, 0)).toBe("Point 1: 5");
  });
});

describe("scrubIndexFromKey", () => {
  it("steps, pages and jumps to the ends, and ignores other keys", () => {
    expect(scrubIndexFromKey("ArrowRight", 3, 30)).toBe(4);
    expect(scrubIndexFromKey("ArrowDown", 0, 30)).toBe(0);
    expect(scrubIndexFromKey("PageUp", 3, 30)).toBe(6);
    expect(scrubIndexFromKey("PageDown", 1, 30)).toBe(0);
    expect(scrubIndexFromKey("End", 3, 30)).toBe(29);
    expect(scrubIndexFromKey("Home", 3, 30)).toBe(0);
    expect(scrubIndexFromKey("a", 3, 30)).toBeNull();
  });
});
