import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { LogoGridTooltipsBlock, type LogoGridLogo } from "./logo-grid-tooltips";

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

const PLACEHOLDER_LOGOS: LogoGridLogo[] = NAMES.map((name, index) => ({
  name,
  href: "#",
  logo: <Placeholder label={name} shape={SHAPES[index % 3] ?? "circle"} />,
}));

const meta: Meta<typeof LogoGridTooltipsBlock> = {
  title: "Blocks/Logo grid tooltips",
  component: LogoGridTooltipsBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof LogoGridTooltipsBlock>;

/** SmoothUI "Logo Cloud 4": eight linked logos in four columns, named on hover or focus. */
export const Default: Story = {
  args: { logos: PLACEHOLDER_LOGOS },
};

/** Every source item: SmoothUI "Logo Cloud 4" (Logo Grid), with its default copy. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <LogoGridTooltipsBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Logo Cloud 4 — Logo Grid (brand marks replaced by wordmarks)
      </figcaption>
    </figure>
  ),
};

/** The source's `columns` prop: three, five and six. */
export const Columns: Story = {
  render: () => (
    <div className="flex flex-col">
      <LogoGridTooltipsBlock
        heading="Three columns"
        logos={PLACEHOLDER_LOGOS.slice(0, 6)}
        columns={3}
      />
      <LogoGridTooltipsBlock
        heading="Five columns"
        logos={PLACEHOLDER_LOGOS.slice(0, 5)}
        columns={5}
      />
      <LogoGridTooltipsBlock
        heading="Six columns"
        logos={PLACEHOLDER_LOGOS.slice(0, 6)}
        columns={6}
      />
    </div>
  ),
};
