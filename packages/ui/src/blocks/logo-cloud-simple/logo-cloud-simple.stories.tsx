import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { LogoCloudSimpleBlock, type LogoCloudSimpleLogo } from "./logo-cloud-simple";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
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
    <svg viewBox="0 0 140 32" className="h-8 w-auto" role="presentation">
      {shape === "circle" ? <circle cx="16" cy="16" r="12" /> : null}
      {shape === "square" ? <rect x="4" y="4" width="24" height="24" rx="6" /> : null}
      {shape === "diamond" ? <path d="M16 2 30 16 16 30 2 16z" /> : null}
      <text x="38" y="22" fontSize="18" fontWeight="600" fontFamily="inherit">
        {label}
      </text>
    </svg>
  );
}

const PLACEHOLDER_LOGOS: LogoCloudSimpleLogo[] = [
  { name: "Lumen", logo: <Placeholder label="Lumen" shape="circle" /> },
  { name: "Halcyon", logo: <Placeholder label="Halcyon" shape="square" /> },
  { name: "Meridian", logo: <Placeholder label="Meridian" shape="diamond" /> },
  { name: "Tessera", logo: <Placeholder label="Tessera" shape="circle" /> },
  { name: "Quarry", logo: <Placeholder label="Quarry" shape="square" /> },
  { name: "Oakline", logo: <Placeholder label="Oakline" shape="diamond" /> },
  { name: "Brightwell", logo: <Placeholder label="Brightwell" shape="circle" /> },
  { name: "Solace", logo: <Placeholder label="Solace" shape="square" /> },
];

const meta: Meta<typeof LogoCloudSimpleBlock> = {
  title: "Blocks/Logo cloud simple",
  component: LogoCloudSimpleBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof LogoCloudSimpleBlock>;

/** SmoothUI "Logo Cloud 1": four logos in a still grid, dimmed until hovered. */
export const Default: Story = {
  args: { logos: PLACEHOLDER_LOGOS.slice(0, 4) },
};

/** Every source item: SmoothUI "Logo Cloud 1" (Logo Cloud Simple), with its default copy. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <LogoCloudSimpleBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Logo Cloud 1 — Logo Cloud Simple (brand marks replaced by wordmarks)
      </figcaption>
    </figure>
  ),
};

/** Eight linked logos: each is a real link named after its organisation. */
export const Linked: Story = {
  args: {
    logos: PLACEHOLDER_LOGOS.map((entry) => ({ ...entry, href: "#" })),
  },
};
