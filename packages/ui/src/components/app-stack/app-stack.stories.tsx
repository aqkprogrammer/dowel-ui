import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { AppStack, type AppStackItem } from "./app-stack";

/** Neutral placeholder icons from tokens: no brand artwork. */
function Tile({ letter, mix }: { letter: string; mix: number }) {
  return (
    <span
      className="flex size-full items-center justify-center text-lg font-semibold text-primary-foreground"
      style={{
        background: `linear-gradient(135deg, var(--color-primary), color-mix(in oklab, var(--color-primary) ${String(mix)}%, var(--color-foreground)))`,
      }}
    >
      {letter}
    </span>
  );
}

const APPS: AppStackItem[] = [
  { id: "code", name: "Code", icon: <Tile letter="C" mix={80} /> },
  { id: "canary", name: "Canary", icon: <Tile letter="Ca" mix={60} /> },
  { id: "design", name: "Design", icon: <Tile letter="D" mix={40} /> },
  { id: "browse", name: "Browse", icon: "https://picsum.photos/seed/browser/128/128" },
];

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

const meta: Meta<typeof AppStack> = {
  title: "Form/App Stack",
  component: AppStack,
  args: {
    apps: APPS,
    title: "Starter Mac",
    onDownload: () => wait(3000),
  },
  argTypes: {
    apps: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function ControlledDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-col items-center gap-4">
      <AppStack
        apps={APPS}
        title="Starter Mac"
        expanded={expanded}
        onExpandedChange={setExpanded}
        selected={selected}
        onSelectedChange={setSelected}
        onDownload={async (ids) => {
          setNote(`Download apps: ${ids.join(", ")}`);
          await wait(3000);
        }}
      />
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

/**
 * SmoothUI App Download Stack, as its demo: a four-app "Starter Mac" stack,
 * fully controlled (selection and expansion), whose download reports the
 * chosen apps. The source's three-second fake download is a three-second
 * promise here. Brand icons are replaced by neutral placeholders.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-3">
      <ControlledDemo />
      <figcaption className="text-xs text-muted-foreground">
        App Download Stack — demo
      </figcaption>
    </figure>
  ),
};

/** A rejected promise announces the failure and keeps the selection. */
export const Failing: Story = {
  args: {
    defaultExpanded: true,
    defaultSelected: ["code"],
    onDownload: () => wait(1000).then(() => Promise.reject(new Error("offline"))),
  },
};
