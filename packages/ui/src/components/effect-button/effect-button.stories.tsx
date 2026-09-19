import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Apple,
  ArrowRight,
  Heart,
  Link,
  RefreshCw,
  Settings,
  Star,
  Trash2,
} from "lucide-react";

import { EffectButton, effectButtonEffects } from "./effect-button";

const meta = {
  title: "Form/Effect Button",
  component: EffectButton,
  args: {
    children: "Download for Mac",
    effect: "slide-arrow",
    icon: <Apple />,
    trailingIcon: <ArrowRight />,
    tone: "current",
    variant: "primary",
    size: "md",
  },
  argTypes: {
    effect: { control: "select", options: effectButtonEffects },
    tone: {
      control: "select",
      options: ["current", "primary", "success", "warning", "destructive", "info"],
    },
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
    icon: { table: { disable: true } },
    trailingIcon: { table: { disable: true } },
    asChild: { table: { disable: true } },
  },
} satisfies Meta<typeof EffectButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The amicro look — a pill on a faint surface that widens a little while active —
 * is Button's ghost variant plus a className, not a variant of its own.
 */
const pill =
  "h-9 rounded-full bg-foreground/5 px-6 text-[13px] tracking-tight hover:bg-foreground/10 hover:px-7 focus-visible:px-7 transition-[padding,background-color,color,box-shadow]";

/** Every amicro button of these interaction types, plus SmoothUI's Clip Corners Button. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <EffectButton
        variant="ghost"
        className={pill}
        effect="slide-arrow"
        icon={<Apple />}
        trailingIcon={<ArrowRight />}
      >
        Download for Mac
      </EffectButton>
      <EffectButton
        variant="ghost"
        className={pill}
        effect="pulse"
        icon={<Heart />}
        tone="destructive"
      >
        Sponsor
      </EffectButton>
      <EffectButton variant="ghost" className={pill} effect="rotate" icon={<Settings />}>
        Settings
      </EffectButton>
      <EffectButton
        variant="ghost"
        className={pill}
        effect="shake"
        icon={<Trash2 />}
        tone="destructive"
      >
        Delete
      </EffectButton>
      <EffectButton variant="ghost" className={pill} effect="rotate" icon={<RefreshCw />}>
        Reload
      </EffectButton>
      <EffectButton variant="ghost" className={pill} effect="glare" icon={<Star />}>
        Glare Shine
      </EffectButton>
      <EffectButton variant="ghost" className={pill} effect="text-reveal" icon={<ArrowRight />}>
        Text Reveal
      </EffectButton>
      <EffectButton variant="ghost" className={pill} effect="expand-ring" icon={<Link />}>
        Expand Ring
      </EffectButton>
      <EffectButton
        variant="primary"
        effect="clip-corners"
        className="h-auto rounded-lg bg-foreground px-8 py-4 font-mono text-2xl text-background hover:bg-foreground/90"
      >
        Clip Corners
      </EffectButton>
    </div>
  ),
};

/** Each effect on Button's own variants: the effect composes with any of them. */
export const Effects: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {effectButtonEffects.map((effect) => (
        <EffectButton
          key={effect}
          effect={effect}
          variant="outline"
          icon={effect === "slide-arrow" ? <Apple /> : <Star />}
          trailingIcon={<ArrowRight />}
          tone="info"
        >
          {effect}
        </EffectButton>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["current", "primary", "success", "warning", "destructive", "info"] as const).map(
        (tone) => (
          <EffectButton key={tone} effect="shake" variant="ghost" icon={<Trash2 />} tone={tone}>
            {tone}
          </EffectButton>
        ),
      )}
    </div>
  ),
};

export const IconOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <EffectButton
        effect="rotate"
        size="icon"
        variant="outline"
        icon={<Settings />}
        aria-label="Settings"
      />
      <EffectButton
        effect="pulse"
        size="icon"
        variant="ghost"
        icon={<Heart />}
        tone="destructive"
        aria-label="Sponsor"
      />
      <EffectButton
        effect="expand-ring"
        size="icon"
        variant="secondary"
        icon={<Link />}
        aria-label="Copy link"
      />
    </div>
  ),
};

/** The arrow is directional, so it mirrors; the leading icon slides toward the start edge. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl">
      <EffectButton effect="slide-arrow" icon={<Apple />} trailingIcon={<ArrowRight />}>
        تنزيل لنظام Mac
      </EffectButton>
    </div>
  ),
};

export const AsLink: Story = {
  name: "asChild (renders a link)",
  parameters: { controls: { disable: true } },
  render: () => (
    <EffectButton
      asChild
      effect="slide-arrow"
      variant="outline"
      icon={<Apple />}
      trailingIcon={<ArrowRight />}
    >
      <a href="#download">Download for Mac</a>
    </EffectButton>
  ),
};
