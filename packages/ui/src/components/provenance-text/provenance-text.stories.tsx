import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";

import { Button } from "@/components/button";

import {
  ProvenanceInline,
  ProvenanceLegend,
  ProvenanceText,
  provenanceFromEdit,
  type ProvenanceAuthors,
  type ProvenanceSegment,
} from "./provenance-text";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const AUTHORS: ProvenanceAuthors = {
  you: { label: "You", kind: "person" },
  claude: { label: "Claude", kind: "agent" },
  study: { label: "Q2 activation study", kind: "source", href: "#q2-activation-study" },
};

const SEGMENTS: ProvenanceSegment[] = [
  { text: "Our onboarding asks for too much up front", author: "you" },
  { text: ": nine fields before the first screen", author: "claude" },
  { text: ". New teams drop off before they invite anyone", author: "you" },
  {
    text: ", and teams that never add a second person rarely stay past the trial",
    author: "claude",
  },
  { text: ". As the activation study put it, ", author: "you" },
  {
    text: "“the second seat is the strongest single predictor of a paid plan.”",
    author: "study",
  },
  { text: " We should ask for one teammate first and the rest later.", author: "you" },
];

const meta = {
  title: "AI/Provenance Text",
  component: ProvenanceText,
  decorators: [withWidth],
  args: { segments: SEGMENTS, authors: AUTHORS, defaultShow: true },
} satisfies Meta<typeof ProvenanceText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A product brief the person started, Claude extended and a study is quoted
 * in. Claude's words are highlighted with a solid underline; the study's have
 * a dashed one and link to it. Press the toggle to read it as plain text.
 */
export const Default: Story = {};

/** How it starts: ordinary text, with nothing extra on screen or to hear. */
export const Hidden: Story = {
  args: { defaultShow: false },
};

const DRAFT = "Support volume fell this quarter. Most of the drop came from billing questions.";
const CLAUDE_SENTENCE =
  "Tickets tagged “invoice” halved after the new invoice page shipped in May.";
const QUOTE = "“I stopped needing to ask.”";

const EDIT_AUTHORS: ProvenanceAuthors = {
  you: { label: "You", kind: "person" },
  claude: { label: "Claude", kind: "agent" },
  interview: { label: "Customer interview, 12 June", kind: "source" },
};

function Editor() {
  const fieldId = useId();
  const [segments, setSegments] = useState(() => provenanceFromEdit("", DRAFT, "you"));
  const text = segments.map((segment) => segment.text).join("");
  const append = (addition: string, author: string) => {
    setSegments(provenanceFromEdit(segments, `${text.trimEnd()} ${addition}`, author));
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={fieldId} className="text-sm font-medium">
        Summary
      </label>
      <textarea
        id={fieldId}
        value={text}
        rows={4}
        onChange={(event) => {
          setSegments(provenanceFromEdit(segments, event.target.value, "you"));
        }}
        className="rounded-md border border-input bg-background p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={text.includes(CLAUDE_SENTENCE)}
          onClick={() => {
            append(CLAUDE_SENTENCE, "claude");
          }}
        >
          Add Claude’s sentence
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={text.includes(QUOTE)}
          onClick={() => {
            append(QUOTE, "interview");
          }}
        >
          Paste the customer quote
        </Button>
      </div>
      <ProvenanceText segments={segments} authors={EDIT_AUTHORS} defaultShow />
    </div>
  );
}

/**
 * Provenance kept as the text is edited, with `provenanceFromEdit`. Add
 * Claude's sentence and the quote, then change a word of either: the word
 * you typed becomes yours, and the rest stays with whoever wrote it. The
 * interview has no link, so its words are marked but not focusable.
 */
export const WhileEditing: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Editor />,
};

const REPLY: ProvenanceSegment[] = [
  { text: "Hi Dana, thanks for flagging this. ", author: "you" },
  {
    text: "The export timed out because the report covered 14 months of data; exports are capped at 12.",
    author: "claude",
  },
  { text: " I've split it in two and sent both to you.", author: "you" },
];

function InAMessage() {
  const [show, setShow] = useState(false);
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="me-auto font-medium">Reply to Dana Ruiz</h3>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={show}
          className="aria-pressed:bg-primary/10 aria-pressed:text-primary"
          onClick={() => {
            setShow(!show);
          }}
        >
          Who wrote this
        </Button>
      </header>
      {show ? <ProvenanceLegend segments={REPLY} authors={AUTHORS} /> : null}
      <p className="leading-relaxed">
        <ProvenanceInline segments={REPLY} authors={AUTHORS} show={show} />
      </p>
    </article>
  );
}

/**
 * The parts on their own, for a layout with its own paragraph and its own
 * control: here a drafted email reply with the toggle in its header.
 */
export const InYourOwnLayout: Story = {
  parameters: { controls: { disable: true } },
  render: () => <InAMessage />,
};
