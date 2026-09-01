import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { CodeBlock } from "./code-block";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[34rem]">
    <Story />
  </div>
);

const SAMPLE = `export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}`;

const meta = {
  title: "Data/Code Block",
  component: CodeBlock,
  args: { language: "ts", children: SAMPLE },
  decorators: [withFixedWidth],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFilename: Story = {
  args: { title: "lib/utils.ts" },
};

export const WithoutCopy: Story = {
  args: { hideCopy: true },
};

/** Overflowing code: the pre is focusable, so it can be scrolled by keyboard. */
export const Overflowing: Story = {
  args: {
    title: "one-liner.ts",
    children:
      'const message = "a single very long line that runs well past the edge of the container and keeps going for a while yet";',
  },
};

/**
 * Highlighting is left to the application. Pass rendered markup as children and
 * the real text as `code`, since reading text back out of highlighted DOM loses
 * whitespace in ways that break pasted code.
 */
export const PreHighlighted: Story = {
  args: {
    title: "highlighted.ts",
    code: 'const answer = "Paris";',
    children: (
      <>
        <span className="text-info">const</span> answer{" "}
        <span className="text-muted-foreground">=</span>{" "}
        <span className="text-success">&quot;Paris&quot;</span>;
      </>
    ),
  },
};
