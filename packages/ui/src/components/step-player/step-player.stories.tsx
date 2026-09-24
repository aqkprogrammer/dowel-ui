import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { StepPlayer } from "./step-player";

const meta = {
  title: "Feedback/Step Player",
  component: StepPlayer,
  args: {
    steps: 5,
    duration: 3000,
    loop: false,
    size: 32,
    showControl: true,
    controlPosition: "start",
    seekable: false,
    track: "filled",
  },
  argTypes: {
    steps: { control: { type: "number", min: 1, max: 12 } },
    duration: { control: { type: "range", min: 0, max: 8000, step: 250 } },
    size: { control: { type: "range", min: 16, max: 64, step: 2 } },
    controlPosition: { control: "inline-radio", options: ["start", "end"] },
    track: { control: "inline-radio", options: ["filled", "plain"] },
    value: { control: false },
    playing: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof StepPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press play: each step stretches into a bar and fills, then hands off to the next. */
export const Default: Story = {};

/**
 * Every source item this component covers.
 *
 * - Rare UI "Step player" → an original design of the same pattern (no source
 *   was viewed): the stretching, filling step, the play icon splitting into
 *   pause bars, a replay arrow at the end, per-step durations, looping,
 *   seeking, a control on either side, and one `size` everything scales from.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-center gap-8">
      <StepPlayer steps={4} duration={2000} size={24} />
      <StepPlayer steps={5} duration={2500} defaultPlaying loop />
      <StepPlayer steps={6} duration={2000} size={44} seekable controlPosition="end" />
      <StepPlayer steps={4} duration={2000} track="plain" />
    </div>
  ),
};

export const Playing: Story = { args: { defaultPlaying: true, loop: true } };

/** Wraps to the first step; the replay button never appears. */
export const Loop: Story = { args: { defaultPlaying: true, loop: true, duration: 1500 } };

/** Click a dot to jump to it, or tab in and use the arrow keys. Tap targets stay 24px or larger. */
export const Seekable: Story = { args: { seekable: true } };

/** Each step runs for its own time, and is named for assistive technology. */
export const PerStepDurations: Story = {
  args: {
    steps: [
      { duration: 1000, label: "Intro" },
      { duration: 4000, label: "Features" },
      { duration: 2000, label: "Pricing" },
      { duration: 6000, label: "Sign up" },
    ],
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-center gap-6">
      {[20, 32, 48, 64].map((size) => (
        <StepPlayer key={size} size={size} steps={4} duration={2000} defaultPlaying loop />
      ))}
    </div>
  ),
};

export const ControlAtEnd: Story = { args: { controlPosition: "end" } };

/** No button: a track on its own, played by the `playing` prop. */
export const TrackOnly: Story = {
  args: { showControl: false, defaultPlaying: true, loop: true, duration: 1500 },
};

/**
 * `duration={0}` turns the timer off so you drive the step yourself — an
 * onboarding carousel, say — and the track just shows where you are.
 */
export const DrivenByYou: Story = {
  parameters: { controls: { disable: true } },
  render: function DrivenByYou() {
    const [step, setStep] = useState(0);
    return (
      <div className="grid justify-items-center gap-4">
        <StepPlayer
          steps={4}
          duration={0}
          value={step}
          onValueChange={setStep}
          showControl={false}
          seekable
          label="Onboarding"
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => {
              setStep((current) => current - 1);
            }}
          >
            Back
          </Button>
          <Button
            disabled={step === 3}
            onClick={() => {
              setStep((current) => current + 1);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  args: { seekable: true, defaultPlaying: true, loop: true, duration: 1500 },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
