"use client";

import { AnalyticsBlock, type AnalyticsPoint } from "@/components/blocks/analytics";

/*
  A client component, because of the `format` below.

  The blocks are client components, and a function cannot cross the server
  boundary into one — React has no way to send it. So a page that hands a block
  a formatter, a comparator or an event handler has to be a client component
  itself. Data-only props are fine from the server; the moment a function is
  among them, this directive is required, and the build says so rather than
  failing at runtime.
*/

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SERIES: AnalyticsPoint[] = [1240, 1810, 1520, 2140, 2380, 1180, 940].map(
  (value, index) => ({
    at: `2026-03-0${String(index + 1)}`,
    label: DAYS[index] ?? "",
    value,
  }),
);

export default function AnalyticsPage() {
  return (
    <AnalyticsBlock
      metrics={[
        {
          id: "visitors",
          label: "Visitors",
          value: 11_210,
          previous: 9_840,
          comparisonLabel: "vs last week",
        },
        {
          id: "signups",
          label: "Signups",
          value: 284,
          previous: 231,
          comparisonLabel: "vs last week",
        },
        {
          id: "bounce",
          label: "Bounce rate",
          value: 38,
          previous: 44,
          polarity: "lower-is-better",
          format: (value) => `${String(value)}%`,
        },
        { id: "sessions", label: "Sessions", value: 18_400, previous: 16_120 },
      ]}
      series={SERIES}
      breakdown={[
        { id: "search", label: "Organic search", value: 5820 },
        { id: "direct", label: "Direct", value: 2940 },
        { id: "referral", label: "Referral", value: 1610 },
      ]}
    />
  );
}
