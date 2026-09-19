import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  CloudLightning,
  Music2,
  Pause,
  Phone,
  Play,
  SkipBack,
  SkipForward,
  Thermometer,
  Timer,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Island } from "./island";

const meta: Meta<typeof Island> = {
  title: "Display/Island",
  component: Island,
  args: {
    view: "compact",
    views: {
      compact: (
        <span className="flex items-center gap-2 px-4 py-2 text-sm">
          <Music2 className="size-4" /> Lofi Chill Beats
        </span>
      ),
      expanded: (
        <span className="flex w-64 flex-col gap-1 px-5 py-4">
          <span className="text-sm font-medium">Lofi Chill Beats</span>
          <span className="text-xs opacity-70">DJ Smooth · 2:14 / 3:40</span>
        </span>
      ),
    },
    bounce: 0.5,
    tone: "inverted",
    live: "off",
  },
  argTypes: {
    view: { control: "inline-radio", options: ["compact", "expanded"] },
    tone: { control: "inline-radio", options: ["inverted", "card", "primary"] },
    bounce: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Switch `view` in the controls: the pill reshapes around the new content. */
export const Default: Story = {};

/* SmoothUI Dynamic Island's five demo views, rebuilt as consumer content. */

function IdleView() {
  const [showTemp, setShowTemp] = useState(false);
  return (
    <span
      className="flex items-center gap-2 px-3 py-2"
      onPointerEnter={() => setShowTemp(true)}
      onPointerLeave={() => setShowTemp(false)}
    >
      <CloudLightning className="size-5" aria-label="Thunderstorm" />
      {showTemp ? (
        <span className="flex items-center gap-1 text-xs">
          <Thermometer className="size-3" aria-hidden="true" /> 12°C
        </span>
      ) : null}
    </span>
  );
}

function RingView() {
  return (
    <span className="flex w-64 items-center gap-3 px-4 py-2">
      <Phone className="size-5 text-success" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-sm font-medium">Incoming Call</span>
        <span className="block text-xs opacity-70">Guillermo Rauch</span>
      </span>
      <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
    </span>
  );
}

function TimerView() {
  const [time, setTime] = useState(60);
  useEffect(() => {
    const id = setInterval(() => setTime((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="flex w-64 items-center gap-3 px-4 py-2">
      <Timer className="size-5 text-warning" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium">{time}s remaining</span>
      <span className="h-1 w-24 overflow-hidden rounded-full bg-background/20">
        <span
          className="block h-full bg-warning transition-[width] duration-[var(--duration-slower)] ease-linear"
          style={{ width: `${String((time / 60) * 100)}%` }}
        />
      </span>
    </span>
  );
}

function NotificationView() {
  return (
    <span className="flex w-64 items-center gap-3 px-4 py-2">
      <Bell className="size-5 text-warning" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-sm font-medium">New Message</span>
        <span className="block text-xs opacity-70">You have a new notification!</span>
      </span>
      <span className="rounded-full bg-warning/40 px-2 py-0.5 text-xs text-warning">1</span>
    </span>
  );
}

function MusicView() {
  const [playing, setPlaying] = useState(true);
  const control = "rounded-full p-1 hover:bg-background/30 focus-visible:ring-2 outline-none";
  return (
    <span className="flex w-72 items-center gap-3 px-4 py-2">
      <Music2 className="size-5 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">Lofi Chill Beats</span>
        <span className="block truncate text-xs opacity-70">DJ Smooth</span>
      </span>
      <button type="button" aria-label="Previous" className={control}>
        <SkipBack className="size-4" />
      </button>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        className={control}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <button type="button" aria-label="Next" className={control}>
        <SkipForward className="size-4" />
      </button>
    </span>
  );
}

const DEMO_VIEWS = {
  idle: <IdleView />,
  ring: <RingView />,
  timer: <TimerView />,
  notification: <NotificationView />,
  music: <MusicView />,
};
type DemoView = keyof typeof DEMO_VIEWS;

const SWITCHER: { view: DemoView; label: string; icon: ReactNode }[] = [
  { view: "idle", label: "Idle", icon: <CloudLightning className="size-3" /> },
  { view: "ring", label: "Ring", icon: <Phone className="size-3" /> },
  { view: "timer", label: "Timer", icon: <Timer className="size-3" /> },
  { view: "notification", label: "Notification", icon: <Bell className="size-3" /> },
  { view: "music", label: "Music", icon: <Music2 className="size-3" /> },
];

/** The source's per-transition bounce table: softer into the timer. */
const SOURCE_BOUNCE: Record<string, number> = {
  "idle-timer": 0.3,
  "ring-timer": 0.35,
  "timer-idle": 0.3,
  "timer-ring": 0.35,
};

/**
 * SmoothUI "Dynamic Island" — every view from the source demo: idle weather
 * (hover for the temperature), incoming call, countdown timer, notification
 * and music player, switched from a toolbar, with the source's bounce table
 * passed as a `bounce` function.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [view, setView] = useState<DemoView>("idle");
    return (
      <div className="flex h-52 flex-col items-center justify-between gap-6">
        <Island
          view={view}
          views={DEMO_VIEWS}
          live="polite"
          bounce={(from, to) => SOURCE_BOUNCE[`${from}-${to}`] ?? 0.5}
        />
        <div
          role="toolbar"
          aria-label="Island view"
          className="flex gap-1 rounded-full border border-border bg-background p-1"
        >
          {SWITCHER.map((item) => (
            <button
              key={item.view}
              type="button"
              aria-label={item.label}
              aria-pressed={view === item.view}
              onClick={() => setView(item.view)}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground outline-none focus-visible:ring-2 aria-pressed:ring-2 aria-pressed:ring-ring"
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>
    );
  },
};

/** Tones: the source's inverted pill, a card-coloured one and a primary one. */
export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-4">
      {(["inverted", "card", "primary"] as const).map((tone) => (
        <Island key={tone} tone={tone} view="ring" views={{ ring: <RingView /> }} />
      ))}
    </div>
  ),
};
