import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageSquare } from "lucide-react";

import { MorphSurface, MorphSurfaceForm, useMorphSurface } from "./morph-surface";

/** Stands in for the source's Siri orb: a token-coloured conic gradient. */
function Orb() {
  return (
    <span className="block size-5 animate-spin rounded-full bg-[conic-gradient(var(--color-primary),var(--color-info),var(--color-success),var(--color-warning),var(--color-primary))] [animation-duration:4s]" />
  );
}

const meta: Meta<typeof MorphSurface> = {
  title: "Overlays/Morph Surface",
  component: MorphSurface,
  args: {
    label: "Ask AI",
    panelLabel: "AI Input",
    icon: <Orb />,
    panelWidth: "22.5rem",
    panelHeight: "12.5rem",
    successLabel: "Sent",
    children: <MorphSurfaceForm placeholder="Ask me anything…" />,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Press "Ask AI": the dock grows into the prompt; ⌘/Ctrl + Enter sends, Escape collapses. */
export const Default: Story = {
  render: (args) => (
    <div className="flex h-60 w-full max-w-[22.5rem] items-end justify-center">
      <MorphSurface {...args} />
    </div>
  ),
};

function Dismiss() {
  const { close } = useMorphSurface();
  return (
    <button
      type="button"
      onClick={() => close()}
      className="self-end rounded-md px-2 py-1 text-xs hover:bg-accent focus-visible:ring-2 focus-visible:outline-none"
    >
      Done
    </button>
  );
}

/**
 * Every source item this component covers.
 *
 * - SmoothUI "Morph Surface" (formerly `ai-input`) → the default: an orb and
 *   "Ask AI" dock growing into the "AI Input" panel with a ⌘ Enter submit.
 * - The same mechanism as a feedback dock, and with custom panel content that
 *   closes itself through `useMorphSurface`.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-8">
      <figure className="flex h-60 flex-col items-center justify-end gap-2">
        <MorphSurface label="Ask AI" panelLabel="AI Input" icon={<Orb />}>
          <MorphSurfaceForm />
        </MorphSurface>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI Morph Surface
        </figcaption>
      </figure>
      <figure className="flex h-60 flex-col items-center justify-end gap-2">
        <MorphSurface
          label="Feedback"
          icon={<MessageSquare className="size-4" />}
          panelWidth="18rem"
          panelHeight="10rem"
          successLabel="Thanks!"
        >
          <MorphSurfaceForm placeholder="What could be better?" submitLabel="Send feedback" />
        </MorphSurface>
        <figcaption className="text-xs text-muted-foreground">Feedback dock</figcaption>
      </figure>
      <figure className="flex h-60 flex-col items-center justify-end gap-2">
        <MorphSurface label="Shortcuts" panelLabel="Keyboard shortcuts" panelHeight="8rem">
          <div className="flex h-full flex-col gap-2 p-2 text-sm">
            <p>
              <kbd className="rounded border border-border px-1">⌘K</kbd> opens the command
              menu.
            </p>
            <Dismiss />
          </div>
        </MorphSurface>
        <figcaption className="text-xs text-muted-foreground">Custom panel content</figcaption>
      </figure>
    </div>
  ),
};
