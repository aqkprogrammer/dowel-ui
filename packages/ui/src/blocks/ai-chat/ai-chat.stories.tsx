import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { AiChatBlock, type ChatMessage } from "./ai-chat";

/** Named so its type is nameable in declaration output (TS2883). */
const withChatFrame: Decorator = (Story) => (
  <div className="h-[36rem] w-[42rem] max-w-full overflow-hidden rounded-xl border border-border">
    <Story />
  </div>
);

const MODELS = [
  { id: "fast", name: "Fast", description: "Lowest latency." },
  { id: "balanced", name: "Balanced", description: "The default." },
  { id: "deep", name: "Deep Research", description: "Multi-step, with citations." },
];

const CONVERSATION: ChatMessage[] = [
  { id: "1", from: "user", content: "How do I make an overflowing table keyboard-scrollable?" },
  {
    id: "2",
    from: "assistant",
    content:
      'Give the scrolling wrapper tabindex="0", a role of "region" and an accessible name. Without a focus stop, the columns past the edge are unreachable without a pointer.',
    reasoning:
      "The question is about keyboard access to overflowing tables.\n\nA scroll container is not focusable by default, so its content past the edge cannot be reached without a pointer. Adding a focus stop with a role and a name fixes both the reachability and the unlabelled-stop problem.",
    tools: [
      {
        id: "t1",
        name: "search_docs",
        status: "success",
        arguments: JSON.stringify({ query: "scrollable region keyboard", limit: 5 }, null, 2),
        result: JSON.stringify({ hits: 3, top: "ARIA Authoring Practices" }, null, 2),
      },
    ],
    sources: [
      {
        index: 1,
        title: "ARIA Authoring Practices — scrollable regions",
        origin: "w3.org",
        href: "#1",
      },
      { index: 2, title: "Accessible data tables", origin: "example.org", href: "#2" },
    ],
    tokens: 148,
  },
];

const meta = {
  title: "Blocks/AI Chat",
  component: AiChatBlock,
  args: { messages: CONVERSATION, models: MODELS, model: "balanced" },
  parameters: { controls: { disable: true } },
  decorators: [withChatFrame],
} satisfies Meta<typeof AiChatBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { messages: [] },
};

export const Waiting: Story = {
  args: { messages: [CONVERSATION[0]!], waiting: true },
};

export const Streaming: Story = {
  args: {
    messages: [
      CONVERSATION[0]!,
      {
        id: "2",
        from: "assistant",
        content: 'Give the scrolling wrapper tabindex="0", a role',
        streaming: true,
      },
    ],
    busy: true,
  },
};

/** Send a message and watch it stream back. */
export const Interactive: Story = {
  render: function Interactive() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [waiting, setWaiting] = useState(false);
    const [busy, setBusy] = useState(false);

    function reply(text: string) {
      const answer = `You asked: “${text}”. In a real product this is where the response would stream in, one token at a time.`;
      let shown = 0;

      const id = String(Date.now());
      setWaiting(false);
      setBusy(true);
      setMessages((current) => [
        ...current,
        { id, from: "assistant", content: "", streaming: true },
      ]);

      const timer = window.setInterval(() => {
        shown += 2;
        const done = shown >= answer.length;

        setMessages((current) =>
          current.map((message) =>
            message.id === id
              ? {
                  ...message,
                  content: answer.slice(0, shown),
                  streaming: !done,
                  tokens: done ? 42 : undefined,
                }
              : message,
          ),
        );

        if (done) {
          window.clearInterval(timer);
          setBusy(false);
        }
      }, 30);
    }

    return (
      <AiChatBlock
        messages={messages}
        models={MODELS}
        model="balanced"
        busy={busy}
        waiting={waiting}
        onSend={(text) => {
          setMessages((current) => [
            ...current,
            { id: `u${String(current.length)}`, from: "user", content: text },
          ]);
          setWaiting(true);
          window.setTimeout(() => {
            reply(text);
          }, 700);
        }}
      />
    );
  },
};
