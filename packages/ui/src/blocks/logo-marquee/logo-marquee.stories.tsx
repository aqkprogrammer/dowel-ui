import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { LogoMarqueeBlock, type LogoMarqueeLogo } from "./logo-marquee";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

/** A neutral placeholder mark: a shape and a made-up wordmark, never a real brand. */
function Placeholder({
  label,
  shape,
}: {
  label: string;
  shape: "circle" | "square" | "diamond";
}) {
  return (
    <svg viewBox="0 0 160 40" className="h-10 w-auto" role="presentation">
      {shape === "circle" ? <circle cx="20" cy="20" r="15" /> : null}
      {shape === "square" ? <rect x="5" y="5" width="30" height="30" rx="8" /> : null}
      {shape === "diamond" ? <path d="M20 3 37 20 20 37 3 20z" /> : null}
      <text x="46" y="27" fontSize="22" fontWeight="600" fontFamily="inherit">
        {label}
      </text>
    </svg>
  );
}

const SHAPES = ["circle", "square", "diamond"] as const;
const NAMES = [
  "Lumen",
  "Halcyon",
  "Meridian",
  "Tessera",
  "Quarry",
  "Oakline",
  "Brightwell",
  "Solace",
];

const PLACEHOLDER_LOGOS: LogoMarqueeLogo[] = NAMES.map((name, index) => ({
  name,
  logo: <Placeholder label={name} shape={SHAPES[index % 3] ?? "circle"} />,
}));

const meta: Meta<typeof LogoMarqueeBlock> = {
  title: "Blocks/Logo marquee",
  component: LogoMarqueeBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof LogoMarqueeBlock>;

/** SmoothUI "Logo Cloud 3": a dimmed row of logos at the normal speed. */
export const Default: Story = {
  args: { logos: PLACEHOLDER_LOGOS },
};

/** Every source item: SmoothUI "Logo Cloud 3" (Logo Marquee), with its default copy. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <LogoMarqueeBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Logo Cloud 3 — Logo Marquee (brand marks replaced by wordmarks)
      </figcaption>
    </figure>
  ),
};

/** The source's `speed="slow"` and `direction="right"`. */
export const SlowReversed: Story = {
  args: { logos: PLACEHOLDER_LOGOS, speed: "slow", reverse: true },
};

/** `pauseOnHover={false}`: only the button stops it. */
export const NoHoverPause: Story = {
  args: { logos: PLACEHOLDER_LOGOS, speed: "fast", pauseOnHover: false },
};
