import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Response, ThinkingIndicator } from "./ai-response";
import { ResponseText } from "./response-text";

const FULL =
  "Streaming works one token at a time. The caret marks where the text stops, and nothing is announced as it arrives — a live region firing on every token is unusable with a screen reader.";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[32rem]">
    <Story />
  </div>
);

const meta = {
  title: "AI/Response",
  component: Response,
  args: { streaming: false, children: FULL },
  argTypes: { streaming: { control: "boolean" } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Response>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Streaming: Story = {
  args: { streaming: true, children: "Streaming works one token at a time. The caret" },
};

/** The real thing: text arriving, then settling. */
export const Live: Story = {
  parameters: { controls: { disable: true } },
  render: function Live() {
    const [length, setLength] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setLength((current) => (current >= FULL.length ? 0 : current + 2));
      }, 40);
      return () => {
        clearInterval(timer);
      };
    }, []);

    const done = length >= FULL.length;
    return <Response streaming={!done}>{FULL.slice(0, length)}</Response>;
  },
};

/** Before the first token there is nothing to put a caret after. */
export const Thinking: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ThinkingIndicator />,
};

export const WithRenderedMarkdown: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Response>
      <p>Three things matter here:</p>
      <ul>
        <li>
          The transcript is a <code>list</code>, not a live region.
        </li>
        <li>State is announced; content is not.</li>
        <li>
          See <a href="#a11y">the accessibility notes</a>.
        </li>
      </ul>
    </Response>
  ),
};

const STREAMED =
  "Each word blurs in as it arrives [1], and words already on screen never replay — token arrival is the stagger [2].";

/**
 * `ResponseText` blurs in only the words that arrive, and turns `[n]` markers
 * into InlineCitations that pop in. The caret stays on `Response`. Motion from
 * SmoothUI AI Response.
 */
export const StreamingText: Story = {
  parameters: { controls: { disable: true } },
  render: function StreamingText() {
    const [length, setLength] = useState(0);

    useEffect(() => {
      if (length >= STREAMED.length) return;
      const timer = setTimeout(() => {
        setLength((current) => Math.min(STREAMED.length, current + 3));
      }, 40);
      return () => {
        clearTimeout(timer);
      };
    }, [length]);

    return (
      <Response streaming={length < STREAMED.length}>
        <ResponseText
          text={STREAMED.slice(0, length)}
          citations={[
            { index: 1, title: "Streaming UI patterns", href: "https://example.org/streaming" },
            { index: 2, title: "Internal design note" },
          ]}
        />
      </Response>
    );
  },
};
