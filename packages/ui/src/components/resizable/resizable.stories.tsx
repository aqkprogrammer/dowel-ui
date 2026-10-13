import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

const meta = {
  title: "Layout/Resizable",
  component: ResizablePanelGroup,
  args: { direction: "horizontal" },
  argTypes: {
    direction: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function Pane({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/** Two panels. Drag the line, or tab to it and use the arrow keys. */
export const Default: Story = {
  render: (args) => (
    <ResizablePanelGroup
      {...args}
      className="h-72 w-[min(40rem,92vw)] rounded-xl border border-border bg-card"
    >
      <ResizablePanel defaultSize={35} minSize={20}>
        <Pane title="Files">components/ · hooks/ · lib/</Pane>
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize files" />
      <ResizablePanel minSize={30}>
        <Pane title="Editor">export function Carousel() {"{ … }"}</Pane>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/** An editor layout: a collapsible sidebar (Enter on its handle), and a preview under the code. */
export const EditorLayout: Story = {
  render: function Render(args) {
    const [layout, setLayout] = useState<number[]>([]);
    return (
      <div className="grid gap-2">
        <ResizablePanelGroup
          {...args}
          onLayout={setLayout}
          className="h-96 w-[min(48rem,94vw)] rounded-xl border border-border bg-card"
        >
          <ResizablePanel defaultSize={22} minSize={14} maxSize={40} collapsible>
            <Pane title="Sidebar">Collapse me with Enter, or drag me shut.</Pane>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize sidebar" />
          <ResizablePanel>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={25}>
                <Pane title="Code">const sizes = useLayout();</Pane>
              </ResizablePanel>
              <ResizableHandle withHandle aria-label="Resize preview" />
              <ResizablePanel minSize={15}>
                <Pane title="Preview">The rendered result.</Pane>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
        <p className="font-mono text-xs text-muted-foreground">
          onLayout:{" "}
          {layout.length > 0 ? layout.map((size) => size.toFixed(0)).join(" / ") : "—"}
        </p>
      </div>
    );
  },
};
