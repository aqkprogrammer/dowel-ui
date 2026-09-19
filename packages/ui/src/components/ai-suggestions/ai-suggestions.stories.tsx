import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Suggestions, type SuggestionItem } from "./ai-suggestions";

const STARTERS: SuggestionItem[] = [
  { id: "1", label: "Forecast summer demand" },
  { id: "2", label: "Find waffle cone suppliers" },
  { id: "3", label: "Compare seasonal flavours" },
  { id: "4", label: "Draft a launch plan" },
  { id: "5", label: "Check cold-chain status" },
];

const FOLLOW_UPS: SuggestionItem[] = [
  { id: "a", label: "Which flavours sell best in winter?" },
  { id: "b", label: "Compare gelato and soft serve margins" },
];

const meta: Meta<typeof Suggestions> = {
  title: "AI/Suggestions",
  component: Suggestions,
  args: { suggestions: STARTERS, label: "Start with", variant: "outline" },
  argTypes: { variant: { control: "inline-radio", options: ["outline", "soft"] } },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * SmoothUI "AI Suggestions": a chip fills the draft rather than sending, and
 * swapping the set replays the centre-out entrance.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [draft, setDraft] = useState("");
    const [followUps, setFollowUps] = useState(false);
    return (
      <div className="flex w-full max-w-xl flex-col gap-5">
        <p className="text-xs text-muted-foreground">SmoothUI — AI Suggestions</p>
        <Suggestions
          label={followUps ? "Follow-ups" : "Start with"}
          suggestions={followUps ? FOLLOW_UPS : STARTERS}
          onSelect={(suggestion) => setDraft(suggestion.label)}
        />
        <textarea
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-16 rounded-md border border-input bg-background p-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setFollowUps((current) => !current)}
          className="w-fit rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
        >
          Swap the set
        </button>
      </div>
    );
  },
};
