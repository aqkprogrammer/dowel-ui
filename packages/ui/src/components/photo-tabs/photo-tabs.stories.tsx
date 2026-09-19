import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dog, Map as MapIcon, User } from "lucide-react";

import { PhotoTabs, type PhotoTab } from "./photo-tabs";

const TABS: PhotoTab[] = [
  {
    value: "one",
    label: "People",
    icon: <User />,
    src: "https://picsum.photos/seed/summer/600/400",
  },
  { value: "two", label: "Pets", icon: <Dog />, src: "https://picsum.photos/seed/dog/600/400" },
  {
    value: "three",
    label: "Places",
    icon: <MapIcon />,
    src: "https://picsum.photos/seed/surf/600/400",
  },
];

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof PhotoTabs> = {
  title: "Display/Photo Tabs",
  component: PhotoTabs,
  args: { tabs: TABS, height: 300, barPosition: "bottom", revealOnHover: true },
  argTypes: { barPosition: { control: "select", options: ["bottom", "top"] } },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PhotoTabs>;

/** Hover the photo (or Tab into it) to reveal the bar. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Phototab" → three icon tabs (user, dog, map) over 300px photos,
 *   the bar revealed on hover. It is Dowel's Tabs underneath, and the bar is
 *   revealed on keyboard focus as well as hover.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-4">
      <PhotoTabs tabs={TABS} defaultValue="one" height={300} />
      <figcaption className="text-xs text-muted-foreground">SmoothUI · Phototab</figcaption>
    </figure>
  ),
};

export const AlwaysVisibleBar: Story = { args: { revealOnHover: false } };

export const BarOnTop: Story = { args: { barPosition: "top", revealOnHover: false } };
