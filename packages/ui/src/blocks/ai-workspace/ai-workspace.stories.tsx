import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { ModelOption } from "@/components/ai-model-selector";

import {
  AiWorkspaceBlock,
  type WorkspaceAttachment,
  type WorkspaceMessage,
  type WorkspaceThread,
} from "./ai-workspace";

/** Named so its type is nameable in declaration output (TS2883). */
const withFrame: Decorator = (Story) => (
  <div className="h-[40rem] w-[76rem] max-w-full overflow-hidden rounded-xl border border-border bg-background">
    <Story />
  </div>
);

const THREADS: WorkspaceThread[] = [
  { id: "t1", title: "Contract review — Acme MSA", at: "2026-03-04T09:00:00Z", label: "2h" },
  { id: "t2", title: "Q3 forecast assumptions", at: "2026-03-03T15:00:00Z", label: "1d" },
  { id: "t3", title: "Onboarding email draft", at: "2026-03-02T11:00:00Z", label: "2d" },
  { id: "t4", title: "Vendor comparison", at: "2026-02-27T16:00:00Z", label: "5d" },
];

const MODELS: ModelOption[] = [
  { id: "claude-sonnet-5", name: "Sonnet", description: "Fast, for most work" },
  { id: "claude-opus-5", name: "Opus", description: "Slower, for the hard parts" },
];

const ATTACHMENTS: WorkspaceAttachment[] = [
  { id: "f1", name: "Acme-MSA-v4.pdf", detail: "PDF · 2.4 MB", href: "#f1" },
  { id: "f2", name: "Redlines.docx", detail: "Word · 120 KB", href: "#f2" },
];

const MESSAGES: WorkspaceMessage[] = [
  {
    id: "m1",
    from: "user",
    content: "Summarise the termination and liability clauses, and flag anything unusual.",
  },
  {
    id: "m2",
    from: "assistant",
    reasoning:
      "Termination is in section 14, liability in section 11. The liability cap is lower than the template, which is worth flagging.",
    tools: [
      {
        id: "tool-1",
        name: "search_document",
        status: "success",
        arguments: '{ "query": "termination OR liability", "file": "Acme-MSA-v4.pdf" }',
        result: "Sections 11.1–11.4 (liability), 14.1–14.3 (termination)",
      },
    ],
    content:
      "**Termination (§14).** Either party may terminate for convenience with 90 days' written notice, or immediately for an uncured material breach after a 30-day cure period.\n\n**Liability (§11).** Each party's aggregate liability is capped at fees paid in the preceding 6 months — your template uses 12. Indirect damages are excluded on both sides.\n\n**Unusual:** the 6-month cap, and §11.4 carves data-breach costs out of the cap for you but not for them.",
    sources: [
      { index: 1, title: "Acme-MSA-v4.pdf", origin: "§14, page 14", href: "#p14" },
      { index: 2, title: "Acme-MSA-v4.pdf", origin: "§11, page 11", href: "#p11" },
    ],
    tokens: 1_284,
  },
];

const meta = {
  title: "Blocks/AI workspace",
  component: AiWorkspaceBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withFrame],
  // The required props, so a story that renders itself still type-checks.
  args: { threads: THREADS, messages: MESSAGES },
} satisfies Meta<typeof AiWorkspaceBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Default() {
    const [active, setActive] = useState("t1");
    const [model, setModel] = useState("claude-sonnet-5");
    const [attachments, setAttachments] = useState(ATTACHMENTS);

    return (
      <AiWorkspaceBlock
        name="Counsel"
        threads={THREADS}
        activeThread={active}
        onSelectThread={setActive}
        onNewThread={() => undefined}
        messages={active === "t1" ? MESSAGES : []}
        models={MODELS}
        model={model}
        onModelChange={setModel}
        tokensUsed={38_400}
        tokenLimit={200_000}
        attachments={attachments}
        onAttach={() => undefined}
        onRemoveAttachment={(attachment) => {
          setAttachments((previous) => previous.filter((entry) => entry.id !== attachment.id));
        }}
        output={{
          title: "Extracted terms",
          fields: [
            { name: "notice", label: "Notice period" },
            { name: "cap", label: "Liability cap" },
            { name: "governingLaw", label: "Governing law" },
          ],
          value: { notice: "90 days", cap: "6 months' fees" },
          streaming: true,
        }}
        onSend={() => undefined}
      />
    );
  },
};

/** A response arriving: the status line says so, the transcript does not. */
export const Streaming: Story = {
  args: {
    name: "Counsel",
    threads: THREADS,
    activeThread: "t1",
    messages: [
      MESSAGES[0] as WorkspaceMessage,
      {
        id: "m2",
        from: "assistant",
        content: "**Termination (§14).** Either party may terminate for convenience with",
        streaming: true,
      },
    ],
    busy: true,
    models: MODELS,
    model: "claude-opus-5",
    tokensUsed: 41_200,
    tokenLimit: 200_000,
    attachments: ATTACHMENTS,
    onStop: () => undefined,
  },
};

export const Empty: Story = {
  args: {
    name: "Counsel",
    threads: [],
    messages: [],
    models: MODELS,
    model: "claude-sonnet-5",
    onNewThread: () => undefined,
    onAttach: () => undefined,
  },
};
