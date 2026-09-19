import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PullToRefresh, type PullToRefreshProps } from "./pull-to-refresh";

/*
 * bencho's portfolio card is demo content, so it lives here rather than in the
 * component: a balance with faded decimals, the day's change, a sparkline and a
 * 1H / 4H / 1D window. Every refresh draws new numbers.
 */

const WINDOWS = ["1H", "4H", "1D"] as const;
type Window = (typeof WINDOWS)[number];
const WHEN: Record<Window, string> = { "1H": "past hour", "4H": "past 4 hours", "1D": "today" };

interface Snapshot {
  balance: number;
  points: Record<Window, number[]>;
}

/** A seeded walk, so each refresh is new but the story is repeatable. */
function snapshot(seed: number): Snapshot {
  let state = seed * 9301 + 49297;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
  const walk = (length: number, spread: number) => {
    const points = [0];
    for (let index = 1; index < length; index += 1) {
      points.push((points[index - 1] ?? 0) + (random() - 0.46) * spread);
    }
    return points;
  };
  return {
    balance: 56000 + random() * 5000,
    points: { "1H": walk(24, 60), "4H": walk(32, 140), "1D": walk(40, 320) },
  };
}

const money = (value: number) =>
  Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 296;
      const y = 86 - ((point - min) / range) * 80;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 296 92"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Balance trend, ${up ? "up" : "down"}`}
      className={cn("mt-3 h-23 w-full", up ? "text-success" : "text-destructive")}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Portfolio({ data }: { data: Snapshot }) {
  const [range, setRange] = useState<Window>("1D");
  const points = data.points[range];
  const change = (points.at(-1) ?? 0) - (points[0] ?? 0);
  const up = change >= 0;
  const [whole, decimals] = money(data.balance).split(".");
  return (
    <div className="px-3 pt-5.5 pb-3">
      <p className="px-2.5 text-[2.0625rem] leading-none font-medium tracking-tight tabular-nums">
        <span className="me-0.5">$</span>
        {whole}
        <span className="text-2xl opacity-35">.{decimals}</span>
      </p>
      <p
        className={cn(
          "mt-2.5 px-2.5 text-[0.78rem] font-medium tabular-nums",
          up ? "text-success" : "text-destructive",
        )}
      >
        {up ? "+" : "−"}
        {money(change)} · {((Math.abs(change) / data.balance) * 100).toFixed(1)}%{" "}
        <span className="text-foreground/45">{WHEN[range]}</span>
      </p>
      <Sparkline points={points} up={up} />
      <div role="group" aria-label="Time window" className="relative mt-2 flex">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-1/3 rounded-[0.875rem] bg-foreground/7 transition-transform duration-[var(--duration-slower)] ease-[var(--ease-overshoot)] rtl:-scale-x-100"
          style={{ translate: `${String(WINDOWS.indexOf(range) * 100)}% 0` }}
        />
        {WINDOWS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === range}
            onClick={() => setRange(item)}
            className={cn(
              "relative h-7 flex-1 rounded-[0.875rem] text-[0.72rem] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              item === range ? "text-foreground" : "text-foreground/45",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The bencho demo: a portfolio card that refreshes to new numbers. */
function PortfolioDemo(props: Omit<PullToRefreshProps, "onRefresh" | "children">) {
  const [seed, setSeed] = useState(7);
  return (
    <PullToRefresh
      label="Portfolio"
      className="w-80"
      onRefresh={() =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            setSeed((value) => value + 1);
            resolve();
          }, 1200),
        )
      }
      {...props}
    >
      <Portfolio data={snapshot(seed)} />
    </PullToRefresh>
  );
}

const meta = {
  title: "Feedback/Pull to Refresh",
  component: PullToRefresh,
  args: {
    threshold: 58,
    dots: 6,
    spin: 50,
    corner: 26,
    fill: "light",
    stroke: false,
    disabled: false,
    showRefreshButton: true,
  },
  argTypes: {
    fill: { control: "inline-radio", options: ["light", "dark"] },
    dots: { control: { type: "range", min: 3, max: 10, step: 1 } },
    spin: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 40, step: 2 } },
    threshold: { control: { type: "range", min: 30, max: 120, step: 2 } },
    onRefresh: { control: false },
    children: { control: false },
  },
  render: (args) => (
    <div className="flex min-h-120 justify-center rounded-xl bg-muted px-6 py-16">
      <PortfolioDemo {...args} />
    </div>
  ),
} satisfies Meta<typeof PullToRefresh>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Item({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="flex min-h-110 justify-center rounded-xl bg-muted px-6 pt-14 pb-6">
        {children}
      </div>
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-10 xl:grid-cols-2">
      <Item caption="bencho · Pull to refresh">
        <PortfolioDemo showRefreshButton={false} />
      </Item>
      <Item caption="bencho · Pull to refresh (Fill: Dark, Stroke: On)">
        <PortfolioDemo fill="dark" stroke showRefreshButton={false} />
      </Item>
      <Item caption="bencho · Pull to refresh (Dots 10, Spin 90, Corner 12)">
        <PortfolioDemo dots={10} spin={90} corner={12} showRefreshButton={false} />
      </Item>
      <Item caption="bencho · Pull to refresh (Dots 3, Spin 10, Corner 40)">
        <PortfolioDemo dots={3} spin={10} corner={40} showRefreshButton={false} />
      </Item>
      <Item caption="bencho · Pull to refresh (with the Refresh button)">
        <PortfolioDemo />
      </Item>
    </div>
  ),
};

/** A scrolling feed: pulling only starts once the list is scrolled to the top. */
export const ScrollingFeed: Story = {
  render: (args) => {
    function Feed() {
      const [items, setItems] = useState(() => Array.from({ length: 12 }, (_, i) => i + 1));
      return (
        <PullToRefresh
          {...args}
          label="Inbox"
          className="h-96 w-80"
          onRefresh={async () => {
            await new Promise((resolve) => setTimeout(resolve, 900));
            setItems((current) => [(current[0] ?? 0) + 1, ...current]);
          }}
        >
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item} className="px-4 py-3 text-sm">
                Message {item}
              </li>
            ))}
          </ul>
        </PullToRefresh>
      );
    }
    return (
      <div className="flex justify-center rounded-xl bg-muted px-6 py-16">
        <Feed />
      </div>
    );
  },
};
