import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { StarRating } from "./star-rating";

const meta = {
  title: "Form/Star Rating",
  component: StarRating,
  args: { size: "md", defaultValue: 3 },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof StarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a star, or Tab in and use the arrow keys. */
export const Default: Story = {};

/** Swaps between 5 and 3 every second, the way the reference plays, with its pink accent. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: function Demo() {
    const [value, setValue] = useState(5);
    useEffect(() => {
      const timer = setInterval(() => setValue((v) => (v === 5 ? 3 : 5)), 1000);
      return () => clearInterval(timer);
    }, []);
    return (
      <div className="dark flex size-64 items-center justify-center rounded-3xl bg-[#161618] p-10">
        <StarRating value={value} onValueChange={setValue} accent="#f4c6ea" />
      </div>
    );
  },
};

/** Your own words for each score; their count sets the number of stars. */
export const CustomLabels: Story = {
  args: { labels: ["Poor", "Fair", "Good"], defaultValue: 2 },
};

/** Three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <StarRating size="sm" defaultValue={4} label="Small" />
      <StarRating size="md" defaultValue={4} label="Medium" />
      <StarRating size="lg" defaultValue={4} label="Large" />
    </div>
  ),
};
