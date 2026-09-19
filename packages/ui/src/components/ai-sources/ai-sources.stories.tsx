import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Response } from "@/components/ai-response";

import {
  InlineCitation,
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
  sourceHost,
} from "./ai-sources";

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

/** A token-coloured dot standing in for a site's favicon. */
function Mark({ tone }: { tone: "primary" | "success" | "warning" | "info" }) {
  const background = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  }[tone];
  return <span className={`block ${background}`} />;
}

const LINKED = [
  {
    title: "Tables — ARIA Authoring Practices",
    href: "https://www.w3.org/WAI/ARIA/apg/",
    tone: "primary" as const,
  },
  {
    title: "Scrollable regions",
    href: "https://developer.mozilla.org/docs/Web",
    tone: "success" as const,
  },
  {
    title: "Focus management",
    href: "https://www.a11yproject.com/posts/",
    tone: "warning" as const,
  },
  {
    title: "Keyboard-accessible scroll areas",
    href: "https://webaim.org/techniques/",
    tone: "info" as const,
  },
];

/**
 * Favicons overlap in the trigger, fan out on hover or keyboard focus, and
 * collapse to "+n" past three; rows rise in one after another when the list
 * opens. Motion from SmoothUI AI Sources. `sourceHost()` fills the origin.
 */
export const WithFavicons: Story = {
  render: () => (
    <Sources>
      <SourcesTrigger
        count={LINKED.length}
        favicons={LINKED.map((source) => (
          <Mark key={source.href} tone={source.tone} />
        ))}
      />
      <SourcesContent>
        {LINKED.map((source, position) => (
          <Source
            key={source.href}
            index={position + 1}
            title={source.title}
            href={source.href}
            origin={sourceHost(source.href)}
            favicon={<Mark tone={source.tone} />}
          />
        ))}
      </SourcesContent>
    </Sources>
  ),
};

/**
 * `preview` opens a card on hover and on keyboard focus — host, title and an
 * excerpt — that scales from the marker and closes on Escape. It describes the
 * link only while open. Motion from SmoothUI AI Citation.
 */
export const CitationPreview: Story = {
  render: () => (
    <Response>
      Scrollable regions must be reachable by keyboard
      <InlineCitation
        index={1}
        title={LINKED[0]?.title ?? ""}
        href={LINKED[0]?.href}
        description="Make a scrollable region focusable so keyboard users can scroll it."
        favicon={<Mark tone="primary" />}
        preview
      />
      , and focus should never land on an element that is not rendered
      <InlineCitation index={2} title={LINKED[2]?.title ?? ""} href={LINKED[2]?.href} preview />
      .
    </Response>
  ),
};
