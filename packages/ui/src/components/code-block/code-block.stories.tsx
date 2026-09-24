import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

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

const LONGER = `import { cva } from "class-variance-authority";

export const badgeVariants = cva("inline-flex items-center rounded-md", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      primary: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});
`;

const meta = {
  title: "Data/Code Block",
  component: CodeBlock,
  args: { language: "ts", children: SAMPLE },
  argTypes: {
    accent: { control: "color" },
    frame: { control: "boolean" },
    showHeader: { control: "boolean" },
    showLineNumbers: { control: "boolean" },
  },
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

/**
 * One colour re-shades the whole block: surface, border, header, text, line
 * numbers and highlights are mixed from it and the theme's own background and
 * foreground, so the ramp flips with light and dark mode. Pick a swatch; copy
 * to see the check spring in.
 */
export const Accent: Story = {
  args: { title: "badge.ts", children: undefined, code: LONGER, showLineNumbers: true },
  parameters: { controls: { exclude: ["accent"] } },
  render: function Render(args) {
    const swatches = ["#f75001", "#1a73f2", "#ff3b30", "#34c759", "#8e44ef"];
    const [accent, setAccent] = useState(swatches[0]);
    return (
      <div className="grid gap-3">
        <div className="flex gap-2" role="group" aria-label="Accent">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={swatch}
              aria-pressed={accent === swatch}
              onClick={() => setAccent(swatch)}
              className="size-6 rounded-full ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-ring"
              style={{ background: swatch }}
            />
          ))}
        </div>
        <CodeBlock {...args} accent={accent} highlightLines={[5, 6]} />
      </div>
    );
  },
};

/**
 * A gutter of line numbers, and highlighted lines. Both sit beside and under
 * the code rather than inside it, so they work on any highlighter's output;
 * the numbers cannot be selected or copied.
 */
export const LineNumbers: Story = {
  args: {
    title: "badge.ts",
    children: undefined,
    code: LONGER,
    showLineNumbers: true,
    highlightLines: [4, 5, 6, 7],
  },
};

/** Line features on pre-highlighted markup: the count is read from the rendered text. */
export const LineNumbersOnMarkup: Story = {
  args: {
    title: "highlighted.ts",
    showLineNumbers: true,
    highlightLines: [2],
    code: 'const answer = "Paris";\nconst question = "Capital of France?";',
    children: (
      <>
        <span className="text-info">const</span> answer{" "}
        <span className="text-muted-foreground">=</span>{" "}
        <span className="text-success">&quot;Paris&quot;</span>;{"\n"}
        <span className="text-info">const</span> question{" "}
        <span className="text-muted-foreground">=</span>{" "}
        <span className="text-success">&quot;Capital of France?&quot;</span>;
      </>
    ),
  },
};

/** Without a header the copy control floats over the top corner. */
export const WithoutHeader: Story = {
  args: { showHeader: false, accent: "#1a73f2" },
};

/** `frame={false}`: no surface, border, corners or header — just the code. */
export const Bare: Story = {
  args: { frame: false, showLineNumbers: true, children: undefined, code: LONGER },
};
