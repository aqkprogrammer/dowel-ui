import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState, type ReactNode } from "react";

import { ScrollProgress, type ScrollProgressProps } from "./scroll-progress";

const PARAGRAPH =
  "Long pages hide their own length. A thin bar at the edge gives the reader a steady sense of how much is left " +
  "without another block of chrome. It fills from the start edge as the content moves, and a spring smooths out " +
  "the steps that scroll events arrive in.";

function Paragraphs({ count = 14 }: { count?: number }) {
  return (
    <div className="grid gap-4 p-6 text-sm leading-relaxed text-muted-foreground">
      <h2 className="text-lg font-semibold text-foreground">Reading progress</h2>
      {Array.from({ length: count }, (_, index) => (
        <p key={index}>{PARAGRAPH}</p>
      ))}
    </div>
  );
}

/** A card-sized scroll area with its own bar across the top. */
function ScrollArea({ children, ...props }: ScrollProgressProps & { children?: ReactNode }) {
  // A callback ref into state, so the bar re-renders once the element exists.
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-background">
      <ScrollProgress container={element} position="static" {...props} />
      <div
        ref={setElement}
        role="region"
        aria-label="Article"
        tabIndex={0}
        className="h-72 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset"
      >
        {children ?? <Paragraphs />}
      </div>
    </div>
  );
}

const meta = {
  title: "Navigation/Scroll Progress",
  component: ScrollProgress,
  args: { size: "sm" },
  argTypes: {
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
    position: { control: false },
    container: { control: false },
  },
  parameters: { layout: "centered" },
  render: (args) => <ScrollArea {...args} />,
} satisfies Meta<typeof ScrollProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Scroll the article: the bar above it fills in step, a little behind on a spring. */
export const Default: Story = {};

/** Pinned to the top of the viewport and tracking the whole page — the usual placement. */
export const Page: Story = {
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    // Fixed to the viewport, so it needs a frame of its own on the docs page.
    docs: { story: { inline: false, iframeHeight: 360 } },
  },
  render: () => (
    <>
      <ScrollProgress />
      <Paragraphs count={30} />
    </>
  ),
};

/** Colour the fill with a text utility and give the track a background. */
export const Themed: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ScrollArea size="md" className="bg-muted text-primary" />,
};

/** The four thicknesses. Two to four pixels registers without competing with the content. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const ref = useRef<HTMLDivElement>(null);
    return (
      <div className="grid w-full max-w-md gap-3">
        {(["xs", "sm", "md", "lg"] as const).map((size) => (
          <figure key={size} className="grid gap-1">
            <ScrollProgress
              container={ref}
              position="static"
              size={size}
              className="bg-muted"
            />
            <figcaption className="text-xs text-muted-foreground">{size}</figcaption>
          </figure>
        ))}
        <div
          ref={ref}
          role="region"
          aria-label="Article"
          tabIndex={0}
          className="h-48 overflow-y-auto rounded-xl border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
        >
          <Paragraphs />
        </div>
      </div>
    );
  },
};

/** Right to left: the fill grows from the right, the start edge. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" lang="ar" className="w-full max-w-md">
      <ScrollArea />
    </div>
  ),
};
