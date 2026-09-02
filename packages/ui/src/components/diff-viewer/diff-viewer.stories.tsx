import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";

import { buildDiff } from "./diff-model";
import { DiffViewer, DiffViewerToolbar, type HunkDecision } from "./diff-viewer";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-3xl">
    <Story />
  </div>
);

const BEFORE = `export async function loadWorkspace(id: string) {
  const response = await fetch(\`/api/workspaces/\${id}\`);
  const workspace = await response.json();
  return workspace;
}

export function formatSeats(count: number) {
  return count + " seats";
}
`;

const AFTER = `export async function loadWorkspace(id: string, signal?: AbortSignal) {
  const response = await fetch(\`/api/workspaces/\${id}\`, { signal });
  if (!response.ok) {
    throw new WorkspaceError(response.status);
  }
  const workspace = await response.json();
  return workspace;
}

export function formatSeats(count: number) {
  return count === 1 ? "1 seat" : \`\${count} seats\`;
}
`;

const LONG_BEFORE = Array.from(
  { length: 60 },
  (_, index) => `const step${String(index)} = ${String(index)};`,
).join("\n");
const LONG_AFTER = LONG_BEFORE.split("\n")
  .map((line, index) =>
    index === 12
      ? "const step12 = 12 * multiplier;"
      : index === 47
        ? "const step47 = compute(47);"
        : line,
  )
  .join("\n");

const meta = {
  title: "Data/Diff Viewer",
  component: DiffViewer,
  decorators: [withWidth],
  args: { label: "src/lib/workspace.ts", hunks: buildDiff(BEFORE, AFTER) },
} satisfies Meta<typeof DiffViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Unified. The summary sits above the diff, so the size of the change is known
 * before anyone starts reading it, and the changed words inside a line are
 * marked rather than the whole line being flagged.
 */
export const Default: Story = {};

/** Side by side, from the same hunks — the view is a rendering choice, not a rebuild. */
export const Split: Story = {
  args: { view: "split" },
};

/** Both, with the toolbar switching between them. */
export const WithToolbar: Story = {
  parameters: { controls: { disable: true } },
  render: function WithToolbar() {
    const [view, setView] = useState<"unified" | "split">("unified");
    const hunks = useMemo(() => buildDiff(BEFORE, AFTER), []);

    return (
      <DiffViewer hunks={hunks} label="src/lib/workspace.ts" view={view}>
        <DiffViewerToolbar view={view} onViewChange={setView} />
      </DiffViewer>
    );
  },
};

/**
 * An agent proposing a change. Decisions are controlled: the component reports
 * accept and reject and applies nothing, because writing to a file is the
 * application's call and never a component's.
 */
export const AgentProposal: Story = {
  parameters: { controls: { disable: true } },
  render: function AgentProposal() {
    const [decisions, setDecisions] = useState<Record<string, HunkDecision>>({});
    const hunks = useMemo(() => buildDiff(BEFORE, AFTER, { context: 2 }), []);

    return (
      <DiffViewer
        hunks={hunks}
        label="src/lib/workspace.ts"
        decisions={decisions}
        onDecision={(id, decision) => {
          setDecisions((current) => ({ ...current, [id]: decision }));
        }}
      />
    );
  },
};

/**
 * Two changes forty lines apart. The unchanged run between them is collapsed,
 * and how much was hidden is stated rather than silently dropped.
 */
export const CollapsedContext: Story = {
  args: {
    label: "src/lib/pipeline.ts",
    hunks: buildDiff(LONG_BEFORE, LONG_AFTER, { context: 2 }),
  },
};

/** Word-level comparison off, for diffs large enough that the extra pass costs more than it explains. */
export const WithoutWordDetail: Story = {
  args: { hunks: buildDiff(BEFORE, AFTER, { words: false }) },
};

/** Identical files. Said plainly, rather than an empty frame. */
export const NoChanges: Story = {
  args: { hunks: buildDiff(BEFORE, BEFORE) },
};
