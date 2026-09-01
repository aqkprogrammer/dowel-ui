import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Message, MessageAvatar, MessageBody } from "@/components/ai-message";
import { Response, ThinkingIndicator } from "@/components/ai-response";
import { Button } from "@/components/button";

import {
  Conversation,
  ConversationMessages,
  ConversationScrollButton,
  ConversationStatus,
} from "./ai-conversation";

const meta: Meta<typeof Conversation> = {
  title: "AI/Conversation",
  component: Conversation,
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof Conversation>;

const TURNS = [
  { role: "user" as const, text: "What's the difference between a Sheet and a Drawer?" },
  {
    role: "assistant" as const,
    text: "A Sheet slides in from any edge and is dismissed with Escape, the overlay or a close button. A Drawer is bottom-anchored and adds a drag gesture — but the gesture is never the only way out.",
  },
  { role: "user" as const, text: "When would I use one over the other?" },
  {
    role: "assistant" as const,
    text: "Use a Sheet for secondary content on any viewport: filters, details, navigation. Use a Drawer when the surface is primarily touch-driven and dragging it away is the natural gesture.",
  },
];

export const Default: Story = {
  render: () => (
    <div className="flex h-96 w-[34rem] flex-col rounded-xl border border-border">
      <Conversation>
        <ConversationMessages>
          {TURNS.map((turn, index) => (
            <Message key={index} from={turn.role}>
              {turn.role === "assistant" ? <MessageAvatar>AI</MessageAvatar> : null}
              <MessageBody from={turn.role}>
                {turn.role === "assistant" ? <Response>{turn.text}</Response> : turn.text}
              </MessageBody>
            </Message>
          ))}
        </ConversationMessages>
        <ConversationScrollButton />
      </Conversation>
    </div>
  ),
};

/**
 * State goes in the status region; the response text never does. A live region
 * that updates per token is unusable with a screen reader.
 */
export const Streaming: Story = {
  render: function Streaming() {
    const [streaming, setStreaming] = useState(false);

    return (
      <div className="flex h-96 w-[34rem] flex-col rounded-xl border border-border">
        <Conversation>
          <ConversationMessages>
            <Message from="user">
              <MessageBody from="user">Explain streaming responses.</MessageBody>
            </Message>
            <Message from="assistant">
              <MessageAvatar>AI</MessageAvatar>
              <MessageBody from="assistant">
                {streaming ? (
                  <Response streaming>Tokens arrive one at a time, and the caret</Response>
                ) : (
                  <ThinkingIndicator />
                )}
              </MessageBody>
            </Message>
          </ConversationMessages>
          <ConversationStatus>
            {streaming ? "Generating response" : "Waiting for the first token"}
          </ConversationStatus>
        </Conversation>
        <div className="border-t border-border p-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStreaming((current) => !current);
            }}
          >
            Toggle streaming
          </Button>
        </div>
      </div>
    );
  },
};

/** Scroll up: following stops, and an explicit way back appears. */
export const LongTranscript: Story = {
  render: () => (
    <div className="flex h-96 w-[34rem] flex-col rounded-xl border border-border">
      <Conversation>
        <ConversationMessages>
          {Array.from({ length: 14 }, (_, index) => {
            const role = index % 2 === 0 ? ("user" as const) : ("assistant" as const);
            return (
              <Message key={index} from={role}>
                {role === "assistant" ? <MessageAvatar>AI</MessageAvatar> : null}
                <MessageBody from={role}>
                  Turn {index + 1}.{" "}
                  {role === "assistant" ? "An answer of some length." : "A question."}
                </MessageBody>
              </Message>
            );
          })}
        </ConversationMessages>
        <ConversationScrollButton />
      </Conversation>
    </div>
  ),
};
