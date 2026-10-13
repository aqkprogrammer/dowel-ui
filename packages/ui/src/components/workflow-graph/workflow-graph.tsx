"use client";

// Original design.
import { cva } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pipeline or agent workflow as a graph: steps laid out in layers by what
 * they depend on, joined by curves, each showing its status.
 *
 * The layout is computed, not drawn by hand: every step sits one layer past
 * the furthest step it depends on (cycles are broken, not looped), and steps
 * within a layer are ordered to keep lines from crossing. Steps are HTML in a
 * list, in dependency order, each saying its status in text and which steps
 * it follows — so the graph reads properly without seeing the lines, which
 * are an aria-hidden SVG. A line into a running step flows; reduced motion
 * holds it still. Wide graphs scroll inside a focusable region.
 */

const PREFIX = "dowel-workflow-graph";
const STYLES = `@keyframes ${PREFIX}-flow{to{stroke-dashoffset:-20}}
[data-slot="workflow-graph-edge"][data-state="active"]{stroke-dasharray:6 4;animation:${PREFIX}-flow calc(600ms * var(--motion-scale, 1)) linear infinite}`;

export type WorkflowStatus = "idle" | "queued" | "running" | "success" | "error" | "skipped";

export interface WorkflowNode {
  id: string;
  label: string;
  /** A line under the label: the tool, the model, a duration. */
  description?: string;
  status?: WorkflowStatus;
  /** An icon before the label. Decorative. */
  icon?: ReactNode;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  /** Overrides the state worked out from the two steps' statuses. */
  state?: "idle" | "active" | "done" | "error";
}

export interface WorkflowLayoutOptions {
  direction?: "horizontal" | "vertical";
  nodeWidth?: number;
  nodeHeight?: number;
  /** Space between layers. */
  layerGap?: number;
  /** Space between steps in a layer. */
  nodeGap?: number;
}

export interface WorkflowLayout {
  width: number;
  height: number;
  /** Position and layer of each step, by id. */
  positions: Map<string, { x: number; y: number; layer: number; order: number }>;
  /** Steps in reading order: layer by layer, then top to bottom. */
  order: string[];
  /** Edges that point backwards (closing a cycle); drawn, but not used for layering. */
  backEdges: Set<string>;
}

const edgeKey = (edge: WorkflowEdge) => `${edge.from}→${edge.to}`;

/** Lays out a workflow in layers. Pure, so it can run on the server. */
export function layoutWorkflow(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  {
    direction = "horizontal",
    nodeWidth = 184,
    nodeHeight = 64,
    layerGap = 56,
    nodeGap = 20,
  }: WorkflowLayoutOptions = {},
): WorkflowLayout {
  const ids = new Set(nodes.map((node) => node.id));
  const valid = edges.filter(
    (edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to,
  );
  const outgoing = new Map<string, string[]>();
  for (const id of ids) outgoing.set(id, []);
  for (const edge of valid) outgoing.get(edge.from)?.push(edge.to);

  // Break cycles: an edge back to a step still on the DFS stack is a back edge.
  const backEdges = new Set<string>();
  const state = new Map<string, 1 | 2>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const next of outgoing.get(id) ?? []) {
      const seen = state.get(next);
      if (seen === 1) backEdges.add(`${id}→${next}`);
      else if (seen === undefined) visit(next);
    }
    state.set(id, 2);
  };
  for (const node of nodes) if (!state.has(node.id)) visit(node.id);
  const forward = valid.filter((edge) => !backEdges.has(edgeKey(edge)));

  // Longest-path layering.
  const incoming = new Map<string, string[]>();
  for (const id of ids) incoming.set(id, []);
  for (const edge of forward) incoming.get(edge.to)?.push(edge.from);
  const layerOf = new Map<string, number>();
  const layer = (id: string): number => {
    const known = layerOf.get(id);
    if (known !== undefined) return known;
    layerOf.set(id, 0); // guards re-entry; forward edges have no cycles
    let value = 0;
    for (const parent of incoming.get(id) ?? []) value = Math.max(value, layer(parent) + 1);
    layerOf.set(id, value);
    return value;
  };
  for (const node of nodes) layer(node.id);

  const layers: string[][] = [];
  for (const node of nodes) {
    const index = layerOf.get(node.id) ?? 0;
    (layers[index] ??= []).push(node.id);
  }

  // Order each layer by the mean position of its parents, then of its
  // children going back, to keep lines from crossing.
  const position = new Map<string, number>();
  const place = (row: string[]) => {
    row.forEach((id, index) => position.set(id, index));
  };
  layers.forEach(place);
  const sweep = (row: string[], neighbours: Map<string, string[]>) => {
    const score = (id: string) => {
      const around = neighbours.get(id) ?? [];
      if (around.length === 0) return position.get(id) ?? 0;
      return around.reduce((sum, other) => sum + (position.get(other) ?? 0), 0) / around.length;
    };
    const scored = row.map((id, index) => ({ id, score: score(id), index }));
    scored.sort((a, b) => a.score - b.score || a.index - b.index);
    row.splice(0, row.length, ...scored.map((entry) => entry.id));
    place(row);
  };
  const children = new Map<string, string[]>();
  for (const id of ids) children.set(id, []);
  for (const edge of forward) children.get(edge.from)?.push(edge.to);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 1; i < layers.length; i += 1) sweep(layers[i] ?? [], incoming);
    for (let i = layers.length - 2; i >= 0; i -= 1) sweep(layers[i] ?? [], children);
  }

  const horizontal = direction === "horizontal";
  const across = horizontal ? nodeHeight : nodeWidth;
  const along = horizontal ? nodeWidth : nodeHeight;
  const widest = Math.max(1, ...layers.map((row) => row.length));
  const span = widest * across + (widest - 1) * nodeGap;
  const positions: WorkflowLayout["positions"] = new Map();
  const order: string[] = [];
  layers.forEach((row, layerIndex) => {
    const rowSpan = row.length * across + (row.length - 1) * nodeGap;
    const offset = (span - rowSpan) / 2;
    row.forEach((id, index) => {
      const main = layerIndex * (along + layerGap);
      const cross = offset + index * (across + nodeGap);
      positions.set(id, {
        x: horizontal ? main : cross,
        y: horizontal ? cross : main,
        layer: layerIndex,
        order: index,
      });
      order.push(id);
    });
  });
  const length = layers.length * along + Math.max(0, layers.length - 1) * layerGap;
  return {
    width: horizontal ? length : span,
    height: horizontal ? span : length,
    positions,
    order,
    backEdges,
  };
}

type EdgeState = NonNullable<WorkflowEdge["state"]>;

/** Lines and their arrowheads, by state. Arrowheads are coloured per state: markers don't inherit from the line. */
const edgeColour: Record<EdgeState, { stroke: string; fill: string }> = {
  idle: { stroke: "stroke-border", fill: "fill-border" },
  active: { stroke: "stroke-primary", fill: "fill-primary" },
  done: { stroke: "stroke-success/70", fill: "fill-success/70" },
  error: { stroke: "stroke-destructive", fill: "fill-destructive" },
};

/** What a line looks like, from the steps at each end. */
function edgeState(edge: WorkflowEdge, from?: WorkflowStatus, to?: WorkflowStatus): EdgeState {
  if (edge.state) return edge.state;
  if (to === "error" && from === "success") return "error";
  if (from === "success" && to === "running") return "active";
  if (from === "success" && (to === "success" || to === "skipped")) return "done";
  return "idle";
}

const statusText: Record<WorkflowStatus, string> = {
  idle: "Not started",
  queued: "Queued",
  running: "Running",
  success: "Done",
  error: "Failed",
  skipped: "Skipped",
};

const workflowNodeVariants = cva(
  "absolute flex flex-col justify-center gap-1 rounded-xl border bg-card px-3 text-start text-card-foreground shadow-sm transition-colors",
  {
    variants: {
      status: {
        idle: "border-border",
        queued: "border-border",
        running: "border-primary ring-2 ring-primary/20",
        success: "border-success/50",
        error: "border-destructive ring-2 ring-destructive/15",
        skipped: "border-dashed border-border opacity-70",
      },
    },
    defaultVariants: { status: "idle" },
  },
);

const workflowDotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    status: {
      idle: "bg-muted-foreground/50",
      queued: "bg-muted-foreground",
      running: "animate-pulse bg-primary",
      success: "bg-success",
      error: "bg-destructive",
      skipped: "bg-muted-foreground/50",
    },
  },
});

export interface WorkflowGraphProps
  extends Omit<ComponentPropsWithRef<"figure">, "onSelect">, WorkflowLayoutOptions {
  nodes: readonly WorkflowNode[];
  edges: readonly WorkflowEdge[];
  /** Names the graph, shown as its caption unless `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  /** Make steps buttons; called with the chosen step's id. */
  onSelect?: (id: string) => void;
  /** The step currently selected, marked aria-pressed. */
  selected?: string;
  /** Words for each status, for other languages. */
  statusLabels?: Partial<Record<WorkflowStatus, string>>;
}

/** A workflow drawn as layered steps joined by lines, each with its status. */
export function WorkflowGraph({
  nodes,
  edges,
  label,
  hideLabel = false,
  onSelect,
  selected,
  statusLabels,
  direction = "horizontal",
  nodeWidth = 184,
  nodeHeight = 64,
  layerGap = 56,
  nodeGap = 20,
  className,
  ...props
}: WorkflowGraphProps) {
  const layout = layoutWorkflow(nodes, edges, {
    direction,
    nodeWidth,
    nodeHeight,
    layerGap,
    nodeGap,
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const words = { ...statusText, ...statusLabels };
  const horizontal = direction === "horizontal";
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    const from = byId.get(edge.from);
    if (!from || !byId.has(edge.to)) continue;
    const list = parents.get(edge.to) ?? [];
    list.push(from.label);
    parents.set(edge.to, list);
  }

  const paths = edges.flatMap((edge) => {
    const a = layout.positions.get(edge.from);
    const b = layout.positions.get(edge.to);
    if (!a || !b || edge.from === edge.to) return [];
    const back = layout.backEdges.has(edgeKey(edge));
    let d: string;
    if (horizontal) {
      const x1 = a.x + nodeWidth;
      const y1 = a.y + nodeHeight / 2;
      const x2 = b.x;
      const y2 = b.y + nodeHeight / 2;
      if (back) {
        // Loop back underneath both steps.
        const below = Math.max(a.y, b.y) + nodeHeight + nodeGap / 2;
        d = `M${String(a.x + nodeWidth / 2)} ${String(a.y + nodeHeight)} C${String(a.x + nodeWidth / 2)} ${String(below + 24)} ${String(b.x + nodeWidth / 2)} ${String(below + 24)} ${String(b.x + nodeWidth / 2)} ${String(b.y + nodeHeight)}`;
      } else {
        const bend = Math.max(24, (x2 - x1) / 2);
        d = `M${String(x1)} ${String(y1)} C${String(x1 + bend)} ${String(y1)} ${String(x2 - bend)} ${String(y2)} ${String(x2)} ${String(y2)}`;
      }
    } else {
      const x1 = a.x + nodeWidth / 2;
      const y1 = a.y + nodeHeight;
      const x2 = b.x + nodeWidth / 2;
      const y2 = b.y;
      if (back) {
        const beside = Math.max(a.x, b.x) + nodeWidth + nodeGap / 2;
        d = `M${String(a.x + nodeWidth)} ${String(a.y + nodeHeight / 2)} C${String(beside + 24)} ${String(a.y + nodeHeight / 2)} ${String(beside + 24)} ${String(b.y + nodeHeight / 2)} ${String(b.x + nodeWidth)} ${String(b.y + nodeHeight / 2)}`;
      } else {
        const bend = Math.max(20, (y2 - y1) / 2);
        d = `M${String(x1)} ${String(y1)} C${String(x1)} ${String(y1 + bend)} ${String(x2)} ${String(y2 - bend)} ${String(x2)} ${String(y2)}`;
      }
    }
    const state = edgeState(edge, byId.get(edge.from)?.status, byId.get(edge.to)?.status);
    return [{ key: edgeKey(edge), d, state, back }];
  });

  // Room for the arcs of back edges.
  const pad = layout.backEdges.size > 0 ? 40 : 4;
  const width = layout.width + (horizontal ? 4 : pad);
  const height = layout.height + (horizontal ? pad : 4);

  return (
    <figure
      data-slot="workflow-graph"
      data-direction={direction}
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <figcaption className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}>
        {label}
      </figcaption>
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        data-slot="workflow-graph-viewport"
        className={cn("max-w-full overflow-auto rounded-lg p-1", focusRing)}
      >
        <div className="relative" style={{ width, height }}>
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            className="pointer-events-none absolute inset-0 overflow-visible"
          >
            <defs>
              {(Object.keys(edgeColour) as EdgeState[]).map((state) => (
                <marker
                  key={state}
                  id={`${PREFIX}-arrow-${state}`}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerUnits="userSpaceOnUse"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 8 4 0 8z" className={edgeColour[state].fill} />
                </marker>
              ))}
            </defs>
            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                data-slot="workflow-graph-edge"
                data-state={path.state}
                data-back={path.back || undefined}
                fill="none"
                strokeWidth={path.state === "idle" ? 1.5 : 2}
                markerEnd={`url(#${PREFIX}-arrow-${path.state})`}
                className={cn(
                  edgeColour[path.state].stroke,
                  path.back && "[stroke-dasharray:3_4]",
                )}
              />
            ))}
          </svg>
          <ol className="m-0 list-none p-0">
            {layout.order.map((id) => {
              const node = byId.get(id);
              const at = layout.positions.get(id);
              if (!node || !at) return null;
              const status = node.status ?? "idle";
              const after = parents.get(id);
              const body = (
                <>
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    {node.icon ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-muted-foreground [&_svg]:size-4"
                      >
                        {node.icon}
                      </span>
                    ) : null}
                    <span className="truncate">{node.label}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span aria-hidden="true" className={workflowDotVariants({ status })} />
                    <span data-slot="workflow-graph-status" className="shrink-0">
                      {words[status]}
                    </span>
                    {node.description ? (
                      <span className="truncate">· {node.description}</span>
                    ) : null}
                  </span>
                  {after && after.length > 0 ? (
                    <span className="sr-only">{`, after ${after.join(", ")}`}</span>
                  ) : null}
                </>
              );
              const style = {
                insetInlineStart: at.x,
                top: at.y,
                width: nodeWidth,
                height: nodeHeight,
              } as CSSProperties;
              return (
                <li key={id} data-slot="workflow-graph-node" data-status={status} data-id={id}>
                  {onSelect ? (
                    <button
                      type="button"
                      aria-pressed={selected === id}
                      className={cn(
                        workflowNodeVariants({ status }),
                        "cursor-pointer hover:bg-accent aria-pressed:bg-accent aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-background",
                        focusRing,
                      )}
                      style={style}
                      onClick={() => {
                        onSelect(id);
                      }}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className={workflowNodeVariants({ status })} style={style}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </figure>
  );
}

export { workflowDotVariants, workflowNodeVariants };
