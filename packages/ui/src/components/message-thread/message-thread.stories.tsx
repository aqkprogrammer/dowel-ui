import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { MessageThread, type ThreadMessage } from "./message-thread";

const THREAD: ThreadMessage[] = [
  { id: "1", from: "them", text: "See you soon" },
  { id: "2", from: "me", text: "Running 5 min late" },
  { id: "3", from: "them", text: "No rush" },
];

const meta = {
  title: "Data/Message Thread",
  component: MessageThread,
  args: { defaultMessages: THREAD, contactName: "Sam", size: "md", typing: false },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MessageThread>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type and press Enter: the bubble lifts out of the field. */
export const Default: Story = {};

/** The script the reference plays: type, send, a reply, again. */
const SCRIPT: { from: "me" | "them"; text: string }[] = [
  { from: "me", text: "On my way!" },
  { from: "them", text: "See you soon" },
  { from: "me", text: "Running 5 min late" },
  { from: "them", text: "No rush" },
];

function Scripted() {
  const [messages, setMessages] = useState<ThreadMessage[]>(THREAD);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const next = useRef(0);
  const id = useRef(10);

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const push = (from: "me" | "them", text: string) => {
      id.current += 1;
      const message = { id: String(id.current), from, text };
      setMessages((current) => [...current, message].slice(-6));
    };
    async function run() {
      while (!cancelled) {
        const line = SCRIPT[next.current % SCRIPT.length]!;
        next.current += 1;
        if (line.from === "me") {
          for (let length = 1; length <= line.text.length && !cancelled; length += 1) {
            setDraft(line.text.slice(0, length));
            await wait(45);
          }
          await wait(350);
          setDraft("");
          push("me", line.text);
          await wait(700);
        } else {
          setTyping(true);
          await wait(900);
          setTyping(false);
          push("them", line.text);
          await wait(900);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="dark rounded-3xl bg-[#161618] p-10 text-white">
      <MessageThread
        size="sm"
        contactName="Sam"
        messages={messages}
        value={draft}
        onValueChange={setDraft}
        typing={typing}
        onSend={(text) => {
          id.current += 1;
          const message = { id: String(id.current), from: "me" as const, text };
          setMessages((current) => [...current, message].slice(-6));
        }}
        className="border-transparent bg-transparent"
      />
    </div>
  );
}

export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Scripted />,
};

/** The other person typing. */
export const Typing: Story = {
  args: { typing: true },
};
