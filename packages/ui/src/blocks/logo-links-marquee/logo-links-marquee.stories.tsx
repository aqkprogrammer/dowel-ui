import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { LogoLinksMarqueeBlock, type LogoLinksMarqueeLogo } from "./logo-links-marquee";

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

const PLACEHOLDER_LOGOS: LogoLinksMarqueeLogo[] = NAMES.map((name, index) => ({
  name,
  href: "#",
  logo: <Placeholder label={name} shape={SHAPES[index % 3] ?? "circle"} />,
}));

const meta: Meta<typeof LogoLinksMarqueeBlock> = {
  title: "Blocks/Logo links marquee",
  component: LogoLinksMarqueeBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof LogoLinksMarqueeBlock>;

/** SmoothUI "Logo Cloud 2": linked logos looping past, popping in and tilting on hover. */
export const Default: Story = {
  args: { logos: PLACEHOLDER_LOGOS },
};

/** Every source item: SmoothUI "Logo Cloud 2" (Logo Cloud Animated), with its default copy. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <LogoLinksMarqueeBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Logo Cloud 2 — Logo Cloud Animated (brand marks replaced by wordmarks)
      </figcaption>
    </figure>
  ),
};

/** Faster, for a long list. */
export const Fast: Story = {
  args: { logos: PLACEHOLDER_LOGOS, speed: 90 },
};
