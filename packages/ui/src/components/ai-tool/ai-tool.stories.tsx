import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Tool, ToolContent, ToolHeader, ToolPayload, ToolSection } from "./ai-tool";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[32rem]">
    <Story />
  </div>
);

const meta = {
  title: "AI/Tool Call",
  component: Tool,
  args: { status: "success" },
  argTypes: {
    status: { control: "inline-radio", options: ["pending", "running", "success", "error"] },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Tool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tool {...args}>
      <ToolHeader name="search_web" status={args.status ?? "success"} />
      <ToolContent>
        <ToolSection label="Arguments">
          <ToolPayload label="Arguments">
            {JSON.stringify({ query: "accessible data tables", limit: 5 }, null, 2)}
          </ToolPayload>
        </ToolSection>
        <ToolSection label="Result">
          <ToolPayload label="Result">
            {JSON.stringify(
              { results: [{ title: "ARIA authoring practices", url: "https://example.org" }] },
              null,
              2,
            )}
          </ToolPayload>
        </ToolSection>
      </ToolContent>
    </Tool>
  ),
};

/** Status is always a word, never only a colour. */
export const Statuses: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      {(["pending", "running", "success", "error"] as const).map((status) => (
        <Tool key={status} status={status}>
          <ToolHeader name={`tool_${status}`} status={status} />
          <ToolContent>
            <ToolSection label="Result">
              <ToolPayload label="Result">{`Status: ${status}`}</ToolPayload>
            </ToolSection>
          </ToolContent>
        </Tool>
      ))}
    </div>
  ),
};

export const CustomStatusWording: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Tool status="running">
      <ToolHeader name="crawl_site" status="running" statusLabel="Fetching page 12 of 40" />
      <ToolContent>
        <ToolSection label="Progress">
          <ToolPayload label="Progress">Crawling https://example.org…</ToolPayload>
        </ToolSection>
      </ToolContent>
    </Tool>
  ),
};

export const Failed: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Tool status="error" defaultOpen>
      <ToolHeader name="read_file" status="error" />
      <ToolContent>
        <ToolSection label="Error">
          <ToolPayload label="Error">
            {"ENOENT: no such file or directory, open '/app/missing.ts'"}
          </ToolPayload>
        </ToolSection>
      </ToolContent>
    </Tool>
  ),
};
