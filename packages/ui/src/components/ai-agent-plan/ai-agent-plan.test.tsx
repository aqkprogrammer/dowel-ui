import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentPlan, AgentPlanSteps, AgentPlanSummary, type PlanStep } from "./ai-agent-plan";

const PLAN: PlanStep[] = [
  { id: "1", title: "Find the duplicate contacts", status: "done" },
  { id: "2", title: "Merge them into the oldest record", status: "running" },
  { id: "3", title: "Notify the account owner", status: "pending" },
];

function stepEl(container: HTMLElement, index: number): HTMLElement {
  return container.querySelectorAll("[data-slot='agent-plan-step']")[index] as HTMLElement;
}

function revision(container: HTMLElement): string {
  return container.querySelector("[data-slot='agent-plan-revision']")?.textContent ?? "";
}

describe("AgentPlan", () => {
  it("lists the steps in order", () => {
    render(<AgentPlan label="Deduplication plan" steps={PLAN} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toContain("Find the duplicate contacts");
  });

  it("uses an ordered list, because the order is the plan", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
    expect(container.querySelector("ol")).toBeInTheDocument();
  });

  it("marks the running step as current without moving focus", () => {
    const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);

    expect(stepEl(container, 1)).toHaveAttribute("aria-current", "step");
    expect(stepEl(container, 0)).not.toHaveAttribute("aria-current");
    expect(document.activeElement).toBe(document.body);
  });

  describe("status", () => {
    it("states every status in text, not only as a marker", () => {
      render(<AgentPlan label="Plan" steps={PLAN} />);

      expect(screen.getByText(/, Done/)).toBeInTheDocument();
      expect(screen.getByText(/, In progress/)).toBeInTheDocument();
      expect(screen.getByText(/, Not started/)).toBeInTheDocument();
    });

    it("hides the marker from assistive technology, so status is heard once", () => {
      const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);

      const markers = [...container.querySelectorAll("[data-slot='agent-plan-marker']")];
      expect(markers).toHaveLength(3);
      expect(markers.every((marker) => marker.getAttribute("aria-hidden") === "true")).toBe(
        true,
      );
    });

    it("shows why a step failed", () => {
      render(
        <AgentPlan
          label="Plan"
          steps={[{ id: "1", title: "Merge", status: "failed", error: "Record was locked" }]}
        />,
      );
      expect(screen.getByText("Record was locked")).toBeInTheDocument();
    });

    it("does not show an error on a step that did not fail", () => {
      const { container } = render(
        <AgentPlan
          label="Plan"
          steps={[{ id: "1", title: "Merge", status: "done", error: "stale" }]}
        />,
      );
      expect(container.querySelector("[data-slot='agent-plan-error']")).not.toBeInTheDocument();
    });
  });

  describe("revision", () => {
    it("says nothing about a plan that arrives complete", () => {
      // A plan presented in full has not been revised; announcing it would be
      // noise at exactly the moment the reader is reading it.
      const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
      expect(revision(container)).toBe("");
    });

    it("announces a step the model adds mid-run", () => {
      const { container, rerender } = render(<AgentPlan label="Plan" steps={PLAN} />);

      rerender(
        <AgentPlan
          label="Plan"
          steps={[...PLAN, { id: "4", title: "Re-index the search cache", status: "pending" }]}
        />,
      );

      expect(revision(container)).toBe('Plan updated: added "Re-index the search cache"');
    });

    it("summarises when several steps are added at once", () => {
      const { container, rerender } = render(<AgentPlan label="Plan" steps={PLAN} />);

      rerender(
        <AgentPlan
          label="Plan"
          steps={[
            ...PLAN,
            { id: "4", title: "A", status: "pending" },
            { id: "5", title: "B", status: "pending" },
          ]}
        />,
      );

      expect(revision(container)).toBe("Plan updated: 2 steps added");
    });

    it("announces a step the model drops", () => {
      const { container, rerender } = render(<AgentPlan label="Plan" steps={PLAN} />);

      rerender(<AgentPlan label="Plan" steps={PLAN.slice(0, 2)} />);

      expect(revision(container)).toBe("1 step removed");
    });

    it("stays silent when only a status changed", () => {
      // The common case by far. Announcing it would talk over the reader
      // continuously on a plan of any length.
      const { container, rerender } = render(<AgentPlan label="Plan" steps={PLAN} />);

      rerender(
        <AgentPlan
          label="Plan"
          steps={PLAN.map((step) =>
            step.id === "2" ? { ...step, status: "done" as const } : step,
          )}
        />,
      );

      expect(revision(container)).toBe("");
    });

    it("is a polite region, so it waits for a gap", () => {
      const { container } = render(<AgentPlan label="Plan" steps={PLAN} />);
      expect(container.querySelector("[data-slot='agent-plan-revision']")).toHaveAttribute(
        "aria-live",
        "polite",
      );
    });
  });

  describe("summary", () => {
    it("reports position while running", () => {
      render(<AgentPlan label="Plan" steps={PLAN} />);
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    });

    it("says a plan is only proposed before anything has started", () => {
      render(
        <AgentPlan
          label="Plan"
          steps={PLAN.map((step) => ({ ...step, status: "pending" as const }))}
        />,
      );
      expect(screen.getByText("Proposed plan, 3 steps")).toBeInTheDocument();
    });

    it("reports completion", () => {
      render(
        <AgentPlan
          label="Plan"
          steps={PLAN.map((step) => ({ ...step, status: "done" as const }))}
        />,
      );
      expect(screen.getByText("3 of 3 done")).toBeInTheDocument();
    });

    it("reports failures once nothing is running", () => {
      render(
        <AgentPlan
          label="Plan"
          steps={[
            { id: "1", title: "A", status: "done" },
            { id: "2", title: "B", status: "failed" },
            { id: "3", title: "C", status: "skipped" },
          ]}
        />,
      );
      expect(screen.getByText("1 of 3 done, 1 failed")).toBeInTheDocument();
    });

    it("counts sub-steps in the total, since they are work too", () => {
      render(
        <AgentPlan
          label="Plan"
          steps={[
            {
              id: "1",
              title: "Parent",
              status: "running",
              steps: [
                { id: "1a", title: "Child one", status: "done" },
                { id: "1b", title: "Child two", status: "pending" },
              ],
            },
          ]}
        />,
      );
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    });
  });

  describe("sub-steps", () => {
    it("renders them nested inside their parent", () => {
      const { container } = render(
        <AgentPlan
          label="Plan"
          steps={[
            {
              id: "1",
              title: "Parent",
              status: "running",
              steps: [{ id: "1a", title: "Child", status: "done" }],
            },
          ]}
        />,
      );

      const parent = container.querySelector("[data-slot='agent-plan-step']");
      expect(parent?.querySelector("[data-slot='agent-plan-step']")).toBeInTheDocument();
      expect(screen.getByText(/Child/)).toBeInTheDocument();
    });

    it("announces a sub-step added mid-run", () => {
      const base: PlanStep[] = [{ id: "1", title: "Parent", status: "running", steps: [] }];
      const { container, rerender } = render(<AgentPlan label="Plan" steps={base} />);

      rerender(
        <AgentPlan
          label="Plan"
          steps={[
            {
              ...base[0]!,
              steps: [{ id: "1a", title: "Look up the schema", status: "running" }],
            },
          ]}
        />,
      );

      expect(revision(container)).toBe('Plan updated: added "Look up the schema"');
    });
  });

  it("accepts composed children in place of the default layout", () => {
    render(
      <AgentPlan label="Plan" steps={PLAN}>
        <AgentPlanSummary />
      </AgentPlan>,
    );

    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("throws a useful error when a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<AgentPlanSteps />)).toThrow(/must be rendered inside <AgentPlan>/);
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AgentPlan
        label="Deduplication plan"
        steps={[
          ...PLAN,
          {
            id: "4",
            title: "Verify",
            status: "failed",
            error: "Two records still match",
            steps: [{ id: "4a", title: "Re-run the check", status: "pending" }],
          },
        ]}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
