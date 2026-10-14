import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { VoiceInput } from "./voice-input";

const meta = {
  title: "AI/Voice Input",
  component: VoiceInput,
  args: { visualizer: "bars" },
  argTypes: {
    visualizer: { control: "inline-radio", options: ["bars", "wave", "orb"] },
    maxDuration: { control: { type: "number", min: 5, max: 300, step: 5 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof VoiceInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press to record, press again to stop. The browser asks for the microphone first. */
export const Default: Story = {};

/** Records and plays back what it heard, with a live transcript where the browser supports it. */
export const WithTranscript: Story = {
  args: { transcribe: true },
  render: function Render(args) {
    const [transcript, setTranscript] = useState("");
    const [audio, setAudio] = useState<string | null>(null);
    return (
      <div className="flex w-80 flex-col gap-4">
        <VoiceInput
          {...args}
          onTranscript={(text) => {
            setTranscript(text);
          }}
          onRecordingComplete={(blob) => {
            setAudio(URL.createObjectURL(blob));
          }}
        />
        <p className="min-h-10 rounded-md border border-border p-3 text-sm text-muted-foreground">
          {transcript || "Your words appear here as you speak."}
        </p>
        {audio ? (
          // The listener's own voice note, played back to them; its words are transcribed above.
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={audio} className="w-full" />
        ) : null}
      </div>
    );
  },
};
