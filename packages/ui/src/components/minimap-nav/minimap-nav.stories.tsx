import type { Meta, StoryObj } from "@storybook/react-vite";

import { MinimapNav, type MinimapNavKind, type MinimapNavSection } from "./minimap-nav";

type Block = { heading?: 1 | 2 | 3; title: string; paragraphs: number };

/** A docs page: a title, feature groups, their sections, and plenty of body rhythm. */
const OUTLINE: Block[] = [
  { heading: 1, title: "Getting started", paragraphs: 2 },
  { title: "What you get", paragraphs: 1 },
  { heading: 2, title: "Installation", paragraphs: 1 },
  { heading: 3, title: "With the CLI", paragraphs: 2 },
  { heading: 3, title: "By hand", paragraphs: 1 },
  { title: "Peer dependencies", paragraphs: 1 },
  { heading: 2, title: "Theming", paragraphs: 1 },
  { heading: 3, title: "Tokens", paragraphs: 2 },
  { heading: 3, title: "Dark mode", paragraphs: 1 },
  { title: "Presets", paragraphs: 1 },
  { title: "Motion scale", paragraphs: 1 },
  { heading: 2, title: "Components", paragraphs: 1 },
  { heading: 3, title: "Composition", paragraphs: 2 },
  { title: "Variants", paragraphs: 1 },
  { title: "Refs and props", paragraphs: 1 },
  { heading: 1, title: "Reference", paragraphs: 1 },
  { heading: 2, title: "API", paragraphs: 2 },
  { title: "Changelog", paragraphs: 1 },
];

const LOREM =
  "Every component is a single file you own. Read it, change it, and keep the parts you need; the registry installs " +
  "exactly what the source imports, and nothing else. Motion derives from one scale, so turning it down turns " +
  "everything down together.";

const slug = (prefix: string, title: string) =>
  `${prefix}-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;

function sectionsFor(prefix: string, withKinds = false): MinimapNavSection[] {
  const kinds: Record<number, MinimapNavKind> = { 1: "title", 2: "subtitle", 3: "section" };
  return OUTLINE.map((block) => ({
    id: slug(prefix, block.title),
    label: block.title,
    ...(withKinds ? { kind: block.heading ? kinds[block.heading] : "body" } : {}),
  }));
}

const HEADING_TAG = { 1: "h1", 2: "h2", 3: "h3" } as const;

function Article({ prefix }: { prefix: string }) {
  return (
    <article className="grid gap-6 pe-4 text-sm leading-relaxed text-muted-foreground">
      {OUTLINE.map((block) => {
        const id = slug(prefix, block.title);
        const Heading = block.heading ? HEADING_TAG[block.heading] : null;
        return (
          <section key={id} id={id} className="grid scroll-mt-4 gap-2">
            {Heading ? (
              <Heading
                className={
                  block.heading === 1
                    ? "text-2xl font-semibold text-foreground"
                    : block.heading === 2
                      ? "text-lg font-semibold text-foreground"
                      : "text-base font-medium text-foreground"
                }
              >
                {block.title}
              </Heading>
            ) : null}
            {Array.from({ length: block.paragraphs }, (_, index) => (
              <p key={index}>{LOREM}</p>
            ))}
          </section>
        );
      })}
    </article>
  );
}

/** The minimap beside an internal scroll area; the component finds the scroller itself. */
function Layout({
  prefix,
  side = "start",
  withKinds = false,
}: {
  prefix: string;
  side?: "start" | "end";
  withKinds?: boolean;
}) {
  const map = (
    <MinimapNav sections={sectionsFor(prefix, withKinds)} side={side} className="self-center" />
  );
  return (
    <div className="flex w-full max-w-2xl gap-8 rounded-xl border border-border bg-background p-6">
      {side === "start" ? map : null}
      <div
        // A named, focusable region so keyboard users can scroll it too.
        role="region"
        aria-label="Article"
        tabIndex={0}
        className="h-96 flex-1 overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        <Article prefix={prefix} />
      </div>
      {side === "end" ? map : null}
    </div>
  );
}

const meta = {
  title: "Navigation/Minimap Nav",
  component: MinimapNav,
  args: { sections: sectionsFor("default"), side: "start", activeOffset: 80 },
  argTypes: {
    side: { control: "inline-radio", options: ["start", "end"] },
    sections: { control: false },
  },
  parameters: { layout: "centered" },
  render: (args) => (
    <div className="flex w-full max-w-2xl gap-8 rounded-xl border border-border bg-background p-6">
      <MinimapNav {...args} className="self-center" />
      <div
        role="region"
        aria-label="Article"
        tabIndex={0}
        className="h-96 flex-1 overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        <Article prefix="default" />
      </div>
    </div>
  ),
} satisfies Meta<typeof MinimapNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Move the pointer over the dashes to swell the ones nearby; scroll the article
 * to see the current section pulse; click a dash to jump to it. Weights here
 * are inferred from the first heading in each section.
 */
export const Default: Story = {};

/** On the end side, the dashes grow from the end edge and the labels open toward the page. */
export const EndSide: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Layout prefix="end" side="end" />,
};

/** Weights set with `kind` rather than read from the DOM — for MDX or generated content. */
export const ExplicitKinds: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Layout prefix="kinds" withKinds />,
};

/** Just the stack, one dash of each weight, at rest. */
export const Weights: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <MinimapNav
      aria-label="Weights"
      className="w-24"
      sections={[
        { id: "w-title", label: "Title", kind: "title" },
        { id: "w-subtitle", label: "Subtitle", kind: "subtitle" },
        { id: "w-section", label: "Section", kind: "section" },
        { id: "w-body", label: "Body", kind: "body" },
      ]}
    />
  ),
};
