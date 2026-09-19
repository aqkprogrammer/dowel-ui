import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";

import {
  type ToolStatus,
  Tool,
  ToolContent,
  ToolHeader,
  ToolPayload,
  ToolSection,
} from "./ai-tool";

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

const LIFECYCLE: ToolStatus[] = ["pending", "running", "success"];

/**
 * `indicator="ring"`: one ring through the whole lifecycle — it breathes while
 * queued, spins with a gap while running, then draws a check or a cross. The
 * status word stays. Motion from SmoothUI AI Tool Call.
 */
export const RingIndicator: Story = {
  render: function RingIndicator() {
    const [step, setStep] = useState(0);
    const [fail, setFail] = useState(false);
    useEffect(() => {
      if (step >= LIFECYCLE.length - 1) return;
      const timer = setTimeout(() => {
        setStep((current) => current + 1);
      }, 1400);
      return () => {
        clearTimeout(timer);
      };
    }, [step]);
    const status: ToolStatus =
      step === LIFECYCLE.length - 1 && fail ? "error" : (LIFECYCLE[step] ?? "pending");

    return (
      <div className="grid gap-3">
        <Tool status={status}>
          <ToolHeader name="search_web" status={status} indicator="ring" />
          <ToolContent>
            <ToolPayload label="Arguments">
              {JSON.stringify({ query: "rings" }, null, 2)}
            </ToolPayload>
          </ToolContent>
        </Tool>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFail(false);
              setStep(0);
            }}
          >
            Replay
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFail(true);
              setStep(0);
            }}
          >
            Replay, failing
          </Button>
        </div>
        {(["pending", "running", "success", "error"] as const).map((value) => (
          <Tool key={value} status={value}>
            <ToolHeader name={`status_${value}`} status={value} indicator="ring" />
          </Tool>
        ))}
      </div>
    );
  },
};

/** `summary` puts a short note before the status: a count, a duration. */
export const WithSummary: Story = {
  render: () => (
    <div className="grid gap-2">
      <Tool status="success">
        <ToolHeader name="search_web" status="success" summary="3 sources" indicator="ring" />
      </Tool>
      <Tool status="success">
        <ToolHeader name="read_file" status="success" summary="1.2s" />
      </Tool>
    </div>
  ),
};
