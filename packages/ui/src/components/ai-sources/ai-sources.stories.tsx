import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Response } from "@/components/ai-response";

import { InlineCitation, Source, Sources, SourcesContent, SourcesTrigger } from "./ai-sources";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[32rem]">
    <Story />
  </div>
);

const meta = {
  title: "AI/Sources",
  component: Sources,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Sources>;

export default meta;
type Story = StoryObj<typeof meta>;

const SOURCES = [
  {
    index: 1,
    title: "ARIA Authoring Practices — Table pattern",
    origin: "w3.org",
    excerpt: "Scrollable regions should be focusable so keyboard users can scroll them.",
  },
  {
    index: 2,
    title: "Accessible data tables",
    origin: "example.org",
    excerpt: "Native table semantics convey row and column position without extra ARIA.",
  },
];

/** Markers next to the claim, the list underneath saying what each one is. */
export const Default: Story = {
  render: () => (
    <div className="grid gap-3">
      <Response>
        A scroll container needs an explicit focus stop to be reachable by keyboard
        <InlineCitation index={1} title={SOURCES[0]!.title} href="#1" />, and native table
        semantics carry position without extra ARIA
        <InlineCitation index={2} title={SOURCES[1]!.title} href="#2" />.
      </Response>
      <Sources>
        <SourcesTrigger count={SOURCES.length} />
        <SourcesContent>
          {SOURCES.map((source) => (
            <Source key={source.index} {...source} href={`#${String(source.index)}`} />
          ))}
        </SourcesContent>
      </Sources>
    </div>
  ),
};

export const Expanded: Story = {
  render: () => (
    <Sources defaultOpen>
      <SourcesTrigger count={SOURCES.length} />
      <SourcesContent>
        {SOURCES.map((source) => (
          <Source key={source.index} {...source} href={`#${String(source.index)}`} />
        ))}
      </SourcesContent>
    </Sources>
  ),
};

/** A marker with nowhere to go renders as text, not a link that does nothing. */
export const WithoutLinks: Story = {
  render: () => (
    <Response>
      Internal policy requires two approvals
      <InlineCitation index={1} title="Engineering handbook, section 4" />.
    </Response>
  ),
};

export const SingleSource: Story = {
  render: () => (
    <Sources defaultOpen>
      <SourcesTrigger count={1} />
      <SourcesContent>
        <Source index={1} title="Engineering handbook" origin="internal" href="#1" />
      </SourcesContent>
    </Sources>
  ),
};
