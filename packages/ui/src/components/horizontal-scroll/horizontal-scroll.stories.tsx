import type { Meta, StoryObj } from "@storybook/react-vite";

import { HorizontalScroll, HorizontalScrollItem } from "./horizontal-scroll";

const meta = {
  title: "Effects/Horizontal Scroll",
  component: HorizontalScroll,
  args: { label: "Case studies", pin: true, gap: 24 },
  argTypes: {
    gap: { control: { type: "range", min: 0, max: 96, step: 4 } },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HorizontalScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

const STUDIES = [
  ["Atlas", "Cut onboarding from nine screens to three."],
  ["Borealis", "An agent console that operators trust."],
  ["Cirrus", "Billing that explains itself."],
  ["Delta", "A design system shipped in a fortnight."],
  ["Eon", "Dashboards that load before you blink."],
  ["Flux", "One registry for four product teams."],
];

/** Scroll down: the section pins and the studies slide across, then the page continues. Tab through the links too. */
export const Default: Story = {
  render: (args) => (
    <div>
      <div className="grid h-[70vh] place-items-center text-sm text-muted-foreground">
        Scroll down ↓
      </div>
      <HorizontalScroll {...args} trackClassName="px-[8vw]">
        {STUDIES.map(([name, line], index) => (
          <HorizontalScrollItem
            key={name}
            className="flex h-[60vh] w-[min(26rem,80vw)] flex-col justify-end rounded-2xl border border-border bg-card p-8 text-card-foreground"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${name}`}
              className="mt-2 text-2xl font-semibold tracking-tight hover:underline"
            >
              {name}
            </a>
            <p className="mt-2 text-sm text-muted-foreground">{line}</p>
          </HorizontalScrollItem>
        ))}
      </HorizontalScroll>
      <div className="grid h-[70vh] place-items-center text-sm text-muted-foreground">
        The page carries on.
      </div>
    </div>
  ),
};
