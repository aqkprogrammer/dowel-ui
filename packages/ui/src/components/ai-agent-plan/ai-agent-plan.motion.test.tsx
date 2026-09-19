import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentPlan, AgentPlanStep, type PlanStep } from "./ai-agent-plan";

const PLAN: PlanStep[] = [
  { id: "1", title: "Scan the inbox", status: "done", note: "12/12" },
  { id: "2", title: "Draft replies", status: "running", note: "3 files" },
  { id: "3", title: "Archive threads", status: "failed", error: "No permission" },
  { id: "4", title: "Send a summary", status: "skipped" },
  { id: "5", title: "Schedule follow-ups", status: "pending" },
];

function marker(container: HTMLElement, index: number): HTMLElement {
  return container.querySelectorAll<HTMLElement>("[data-slot='agent-plan-marker']")[index]!;
}

function title(text: string): HTMLElement {
  return screen.getByText(text, { exact: false, selector: "span" });
}

describe("AgentPlan drawn marks", () => {
  it("draws a check for done and a cross for failed, with no glyph text", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);

    const done = marker(container, 0);
    expect(done.querySelector("path")).toHaveAttribute("d", "M 3.5 7.5 L 6 10 L 10.5 4.5");
    expect(done.querySelector("path")).toHaveAttribute("pathLength", "1");
    expect(done.textContent).not.toContain("✓");

    const failed = marker(container, 2);
    expect(failed.querySelector("path")).toHaveAttribute("d", "M 5 5 L 9 9 M 9 5 L 5 9");
    expect(failed.textContent).not.toContain("✕");

    expect(marker(container, 3)).toHaveTextContent("–");
    expect(marker(container, 4).querySelector("path")).toBeNull();
    expect(marker(container, 1).querySelector("path")).toBeNull();
  });

  it("keeps the drawn marks inside the hidden marker", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
    for (const path of container.querySelectorAll("[data-part='glyph']")) {
      expect(path.closest("[data-slot='agent-plan-marker']")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("remounts the glyph when a step finishes, so the draw plays then", () => {
    const steps = (status: PlanStep["status"]): PlanStep[] => [
      { id: "a", title: "Step", status },
    ];
    const { container, rerender } = render(<AgentPlan label="Plan" steps={steps("running")} />);
    rerender(<AgentPlan label="Plan" steps={steps("done")} />);
    const drawn = container.querySelector("[data-part='glyph']");
    expect(drawn).not.toBeNull();

    rerender(<AgentPlan label="Plan" steps={steps("failed")} />);
    expect(container.querySelector("[data-part='glyph']")).not.toBe(drawn);
  });

  it("ships its draw keyframe through --motion-scale", () => {
    render(<AgentPlan label="Plan" steps={PLAN} />);
    const sheet = document.querySelector("style[data-href='dowel-ai-agent-plan']")?.textContent;
    expect(sheet).toContain("@keyframes dowel-ai-agent-plan-draw{from{stroke-dashoffset:1}}");
    expect(sheet).toContain("calc(200ms * var(--motion-scale,1))");
    expect(sheet).toContain(
      "[data-slot=agent-plan-sweep]:dir(rtl){animation-direction:reverse}",
    );
  });
});

describe("PlanStep note", () => {
  it("renders an end-aligned note", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
    const notes = [...container.querySelectorAll("[data-slot='agent-plan-note']")];
    expect(notes.map((note) => note.textContent)).toEqual(["12/12", "3 files"]);
    expect(notes[0]).toHaveClass("ms-auto", "tabular-nums");
  });

  it("renders nothing without one", () => {
    const { container } = render(
      <AgentPlan label="Plan" steps={[{ id: "1", title: "One", status: "pending" }]} />,
    );
    expect(container.querySelector("[data-slot='agent-plan-note']")).toBeNull();
  });
});

describe("AgentPlan quietCompleted", () => {
  it("dims done titles with a token, and only when asked", () => {
    const { rerender } = render(<AgentPlan label="Plan" steps={PLAN} />);
    expect(title("Scan the inbox")).not.toHaveClass("text-muted-foreground");

    rerender(<AgentPlan label="Plan" steps={PLAN} quietCompleted />);
    expect(title("Scan the inbox")).toHaveClass("text-muted-foreground", "translate-y-px");
    expect(title("Draft replies")).not.toHaveClass("text-muted-foreground");
  });
});

describe("AgentPlan runningIndicator", () => {
  it("pulses the marker by default, with no sweep", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
    expect(marker(container, 1)).toHaveClass("animate-pulse-soft");
    expect(container.querySelector("[data-slot='agent-plan-sweep']")).toBeNull();
  });

  it("sweeps the running row only, and drops the pulse", () => {
    const { container } = render(
      <AgentPlan label="Plan" steps={PLAN} runningIndicator="sweep" />,
    );
    const sweeps = container.querySelectorAll("[data-slot='agent-plan-sweep']");
    expect(sweeps).toHaveLength(1);
    expect(sweeps[0]).toHaveAttribute("aria-hidden", "true");
    expect(sweeps[0]?.closest("[data-slot='agent-plan-step']")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(marker(container, 1)).not.toHaveClass("animate-pulse-soft");
  });

  it("has no accessibility violations with every option on", async () => {
    const { container } = render(
      <AgentPlan label="Plan" steps={PLAN} quietCompleted runningIndicator="sweep" />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("AgentPlanStep outside a plan", () => {
  it("still renders with the default options", () => {
    render(
      <ol>
        <AgentPlanStep step={{ id: "x", title: "Alone", status: "done", note: "1/1" }} />
      </ol>,
    );
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });
});
