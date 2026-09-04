"use client";

import { useState } from "react";

import { AiChatBlock, type ChatMessage } from "@/components/blocks/ai-chat";

/**
 * Wire `onSend` to your own endpoint.
 *
 * The reply here is canned so the page works the moment it is generated. Swap
 * the timeout for a fetch and stream tokens into the last message — the block
 * renders `streaming` as a caret rather than as a spinner that hides the text
 * already written.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const send = (content: string) => {
    const question: ChatMessage = { id: crypto.randomUUID(), from: "user", content };
    setMessages((previous) => [...previous, question]);
    setBusy(true);

    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          from: "assistant",
          content: "Replace this with a response from your model.",
        },
      ]);
      setBusy(false);
    }, 600);
  };

  return (
    <div className="h-[calc(100dvh-8rem)]">
      <AiChatBlock messages={messages} onSend={send} busy={busy} waiting={busy} />
    </div>
  );
}
