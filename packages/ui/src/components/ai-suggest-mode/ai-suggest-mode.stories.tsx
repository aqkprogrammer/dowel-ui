import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "@/components/agent-surface";
import { Button } from "@/components/button";

import { SuggestMode } from "./ai-suggest-mode";
import type { SuggestedEdit } from "./suggest-hunks";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const DRAFT =
  "Teh new billing page is planned to ship next week. It will utilise the existing invoice " +
  "components, and we are very confident that customers will find it a lot more easier to use.";

const EDITS: SuggestedEdit[] = [
  { id: "typo", find: "Teh", replace: "The", reason: "Spelling." },
  {
    id: "date",
    find: "next week",
    replace: "on 3 October",
    reason: "A date is easier to plan around than a relative time.",
  },
  { id: "plain", find: "utilise", replace: "use", reason: "The plainer word says the same." },
  {
    id: "hedge",
    find: "we are very confident that customers will find it a lot more easier to use",
    replace: "customers should find it easier to use",
    reason: "Removes the double comparative and the unneeded confidence.",
  },
];

const meta = {
  title: "AI/Suggest Mode",
  component: SuggestMode,
  decorators: [withWidth],
  args: { value: DRAFT, edits: EDITS, author: "Claude" },
} satisfies Meta<typeof SuggestMode>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The agent's edits, each in place and each with its reason. Accept the typo
 * fix, reject the date, and the text that comes out has only what you
 * accepted. With a suggestion's Accept focused, A and R decide it.
 */
export const Default: Story = {
  render: function Render(args) {
    const [text, setText] = useState(args.value);
    return (
      <div className="flex flex-col gap-3">
        <SuggestMode {...args} onTextChange={setText} />
        <section aria-label="Result" className="rounded-md bg-muted/40 p-3 text-sm">
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">
            The text as decided
          </h3>
          <p>{text}</p>
        </section>
      </div>
    );
  },
};

/** The model returned the whole paragraph again; the changes are found word by word. */
export const FromARewrite: Story = {
  args: {
    edits: undefined,
    rewrite:
      "The new billing page ships on 3 October. It uses the existing invoice components, and " +
      "customers should find it easier to use.",
  },
};

function Editor() {
  const [text, setText] = useState(DRAFT);
  const [proposal, setProposal] = useState<SuggestedEdit[] | null>(null);

  useAgentTool({
    name: "read_draft",
    title: "Read the draft",
    description: "The draft as it stands.",
    effect: "read",
    describe: () => "Read the draft",
    execute: () => text,
  });

  // The agent cannot edit the text. It can only propose, and the person decides.
  useAgentTool<{ edits: SuggestedEdit[] }>({
    name: "propose_edits",
    title: "Propose edits",
    description:
      "Propose edits to the draft. Each replaces text that appears in it, with a reason. " +
      "The person accepts or rejects each one.",
    inputSchema: {
      type: "object",
      properties: {
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              find: { type: "string" },
              replace: { type: "string" },
              reason: { type: "string" },
            },
            required: ["find", "replace"],
          },
        },
      },
      required: ["edits"],
    },
    describe: ({ edits }) => `Proposed ${String(edits.length)} edits`,
    execute: ({ edits }) => {
      setProposal(edits);
      return `Proposed ${String(edits.length)} edits. The person is reviewing them.`;
    },
  });

  return proposal ? (
    <SuggestMode
      value={text}
      edits={proposal}
      author="Claude"
      onComplete={(next) => {
        setText(next);
        setProposal(null);
      }}
    />
  ) : (
    <p className="rounded-md border border-border p-3 text-sm">{text}</p>
  );
}

/**
 * Inside an agent surface the agent proposes edits through a tool rather than
 * writing them in. Once you have decided every one, its next result tells it
 * which you accepted and which not to suggest again — press "Ask what it was
 * told" to see.
 */
export const WithAnAgent: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const [told, setTold] = useState("");
    return (
      <AgentSurface apiRef={apiRef} agentName="Claude" className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void apiRef.current?.call("propose_edits", { edits: EDITS })}
          >
            Ask Claude to tighten it
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void apiRef.current?.call("read_draft").then((result) => {
                setTold(result.text);
              })
            }
          >
            Ask what it was told
          </Button>
        </div>
        <Editor />
        {told ? (
          <pre className="rounded-md bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
            {told}
          </pre>
        ) : null}
      </AgentSurface>
    );
  },
};
