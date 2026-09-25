import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";

import { StreamAnnouncer } from "./stream-announcer";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Stream Announcer",
  component: StreamAnnouncer,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
  args: { text: "", streaming: false },
} satisfies Meta<typeof StreamAnnouncer>;

export default meta;
type Story = StoryObj<typeof meta>;

const ANSWER = `A Sheet slides in from any edge and closes with Escape, the overlay or its close button. A Drawer is anchored to the bottom and adds a drag gesture — but the gesture is never the only way out.

## Which to use

- Use a **Sheet** for settings and detail panels.
- Use a **Drawer** on touch screens, where a thumb reaches the bottom first.

\`\`\`tsx
<Sheet side="right">
  <SheetContent>…</SheetContent>
</Sheet>
\`\`\`

The total bundle cost is about 3.5 kB for either. See [the overlay docs](https://example.com/overlays) for the rest.`;

/** Replays a response token by token, the way a model streams it. */
function useStream(source: string) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    const tokens = source.match(/\S+\s*|\s+/g) ?? [];
    let index = 0;
    setText("");
    setStreaming(true);
    timer.current = setInterval(() => {
      index += 1;
      setText(tokens.slice(0, index).join(""));
      if (index >= tokens.length) {
        if (timer.current) clearInterval(timer.current);
        setStreaming(false);
      }
    }, 60);
  };

  return { text, streaming, start };
}

/**
 * Turn reading on, then stream. What a screen reader is handed appears on the
 * right as it is handed over: whole sentences only, markdown read as prose,
 * the code block summarised — while the response on the left arrives token by
 * token. Pause, skip and repeat act on the queue, which is kept in the page so
 * they still can.
 */
export const Default: Story = {
  render: function Render() {
    const { text, streaming, start } = useStream(ANSWER);
    const [heard, setHeard] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setHeard([]);
              start();
            }}
            disabled={streaming}
          >
            {streaming ? "Streaming…" : "Stream a response"}
          </Button>
          <StreamAnnouncer
            text={text}
            streaming={streaming}
            defaultEnabled
            onAnnounce={(chunk) => {
              setHeard((current) => [...current, chunk]);
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-label="Response" className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">What is on screen</h3>
            <p className="min-h-40 rounded-md border border-border p-3 text-sm whitespace-pre-wrap">
              {text}
            </p>
          </section>
          <section aria-label="Announcements" className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">
              What a screen reader is handed
            </h3>
            <ol className="flex min-h-40 flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3 text-sm">
              {heard.map((chunk, index) => (
                <li key={`${String(index)}-${chunk}`}>{chunk}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    );
  },
};

/** Off, which is the default: only the toggle is shown, and nothing is read. */
export const Off: Story = {
  args: { text: "", streaming: false },
};

/** In another language: every label, and the locale for sentence rules. */
export const CustomLabels: Story = {
  args: {
    text: "",
    streaming: false,
    defaultEnabled: true,
    labels: {
      toggleOn: "Arrêter la lecture",
      toggleOff: "Lire les réponses",
      pause: "Pause",
      resume: "Reprendre",
      repeat: "Répéter",
      skip: (queued) => (queued > 0 ? `Passer ${String(queued)}` : "Passer"),
      group: "Lecture des réponses",
    },
    locale: "fr",
  },
};
