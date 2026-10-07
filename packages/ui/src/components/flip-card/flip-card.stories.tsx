import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtSign, Check, Globe, Mail, Sparkles } from "lucide-react";
import { useState } from "react";

import { FlipCard } from "./flip-card";

function Front() {
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          AL
        </span>
        <div>
          <p className="font-semibold">Ada Lovelace</p>
          <p className="text-muted-foreground">Design engineer · London</p>
        </div>
      </div>
      <p className="text-muted-foreground">
        Builds the motion system and the bits between the components. Turn the card over for
        what she is working on.
      </p>
      <div className="mt-auto flex gap-6 text-xs">
        <p>
          <span className="block text-lg font-semibold">128</span>
          <span className="text-muted-foreground">components</span>
        </p>
        <p>
          <span className="block text-lg font-semibold">2.4k</span>
          <span className="text-muted-foreground">commits</span>
        </p>
        <p>
          <span className="block text-lg font-semibold">96%</span>
          <span className="text-muted-foreground">coverage</span>
        </p>
      </div>
    </div>
  );
}

function Back() {
  return (
    <div className="flex h-full flex-col gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" /> Now shipping
      </p>
      <ul className="flex flex-col gap-2 text-muted-foreground">
        {["Spring-driven flip cards", "Radial navigation", "A rolling bulk-actions bar"].map(
          (item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden="true" />
              {item}
            </li>
          ),
        )}
      </ul>
      <div className="mt-auto flex gap-2">
        {[
          { label: "Email", icon: Mail },
          { label: "Profile", icon: AtSign },
          { label: "Website", icon: Globe },
        ].map(({ label, icon: Icon }) => (
          <a
            key={label}
            href="#profile"
            aria-label={label}
            className="grid size-9 place-items-center rounded-full border border-border hover:bg-accent"
          >
            <Icon className="size-4" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof FlipCard> = {
  title: "Display/Flip Card",
  component: FlipCard,
  args: {
    front: <Front />,
    back: <Back />,
    trigger: "click",
    axis: "y",
    size: "md",
    lean: 6,
    disabled: false,
    className: "max-w-sm",
  },
  argTypes: {
    trigger: { control: "inline-radio", options: ["click", "hover"] },
    axis: { control: "inline-radio", options: ["y", "x"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    front: { control: false },
    back: { control: false },
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[min(24rem,90vw)]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FlipCard>;

/**
 * Move the pointer over the card: it leans toward you. Press the corner
 * button and it lifts, turns over, and a sheen sweeps across both faces.
 */
export const Default: Story = {};

/** Turns over while the mouse rests on it. The corner button stays for keyboard and touch. */
export const Hover: Story = {
  args: { trigger: "hover" },
};

/** Turning around the horizontal axis, like a calendar page. */
export const VerticalAxis: Story = {
  args: {
    axis: "x",
    front: (
      <div className="grid min-h-40 place-items-center text-center">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Question</p>
          <p className="mt-2 text-lg font-semibold">What does `inert` do?</p>
        </div>
      </div>
    ),
    back: (
      <div className="grid min-h-40 place-items-center text-center">
        <p className="text-muted-foreground">
          It removes a subtree from the Tab order and the accessibility tree, and makes it
          ignore the pointer.
        </p>
      </div>
    ),
    flipLabel: "Show answer",
    backClassName: "bg-secondary text-secondary-foreground",
  },
};

function ControlledDemo() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid w-full grid-cols-3 gap-3">
        {["sm", "md", "lg"].map((size) => (
          <FlipCard
            key={size}
            size={size as "sm" | "md" | "lg"}
            flipped={flipped}
            onFlippedChange={setFlipped}
            front={<p className="font-semibold">{size}</p>}
            back={<p className="text-muted-foreground">back</p>}
            backClassName="bg-accent text-accent-foreground"
          />
        ))}
      </div>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        onClick={() => {
          setFlipped((current) => !current);
        }}
      >
        Turn them all
      </button>
    </div>
  );
}

/** Controlled: one state turns every size at once. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledDemo />,
};
