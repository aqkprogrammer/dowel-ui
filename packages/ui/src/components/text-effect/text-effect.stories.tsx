import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { TextEffect, textEffectPresetNames, type TextEffectPreset } from "./text-effect";

const meta = {
  title: "Effects/Text Effect",
  component: TextEffect,
  args: {
    children: "Think different.",
    preset: "soft-blur-in",
    as: "h2",
    className: "text-4xl font-bold tracking-tight",
  },
  argTypes: {
    preset: { control: "select", options: textEffectPresetNames },
    by: { control: "select", options: [undefined, "character", "word", "line", "whole"] },
    direction: { control: "select", options: ["up", "down", "start", "end"] },
    trigger: { control: "inline-radio", options: ["mount", "in-view"] },
    mode: { control: "inline-radio", options: ["enter", "exit"] },
    as: { control: "select", options: ["span", "p", "div", "h1", "h2", "h3"] },
  },
} satisfies Meta<typeof TextEffect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A phrase builder cycling through phrases: build, hold, exit, next — as the sources do. */
function PhraseCycle({
  preset,
  phrases,
  interval = 2500,
  className,
}: {
  preset: TextEffectPreset;
  phrases: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"enter" | "exit">("enter");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <TextEffect
      preset={preset}
      mode={mode}
      className={className}
      onComplete={() => {
        if (mode === "enter") {
          timer.current = setTimeout(() => setMode("exit"), interval);
        } else {
          setIndex((current) => (current + 1) % phrases.length);
          setMode("enter");
        }
      }}
    >
      {phrases[index] ?? ""}
    </TextEffect>
  );
}

const TITLE = "text-4xl font-bold tracking-tight";
const SUB = "text-lg text-muted-foreground";

/** Every SmoothUI source, as its own demo. `replay` is the replayKey they all share. */
const SOURCES: {
  source: string;
  preset: TextEffectPreset;
  demo: (replay: number) => ReactNode;
}[] = [
  {
    source: "Blur Out Up",
    preset: "blur-out-up",
    demo: (replay) => (
      <>
        <TextEffect preset="blur-out-up" replayKey={replay} className={TITLE}>
          Think different.
        </TextEffect>
        <TextEffect preset="blur-out-up" replayKey={replay} delay={400} className={SUB}>
          Per-word blur reveal.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Bottom Up Letters",
    preset: "bottom-up-letters",
    demo: (replay) => (
      <>
        <TextEffect
          preset="bottom-up-letters"
          replayKey={replay}
          className="text-5xl font-bold"
        >
          Design.
        </TextEffect>
        <TextEffect
          preset="bottom-up-letters"
          replayKey={replay}
          delay={600}
          className="text-3xl font-semibold"
        >
          Build.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Depth Parallax Words",
    preset: "depth-parallax-words",
    demo: (replay) => (
      <>
        <TextEffect preset="depth-parallax-words" replayKey={replay} className={TITLE}>
          Think different.
        </TextEffect>
        <TextEffect
          preset="depth-parallax-words"
          replayKey={replay}
          delay={400}
          className={SUB}
        >
          Per-word depth parallax reveal.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Focus Blur Resolve",
    preset: "focus-blur-resolve",
    demo: (replay) => (
      <>
        <TextEffect preset="focus-blur-resolve" replayKey={replay} className={TITLE}>
          Clarity from chaos.
        </TextEffect>
        <TextEffect preset="focus-blur-resolve" replayKey={replay} delay={400} className={SUB}>
          Focus pull from heavy blur to crisp.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Kinetic Center Build",
    preset: "kinetic-center-build",
    demo: () => (
      <PhraseCycle
        preset="kinetic-center-build"
        className={TITLE}
        phrases={["Words push left", "Type locks center", "Build the line"]}
      />
    ),
  },
  {
    source: "Line By Line Slide",
    preset: "line-by-line-slide",
    demo: (replay) => (
      <>
        <TextEffect preset="line-by-line-slide" replayKey={replay} className={TITLE}>
          {"Beautiful by design.\nPowerful by nature."}
        </TextEffect>
        <TextEffect preset="line-by-line-slide" replayKey={replay} delay={400} className={SUB}>
          {"Per-line slide reveal.\nLanding page vibes."}
        </TextEffect>
      </>
    ),
  },
  {
    source: "Mask Reveal Up",
    preset: "mask-reveal-up",
    demo: (replay) => (
      <>
        <TextEffect preset="mask-reveal-up" replayKey={replay} className={TITLE}>
          {"Designed for\nthe planet."}
        </TextEffect>
        <TextEffect preset="mask-reveal-up" replayKey={replay} delay={300} className={SUB}>
          {"Per-line masked reveal.\nSection transitions."}
        </TextEffect>
      </>
    ),
  },
  {
    source: "Micro Scale Fade",
    preset: "micro-scale-fade",
    demo: (replay) => (
      <>
        <TextEffect preset="micro-scale-fade" replayKey={replay} className={TITLE}>
          Precision.
        </TextEffect>
        <TextEffect preset="micro-scale-fade" replayKey={replay} delay={300} className={SUB}>
          Subtle premium scale entrance.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Per Character Rise",
    preset: "per-character-rise",
    demo: (replay) => (
      <>
        <TextEffect preset="per-character-rise" replayKey={replay} className={TITLE}>
          Think different.
        </TextEffect>
        <TextEffect preset="per-character-rise" replayKey={replay} delay={400} className={SUB}>
          Crisp per-character rise.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Reveal Text",
    preset: "reveal-text",
    demo: (replay) => (
      <>
        <TextEffect preset="reveal-text" replayKey={replay} direction="up" className="text-3xl">
          Welcome to SmoothUI
        </TextEffect>
        <TextEffect
          preset="reveal-text"
          replayKey={replay}
          direction="start"
          delay={200}
          className="text-xl"
        >
          Beautiful animations
        </TextEffect>
        <TextEffect
          preset="reveal-text"
          replayKey={replay}
          direction="end"
          delay={400}
          className="text-lg"
        >
          Made with CSS
        </TextEffect>
        <TextEffect
          preset="reveal-text"
          replayKey={replay}
          direction="down"
          delay={600}
          className="text-sm text-muted-foreground"
        >
          Scroll down to see more examples!
        </TextEffect>
      </>
    ),
  },
  {
    source: "Scale Down Fade",
    preset: "scale-down-fade",
    demo: (replay) => (
      <>
        <TextEffect preset="scale-down-fade" replayKey={replay} className={TITLE}>
          Polished.
        </TextEffect>
        <TextEffect preset="scale-down-fade" replayKey={replay} delay={300} className={SUB}>
          Subtle premium settle-in.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Short Slide Down",
    preset: "short-slide-down",
    demo: () => (
      <PhraseCycle
        preset="short-slide-down"
        className={TITLE}
        phrases={["Words drop down", "Lines stack centered", "Build the column"]}
      />
    ),
  },
  {
    source: "Short Slide Right",
    preset: "short-slide-right",
    demo: () => (
      <PhraseCycle
        preset="short-slide-right"
        className={TITLE}
        phrases={["Move with intent.", "Words glide across.", "Build the rhythm."]}
      />
    ),
  },
  {
    source: "Soft Blur In",
    preset: "soft-blur-in",
    demo: (replay) => (
      <>
        <TextEffect preset="soft-blur-in" replayKey={replay} className={TITLE}>
          Think different.
        </TextEffect>
        <TextEffect preset="soft-blur-in" replayKey={replay} delay={400} className={SUB}>
          Per-character blur reveal.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Spring Scale In",
    preset: "spring-scale-in",
    demo: (replay) => (
      <>
        <TextEffect preset="spring-scale-in" replayKey={replay} className={TITLE}>
          Think different.
        </TextEffect>
        <TextEffect preset="spring-scale-in" replayKey={replay} delay={400} className={SUB}>
          Per-word spring scale reveal.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Stagger From Center",
    preset: "stagger-from-center",
    demo: (replay) => (
      <>
        <TextEffect preset="stagger-from-center" replayKey={replay} className={TITLE}>
          Beautiful.
        </TextEffect>
        <TextEffect preset="stagger-from-center" replayKey={replay} delay={500} className={SUB}>
          Center-out reveal.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Stagger From Edges",
    preset: "stagger-from-edges",
    demo: (replay) => (
      <>
        <TextEffect preset="stagger-from-edges" replayKey={replay} className={TITLE}>
          Converge.
        </TextEffect>
        <TextEffect preset="stagger-from-edges" replayKey={replay} delay={500} className={SUB}>
          Edges meet center.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Top Down Letters",
    preset: "top-down-letters",
    demo: (replay) => (
      <>
        <TextEffect preset="top-down-letters" replayKey={replay} className="text-5xl font-bold">
          Create.
        </TextEffect>
        <TextEffect
          preset="top-down-letters"
          replayKey={replay}
          delay={600}
          className="text-3xl font-semibold"
        >
          Ship.
        </TextEffect>
      </>
    ),
  },
  {
    source: "Wave Text",
    preset: "wave-text",
    demo: () => (
      <>
        <TextEffect
          preset="wave-text"
          amplitude={12}
          duration={1000}
          stagger={40}
          className="text-3xl font-bold"
        >
          SmoothUI Components
        </TextEffect>
        <TextEffect
          preset="wave-text"
          amplitude={8}
          duration={1200}
          stagger={50}
          className="text-xl"
        >
          Beautiful animations made easy
        </TextEffect>
        <TextEffect
          preset="wave-text"
          amplitude={6}
          duration={1400}
          stagger={60}
          className="text-lg text-muted-foreground"
        >
          Smooth wave animations for your text!
        </TextEffect>
      </>
    ),
  },
];

/** Every SmoothUI source, reproduced. Each is a value of `preset`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [replay, setReplay] = useState(0);
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setReplay((count) => count + 1)}
        >
          Replay
        </button>
        <div className="grid gap-4 md:grid-cols-2">
          {SOURCES.map(({ source, preset, demo }) => (
            <figure
              key={preset}
              className="flex min-h-56 flex-col justify-between gap-4 overflow-hidden rounded-lg border border-border p-6"
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                {demo(replay)}
              </div>
              <figcaption className="text-xs text-muted-foreground">
                SmoothUI {source} · <code>preset=&quot;{preset}&quot;</code>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  },
};

/** `by` re-splits any staggered preset. */
export const SplitUnits: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      {(["character", "word", "line", "whole"] as const).map((by) => (
        <TextEffect key={by} preset="soft-blur-in" by={by} className="block text-2xl">
          {`Split by ${by}.\nA second line.`}
        </TextEffect>
      ))}
    </div>
  ),
};

/** Plays once, when scrolled into view. */
export const InView: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="h-80 overflow-y-auto rounded-lg border border-border p-6">
      <p className="h-96 text-sm text-muted-foreground">Scroll down.</p>
      <TextEffect as="h2" trigger="in-view" preset="mask-reveal-up" className={TITLE}>
        {"Designed for\nthe planet."}
      </TextEffect>
    </div>
  ),
};

/** `mode="exit"`: the builders' own exits, and every other entrance reversed. */
export const Exit: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [mode, setMode] = useState<"enter" | "exit">("enter");
    return (
      <div className="flex flex-col items-start gap-6">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setMode((current) => (current === "enter" ? "exit" : "enter"))}
        >
          {mode === "enter" ? "Exit" : "Enter"}
        </button>
        <TextEffect mode={mode} preset="kinetic-center-build" className={TITLE}>
          Type locks center
        </TextEffect>
        <TextEffect mode={mode} preset="short-slide-right" className={TITLE}>
          Move with intent.
        </TextEffect>
        <TextEffect mode={mode} preset="soft-blur-in" className={TITLE}>
          Think different.
        </TextEffect>
      </div>
    );
  },
};

/** Horizontal travel follows the inline axis, so it mirrors in right-to-left text. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="flex flex-col items-start gap-6">
      <TextEffect preset="line-by-line-slide" className={TITLE}>
        {"مصمم بعناية.\nقوي بطبيعته."}
      </TextEffect>
      <TextEffect preset="kinetic-center-build" className={TITLE}>
        الكلمات تدفع السطر
      </TextEffect>
    </div>
  ),
};
