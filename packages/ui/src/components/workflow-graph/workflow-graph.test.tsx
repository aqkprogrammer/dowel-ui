import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  layoutWorkflow,
  WorkflowGraph,
  type WorkflowEdge,
  type WorkflowNode,
} from "./workflow-graph";

const nodes: WorkflowNode[] = [
  { id: "fetch", label: "Fetch sources", status: "success" },
  { id: "summarise", label: "Summarise", status: "running", description: "claude" },
  { id: "classify", label: "Classify", status: "success" },
  { id: "report", label: "Write report", status: "queued" },
];
const edges: WorkflowEdge[] = [
  { from: "fetch", to: "summarise" },
  { from: "fetch", to: "classify" },
  { from: "summarise", to: "report" },
  { from: "classify", to: "report" },
];

describe("layoutWorkflow", () => {
  it("puts each step one layer past what it depends on", () => {
    const layout = layoutWorkflow(nodes, edges);
    const layer = (id: string) => layout.positions.get(id)?.layer;
    expect(layer("fetch")).toBe(0);
    expect(layer("summarise")).toBe(1);
    expect(layer("classify")).toBe(1);
    expect(layer("report")).toBe(2);
    expect(layout.order[0]).toBe("fetch");
    expect(layout.order.at(-1)).toBe("report");
  });

  it("lays out across or down", () => {
    const across = layoutWorkflow(nodes, edges, {
      nodeWidth: 100,
      nodeHeight: 40,
      layerGap: 20,
      nodeGap: 10,
    });
    expect(across.width).toBe(3 * 100 + 2 * 20);
    expect(across.height).toBe(2 * 40 + 10);
    const down = layoutWorkflow(nodes, edges, {
      direction: "vertical",
      nodeWidth: 100,
      nodeHeight: 40,
      layerGap: 20,
      nodeGap: 10,
    });
    expect(down.height).toBe(3 * 40 + 2 * 20);
    expect(down.positions.get("report")?.y).toBe(2 * 60);
  });

  it("breaks cycles instead of looping forever, and ignores unknown ids", () => {
    const layout = layoutWorkflow(
      [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
        { from: "a", to: "ghost" },
      ],
    );
    expect(layout.backEdges.size).toBe(1);
    expect(layout.positions.get("b")?.layer).toBe(1);
  });

  it("orders a layer to keep lines from crossing", () => {
    const layout = layoutWorkflow(
      [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "y", label: "Y" },
        { id: "x", label: "X" },
      ],
      [
        { from: "a", to: "x" },
        { from: "b", to: "y" },
      ],
    );
    // x follows a (first), y follows b (second): x should be placed first.
    expect(layout.positions.get("x")?.order).toBe(0);
    expect(layout.positions.get("y")?.order).toBe(1);
  });
});

describe("WorkflowGraph", () => {
  it("reads as a list of steps with their status and what they follow", async () => {
    const { container } = render(
      <WorkflowGraph label="Research run" nodes={nodes} edges={edges} />,
    );
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Fetch sources");
    expect(items[0]).toHaveTextContent("Done");
    const report = items.find((item) => item.textContent?.includes("Write report"));
    expect(report).toHaveTextContent("Queued");
    expect(report).toHaveTextContent(/after Summarise, Classify|after Classify, Summarise/);
    expect(screen.getByRole("region", { name: "Research run" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await expectNoA11yViolations(container);
  });

  it("flows the line into a running step and marks finished ones done", () => {
    const { container } = render(<WorkflowGraph label="Run" nodes={nodes} edges={edges} />);
    const edgesDrawn = container.querySelectorAll('[data-slot="workflow-graph-edge"]');
    expect(edgesDrawn).toHaveLength(4);
    const states = [...edgesDrawn].map((edge) => edge.getAttribute("data-state"));
    expect(states).toEqual(["active", "done", "idle", "idle"]);
    expect(document.head.textContent).toContain("stroke-dashoffset");
  });

  it("makes steps toggle buttons when they can be selected", () => {
    const onSelect = vi.fn();
    render(
      <WorkflowGraph
        label="Run"
        nodes={nodes}
        edges={edges}
        onSelect={onSelect}
        selected="classify"
      />,
    );
    expect(screen.getByRole("button", { name: /^Classify/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /^Summarise/ }));
    expect(onSelect).toHaveBeenCalledWith("summarise");
  });

  it("uses the words it is given for each status", () => {
    render(
      <WorkflowGraph
        label="Run"
        nodes={nodes}
        edges={edges}
        statusLabels={{ running: "En cours" }}
      />,
    );
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });
});
