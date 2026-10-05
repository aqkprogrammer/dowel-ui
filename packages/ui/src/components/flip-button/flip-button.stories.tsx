import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  Download,
  FileDown,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { FlipButton } from "./flip-button";

const meta = {
  title: "Form/Flip Button",
  component: FlipButton,
  args: {
    front: (
      <>
        <Sparkles /> Get started
      </>
    ),
    back: (
      <>
        It&apos;s free <ArrowRight />
      </>
    ),
    variant: "primary",
    backVariant: "gradient",
    axis: "y",
    trigger: "hover",
    size: "lg",
    shape: "pill",
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "soft", "gradient"],
    },
    backVariant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "soft", "gradient"],
    },
    axis: { control: "inline-radio", options: ["y", "x"] },
    trigger: { control: "inline-radio", options: ["hover", "press"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
    shape: { control: "inline-radio", options: ["default", "pill", "square"] },
    front: { control: false },
    back: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FlipButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to it: the button turns over on a spring, overshooting a little before it settles. */
export const Default: Story = {};

function Captioned({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      {children}
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** `y` turns like a card on a table; `x` tumbles over its top edge. */
export const Axes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end justify-center gap-10">
      <Captioned caption="axis y">
        <FlipButton
          shape="pill"
          front="Hover me"
          back={
            <>
              Nice <Check />
            </>
          }
          backVariant="soft"
        />
      </Captioned>
      <Captioned caption="axis x">
        <FlipButton
          axis="x"
          variant="outline"
          backVariant="primary"
          front={
            <>
              <Download /> Download
            </>
          }
          back={
            <>
              <FileDown /> PDF · 2.4 MB
            </>
          }
        />
      </Captioned>
      <Captioned caption="icon · x">
        <FlipButton
          axis="x"
          size="icon"
          shape="pill"
          variant="secondary"
          backVariant="primary"
          aria-label="Notifications"
          front={<Bell />}
          back={<BellRing />}
        />
      </Captioned>
    </div>
  ),
};

function FollowDemo() {
  const [following, setFollowing] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <FlipButton
        trigger="press"
        shape="pill"
        size="lg"
        flipped={following}
        onFlippedChange={setFollowing}
        variant="primary"
        backVariant="outline"
        front={
          <>
            <UserPlus /> Follow
          </>
        }
        back={
          <>
            <Check /> Following
          </>
        }
      />
      <p className="text-xs text-muted-foreground">
        {following ? "You follow @dowel." : "Press to toggle — it stays turned."}
      </p>
    </div>
  );
}

/** `trigger="press"` is a toggle with `aria-pressed`; the name stays "Follow". */
export const PressToggle: Story = {
  parameters: { controls: { disable: true } },
  render: () => <FollowDemo />,
};

/** Each face is a Button surface, so every Button variant is available on either side. */
export const Surfaces: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <FlipButton front="Primary" back="Gradient" backVariant="gradient" />
      <FlipButton variant="secondary" backVariant="primary" front="Secondary" back="Primary" />
      <FlipButton variant="ghost" backVariant="soft" front="Ghost" back="Soft" />
      <FlipButton
        variant="outline"
        backVariant="destructive"
        front="Outline"
        back="Destructive"
      />
    </div>
  ),
};
