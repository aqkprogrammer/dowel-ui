import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "workflow-graph",
  title: "Workflow Graph",
  description:
    "A pipeline or agent workflow drawn as a graph — steps laid out in layers by what they depend on, joined by lines, each showing its status.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["workflow-graph.tsx"],
  a11y:
    "Steps are an ordered list in dependency order, each stating its status in text and, for screen readers, " +
    "which steps it follows — so the graph reads fully without the lines, which are an aria-hidden SVG. " +
    "Status is never colour alone. With `onSelect`, steps are toggle buttons (aria-pressed). A wide graph " +
    "scrolls inside a named, focusable region so it can be scrolled from the keyboard. The flowing line " +
    "into a running step holds still under reduced motion.",
  guidance: {
    useWhen: [
      "showing the steps of an agent run or a CI pipeline and where it has got to",
      "a branching workflow where steps run in parallel and join",
    ],
    avoidWhen: [
      "a straight sequence of steps — use ai-agent-plan or stepper",
      "an editable canvas where people drag nodes — this lays itself out",
    ],
    alternatives: ["ai-agent-plan", "stepper", "action-node"],
  },
  composesWith: ["ai-agent-status", "ai-tool", "log-viewer"],
  controls: {
    nodeWidth: { min: 120, max: 280, step: 4 },
    nodeHeight: { min: 48, max: 96, step: 4 },
    layerGap: { min: 24, max: 120, step: 4 },
    nodeGap: { min: 8, max: 60, step: 2 },
  },
});
