import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LedgerAction } from "@/components/ai-action-ledger";
import type { PlanStep } from "@/components/ai-agent-plan";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentConsoleBlock, type AgentApproval } from "./agent-console";

const PLAN: PlanStep[] = [
  { id: "1", title: "Find duplicate contacts", status: "done" },
  { id: "2", title: "Merge the duplicates", status: "running" },
  { id: "3", title: "Notify the owners", status: "pending" },
];

const ACTIONS: LedgerAction[] = [
  {
    id: "a1",
    summary: "Deleted 3 duplicate contacts",
    reversibility: "revertible",
    status: "applied",
  },
  {
    id: "a2",
    summary: "Refunded $40.00 to Acme",
    reversibility: "compensable",
    status: "applied",
  },
  {
    id: "a3",
    summary: "Emailed 12 account owners",
    reversibility: "irreversible",
    status: "applied",
  },
];

const APPROVAL: AgentApproval = {
  tool: "delete_contacts",
  summary: "Delete 3 contacts that look like duplicates of existing records.",
  arguments: { ids: "c_1, c_2, c_3" },
  fields: [{ name: "ids", label: "Contact ids" }],
  irreversible: "Deleted contacts cannot be restored.",
};

describe("AgentConsoleBlock", () => {
  it("names the run and shows its state as text", () => {
    render(<AgentConsoleBlock title="Deduplicate contacts" state="working" />);

    expect(screen.getByRole("heading", { name: /Deduplicate contacts/ })).toBeInTheDocument();
    expect(screen.getByText("Working")).toBeInTheDocument();
  });

  it("puts what is blocking the run before the plan and the history", () => {
    const { container } = render(
      <AgentConsoleBlock
        title="Deduplicate contacts"
        state="waiting"
        plan={PLAN}
        approval={APPROVAL}
        onApprovalDecision={() => undefined}
        actions={ACTIONS}
      />,
    );

    const approval = screen.getByText(APPROVAL.summary);
    const planHeading = screen.getByRole("heading", { name: "Plan" });

    // The only part waiting on a person must not be below a scrolling plan.
    expect(
      approval.compareDocumentPosition(planHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it("says plainly when the pending call cannot be taken back", () => {
    render(
      <AgentConsoleBlock
        title="Deduplicate contacts"
        state="waiting"
        approval={APPROVAL}
        onApprovalDecision={() => undefined}
      />,
    );
    expect(screen.getByText("Deleted contacts cannot be restored.")).toBeInTheDocument();
  });

  it("renders no approval when there is nothing to decide", () => {
    render(<AgentConsoleBlock title="Deduplicate contacts" state="working" plan={PLAN} />);
    expect(screen.queryByText(APPROVAL.summary)).not.toBeInTheDocument();
  });

  it("states each action's reversibility in words, not by tone", () => {
    render(<AgentConsoleBlock title="Deduplicate contacts" state="done" actions={ACTIONS} />);

    expect(screen.getByText("Can be undone")).toBeInTheDocument();
    expect(screen.getByText("Can be offset, not undone")).toBeInTheDocument();
    expect(screen.getByText("Cannot be undone")).toBeInTheDocument();
  });

  it("explains an empty ledger rather than showing an empty box", () => {
    render(<AgentConsoleBlock title="Deduplicate contacts" state="thinking" />);
    expect(screen.getByText("Nothing has changed yet")).toBeInTheDocument();
  });

  it("explains an absent plan rather than rendering an empty list", () => {
    render(<AgentConsoleBlock title="Deduplicate contacts" state="thinking" />);
    expect(screen.getByText("No plan yet")).toBeInTheDocument();
  });

  it("offers to stop a run that is still going", () => {
    render(
      <AgentConsoleBlock
        title="Deduplicate contacts"
        state="working"
        onStop={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Stop run" })).toBeInTheDocument();
  });

  it("does not offer to stop a run that has already finished", () => {
    for (const state of ["done", "error", "idle"] as const) {
      const { unmount } = render(
        <AgentConsoleBlock title="Run" state={state} onStop={() => undefined} />,
      );
      expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("stops the run from the keyboard", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<AgentConsoleBlock title="Run" state="working" onStop={onStop} />);

    screen.getByRole("button", { name: "Stop run" }).focus();
    await user.keyboard("{Enter}");

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows the context window only when both figures are known", () => {
    const { rerender } = render(
      <AgentConsoleBlock title="Run" state="working" tokensUsed={4000} />,
    );
    expect(screen.queryByRole("heading", { name: "Context" })).not.toBeInTheDocument();

    rerender(
      <AgentConsoleBlock title="Run" state="working" tokensUsed={4000} tokenLimit={128_000} />,
    );
    expect(screen.getByRole("heading", { name: "Context" })).toBeInTheDocument();
  });

  it("renders every plan step", () => {
    render(<AgentConsoleBlock title="Run" state="working" plan={PLAN} />);

    for (const step of PLAN) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it("names the blocked section, so the approval does not skip a heading level", () => {
    render(
      <AgentConsoleBlock
        title="Deduplicate contacts"
        state="waiting"
        approval={APPROVAL}
        onApprovalDecision={() => undefined}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Waiting for you" });
    expect(heading.tagName).toBe("H2");
    expect(
      within(screen.getByRole("region", { name: "Waiting for you" })).getByText(
        APPROVAL.summary,
      ),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AgentConsoleBlock
        title="Deduplicate contacts"
        description="Nightly cleanup across the CRM."
        state="waiting"
        plan={PLAN}
        tokensUsed={42_000}
        tokenLimit={128_000}
        approval={APPROVAL}
        onApprovalDecision={() => undefined}
        actions={ACTIONS}
        onRevert={() => undefined}
        onStop={() => undefined}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
