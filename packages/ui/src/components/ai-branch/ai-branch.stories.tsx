import type { Meta, StoryObj } from "@storybook/react-vite";

import { Message, MessageBody } from "@/components/ai-message";

import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from "./ai-branch";

const meta: Meta<typeof Branch> = {
  title: "AI/Branch",
  component: Branch,
};

export default meta;
type Story = StoryObj<typeof meta>;

function Pager({ from }: { from: "user" | "assistant" }) {
  return (
    <BranchSelector from={from}>
      <BranchPrevious />
      <BranchPage />
      <BranchNext />
    </BranchSelector>
  );
}

export const Default: Story = {
  render: () => (
    <Branch className="max-w-xl">
      <BranchMessages>
        <p className="text-sm">The first answer.</p>
        <p className="text-sm">A regenerated answer.</p>
        <p className="text-sm">A third take.</p>
      </BranchMessages>
      <Pager from="assistant" />
    </Branch>
  ),
};

const TURNS = [
  {
    ask: "How do I implement authentication in Next.js?",
    answer: "Here are several approaches for implementing authentication in Next.js…",
  },
  {
    ask: "What about using NextAuth.js specifically?",
    answer: "NextAuth.js is an excellent choice. Here's how to set it up…",
  },
];

/** SmoothUI "AI Branch": each version holds real messages, with its own pager. */
export const Gallery: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-xs text-muted-foreground">SmoothUI — AI Branch (compound API)</p>
      <Branch>
        <BranchMessages>
          {TURNS.map((turn) => (
            <div key={turn.ask} className="flex flex-col gap-4">
              {/* Message is a list item: a transcript is an ordered list. */}
              <ol className="flex flex-col gap-4">
                <Message from="user">
                  <MessageBody from="user">{turn.ask}</MessageBody>
                </Message>
                <Message from="assistant">
                  <MessageBody from="assistant">{turn.answer}</MessageBody>
                </Message>
              </ol>
              <Pager from="assistant" />
            </div>
          ))}
        </BranchMessages>
      </Branch>
    </div>
  ),
};
