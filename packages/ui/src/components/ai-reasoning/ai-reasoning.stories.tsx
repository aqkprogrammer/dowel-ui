import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Response } from "@/components/ai-response";
import { Button } from "@/components/button";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  useElapsedSeconds,
} from "./ai-reasoning";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[32rem]">
    <Story />
  </div>
);

const meta = {
  title: "AI/Reasoning",
  component: Reasoning,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Reasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

const WORKING =
  'The question is about keyboard access to overflowing tables.\n\nA scroll container is not focusable by default, so its content past the edge cannot be reached without a pointer. Adding tabindex="0" makes it a focus stop, and a role plus a name stops it being an unlabelled one.';

/** Collapsed by default: reasoning is supporting material, not the answer. */
export const Default: Story = {
  render: () => (
    <div className="grid gap-2">
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>{WORKING}</ReasoningContent>
      </Reasoning>
      <Response>
        Give the scrolling wrapper `tabindex=&quot;0&quot;`, a role and an accessible name.
      </Response>
    </div>
  ),
};

export const Streaming: Story = {
  render: () => (
    <Reasoning defaultOpen>
      <ReasoningTrigger streaming />
      <ReasoningContent>
        The question is about keyboard access to overflowing tables. A scroll container
      </ReasoningContent>
    </Reasoning>
  ),
};

export const Expanded: Story = {
  render: () => (
    <Reasoning defaultOpen>
      <ReasoningTrigger />
      <ReasoningContent>{WORKING}</ReasoningContent>
    </Reasoning>
  ),
};

/** Streams WORKING a few characters at a time while `running`. */
function useStream(running: boolean) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setLength((current) => Math.min(WORKING.length, current + 6));
    }, 40);
    return () => {
      clearInterval(timer);
    };
  }, [running]);
  const streaming = running && length < WORKING.length;
  return { text: WORKING.slice(0, length), streaming, restart: () => setLength(0) };
}

/**
 * Opt-in SmoothUI behaviour: opens while reasoning streams, closes 600ms after
 * it ends — unless the reader toggles it, or focus or the pointer is inside.
 * The label shimmers while streaming and then reports the time spent.
 */
export const AutoOpenCollapse: Story = {
  render: function AutoOpenCollapse() {
    const [running, setRunning] = useState(false);
    const { text, streaming, restart } = useStream(running);
    const seconds = useElapsedSeconds(streaming);

    return (
      <div className="grid gap-3">
        <Reasoning streaming={streaming} autoOpen autoCollapse>
          <ReasoningTrigger shimmer duration={seconds ?? undefined} />
          <ReasoningContent>{text}</ReasoningContent>
        </Reasoning>
        <Button
          size="sm"
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            restart();
            setRunning(true);
          }}
        >
          Stream reasoning
        </Button>
      </div>
    );
  },
};

/** "Thought for N.Ns" once finished; `durationLabel` changes the words. */
export const WithDuration: Story = {
  render: () => (
    <div className="grid gap-3">
      <Reasoning>
        <ReasoningTrigger duration={4.2} />
        <ReasoningContent>{WORKING}</ReasoningContent>
      </Reasoning>
      <Reasoning>
        <ReasoningTrigger
          duration={12}
          durationLabel={(value) => `Reasoned for ${value.toFixed(0)} seconds`}
        />
        <ReasoningContent>{WORKING}</ReasoningContent>
      </Reasoning>
    </div>
  ),
};

/** The streaming label shimmers; under reduced motion it is plain text. */
export const Shimmer: Story = {
  render: () => (
    <Reasoning streaming>
      <ReasoningTrigger shimmer />
      <ReasoningContent>{WORKING}</ReasoningContent>
    </Reasoning>
  ),
};
