import type { Meta, StoryObj } from "@storybook/react-vite";

import { SwitchboardCard } from "./switchboard-card";

/** The source demo's 5 × 18 pattern spelling NEXT. */
const NEXT_PATTERN = [
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
];

const meta: Meta<typeof SwitchboardCard> = {
  title: "Display/Switchboard Card",
  component: SwitchboardCard,
  args: {
    heading: "Random Lights",
    description: "Dynamic animated lights that cycle through states.",
    randomLights: true,
    columns: 18,
    rows: 5,
    interval: 200,
    variant: "default",
  },
  argTypes: {
    variant: { control: "select", options: ["default", "inverted"] },
    headingAs: { control: "select", options: ["h2", "h3", "h4", "p"] },
    gridPattern: { control: false },
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <SwitchboardCard {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * SmoothUI Switchboard Card: both demo cards (Random Lights, and the NEXT grid
 * pattern) and the documented `variant="next"` — `inverted` here.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
      <figure className="flex flex-col gap-2">
        <SwitchboardCard
          heading="Random Lights"
          description="Dynamic animated lights that cycle through states."
          randomLights
        />
        <figcaption className="text-xs text-muted-foreground">
          Switchboard Card — random lights
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <SwitchboardCard
          heading="Next"
          description="The power of full-stack to the frontend."
          gridPattern={NEXT_PATTERN}
          illustrationLabel="The word NEXT in lights"
        />
        <figcaption className="text-xs text-muted-foreground">
          Switchboard Card — grid pattern
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2 md:col-span-2">
        <SwitchboardCard
          heading="Next 16"
          description="The power of full-stack to the frontend."
          variant="inverted"
          gridPattern={NEXT_PATTERN}
          illustrationLabel="The word NEXT in lights"
        />
        <figcaption className="text-xs text-muted-foreground">
          Switchboard Card — variant &quot;next&quot;
        </figcaption>
      </figure>
    </div>
  ),
};

/** The whole card is one link. */
export const AsLink: Story = {
  args: { href: "#", heading: "Read the docs", description: "Everything in one place." },
};

/** asChild renders a button (or a router link) as the card. */
export const AsButton: Story = {
  args: { asChild: true, heading: "Open settings", description: "Opens a dialog." },
  render: (args) => (
    <SwitchboardCard {...args}>
      <button type="button" />
    </SwitchboardCard>
  ),
};
