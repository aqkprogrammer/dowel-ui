"use client";

import { useState } from "react";

import type { LedgerAction } from "@/components/ui/ai-action-ledger";
import type { PlanStep } from "@/components/ui/ai-agent-plan";
import type { ApprovalDecision } from "@/components/ui/ai-approval-request";
import { AgentConsoleBlock } from "@/components/blocks/agent-console";

const PLAN: PlanStep[] = [
  { id: "1", title: "Scan the contact table", status: "done", detail: "18,402 records" },
  { id: "2", title: "Group likely duplicates", status: "done", detail: "41 groups" },
  { id: "3", title: "Merge each group", status: "running" },
  { id: "4", title: "Notify the record owners", status: "pending" },
];

const ACTIONS: LedgerAction[] = [
  {
    id: "a1",
    summary: "Merged 3 contacts into Acme Inc.",
    reversibility: "revertible",
    status: "applied",
  },
  {
    id: "a2",
    summary: "Refunded $40.00 to Acme Inc.",
    reversibility: "compensable",
    status: "applied",
  },
  {
    id: "a3",
    summary: "Emailed 12 record owners",
    reversibility: "irreversible",
    status: "applied",
  },
];

export default function AgentsPage() {
  const [decision, setDecision] = useState<ApprovalDecision | undefined>(undefined);

  return (
    <AgentConsoleBlock
      title="Deduplicate contacts"
      description="Replace this with a real run from your own agent."
      state={decision ? "working" : "waiting"}
      plan={PLAN}
      tokensUsed={42_180}
      tokenLimit={128_000}
      approval={{
        tool: "delete_contacts",
        summary: "Delete 3 contacts that look like duplicates of existing records.",
        arguments: { ids: "c_8812, c_8813, c_8901", reason: "duplicate of c_1204" },
        fields: [
          { name: "ids", label: "Contact ids", readOnly: true },
          { name: "reason", label: "Reason" },
        ],
        irreversible: "Deleted contacts cannot be restored.",
        decision,
      }}
      onApprovalDecision={setDecision}
      actions={ACTIONS}
      onRevert={() => undefined}
      onStop={() => undefined}
    />
  );
}
