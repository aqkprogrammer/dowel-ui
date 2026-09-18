import type { Meta, StoryObj } from "@storybook/react-vite";

import { FocusBlurLink, FocusBlurLinks } from "./focus-blur-links";

const meta = {
  title: "Navigation/Focus Blur Links",
  component: FocusBlurLinks,
  args: { size: "md", blurAmount: 4, dimOpacity: 0.4, showBrackets: true },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    blurAmount: { control: { type: "range", min: 0, max: 12, step: 1 } },
    dimOpacity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
  render: (args) => (
    <nav aria-label="Social">
      <FocusBlurLinks {...args}>
        <FocusBlurLink href="#twitter">@Twitter</FocusBlurLink>
        <FocusBlurLink href="#threads">@Threads</FocusBlurLink>
        <FocusBlurLink href="#instagram">@Instagram</FocusBlurLink>
        <FocusBlurLink href="#github">@GitHub</FocusBlurLink>
      </FocusBlurLinks>
    </nav>
  ),
} satisfies Meta<typeof FocusBlurLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover a link, or Tab to one: the rest blur and dim. */
export const Default: Story = {};

/** amicro's "Focus Blur Links" button item, reproduced as it appears in the demo. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <nav aria-label="Social, small">
        <FocusBlurLinks size="sm">
          <FocusBlurLink href="#x">@X</FocusBlurLink>
          <FocusBlurLink href="#threads">@Threads</FocusBlurLink>
          <FocusBlurLink href="#github">@GitHub</FocusBlurLink>
        </FocusBlurLinks>
      </nav>
      <nav aria-label="Social, large">
        <FocusBlurLinks size="lg">
          <FocusBlurLink href="#twitter">@Twitter</FocusBlurLink>
          <FocusBlurLink href="#threads">@Threads</FocusBlurLink>
          <FocusBlurLink href="#instagram">@Instagram</FocusBlurLink>
          <FocusBlurLink href="#github">@GitHub</FocusBlurLink>
        </FocusBlurLinks>
      </nav>
    </div>
  ),
};

export const WithoutBrackets: Story = {
  args: { showBrackets: false },
};
