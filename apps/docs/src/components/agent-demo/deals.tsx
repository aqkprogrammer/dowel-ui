"use client";

import { useAgentTool } from "@dowel-ui/react/agent-surface";
import { Badge } from "@dowel-ui/react/badge";
import { Input } from "@dowel-ui/react/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dowel-ui/react/table";
import { useId, useRef, useState } from "react";

const STAGES = ["Discovery", "Proposal", "Negotiation", "Renewal", "Won", "Lost"] as const;
type Stage = (typeof STAGES)[number];

interface Deal {
  id: string;
  name: string;
  owner: string;
  stage: Stage;
  amount: number;
}

const DEALS: Deal[] = [
  { id: "d1", name: "Acme expansion", owner: "Dana", stage: "Negotiation", amount: 48_000 },
  { id: "d2", name: "Bolt renewal", owner: "Sam", stage: "Renewal", amount: 120_000 },
  { id: "d3", name: "Cove pilot", owner: "Ana", stage: "Discovery", amount: 12_000 },
  { id: "d4", name: "Dune upsell", owner: "Lee", stage: "Proposal", amount: 30_000 },
  { id: "d5", name: "Echo renewal", owner: "Dana", stage: "Renewal", amount: 64_000 },
];

// A fixed locale: the server and the browser must write the same text.
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function matches(deal: Deal, text: string): boolean {
  const needle = text.trim().toLowerCase();
  return !needle || `${deal.name} ${deal.stage} ${deal.owner}`.toLowerCase().includes(needle);
}

/**
 * A deals table whose every action is also a tool.
 *
 * Each tool calls the same state setter the person's click does, so there is
 * no second code path for the agent to drift out of step with. What differs
 * is what each tool says about itself: reading is marked as reading, a stage
 * change registers how to undo it, and emailing is irreversible, so it waits
 * for the person and shows them who would be emailed.
 */
export function Deals() {
  const [deals, setDeals] = useState(DEALS);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<{
    column: "name" | "amount";
    direction: "asc" | "desc";
  }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailed, setEmailed] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const filterId = useId();

  const visible = deals
    .filter((deal) => matches(deal, query))
    .sort((a, b) => {
      if (!order) return 0;
      const sign = order.direction === "asc" ? 1 : -1;
      return a[order.column] > b[order.column] ? sign : -sign;
    });
  const chosen = deals.filter((deal) => selected.has(deal.id));

  useAgentTool({
    name: "list_deals",
    title: "Read the deals",
    description:
      "The deals currently shown, in table order: id, name, owner, stage, amount in US dollars, " +
      "whether each is selected and whether its owner has been emailed.",
    effect: "read",
    describe: () => "Read the deals table",
    execute: () => ({
      filter: query,
      deals: visible.map((deal) => ({
        ...deal,
        selected: selected.has(deal.id),
        emailed: emailed.has(deal.id),
      })),
    }),
  });

  useAgentTool<{ text: string }>({
    name: "filter_deals",
    title: "Filter the deals",
    description:
      "Show only deals whose name, stage or owner contains the text. Empty text shows all.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to match" } },
      required: ["text"],
      additionalProperties: false,
    },
    target: filterRef,
    describe: ({ text }) => (text ? `Filtered deals to “${text}”` : "Cleared the filter"),
    execute: ({ text }, { onUndo }) => {
      const before = query;
      setQuery(text);
      onUndo(() => {
        setQuery(before);
      });
      return `${String(deals.filter((deal) => matches(deal, text)).length)} deals match.`;
    },
  });

  useAgentTool<{ column: "name" | "amount"; direction?: "asc" | "desc" }>({
    name: "sort_deals",
    title: "Sort the deals",
    description: "Sort the table by a column.",
    inputSchema: {
      type: "object",
      properties: {
        column: { type: "string", enum: ["name", "amount"] },
        direction: { type: "string", enum: ["asc", "desc"] },
      },
      required: ["column"],
      additionalProperties: false,
    },
    target: tableRef,
    describe: ({ column, direction = "asc" }) => `Sorted by ${column}, ${direction}`,
    execute: ({ column, direction = "asc" }) => {
      setOrder({ column, direction });
    },
  });

  useAgentTool<{ ids: string[] }>({
    name: "select_deals",
    title: "Select deals",
    description: "Select deals by id, replacing the current selection.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
      additionalProperties: false,
    },
    target: tableRef,
    describe: ({ ids }) =>
      `Selected ${String(ids.length)} ${ids.length === 1 ? "deal" : "deals"}`,
    execute: ({ ids }, { onUndo }) => {
      const unknown = ids.filter((id) => !deals.some((deal) => deal.id === id));
      if (unknown.length > 0) throw new Error(`No deal with id ${unknown.join(", ")}.`);
      const before = selected;
      setSelected(new Set(ids));
      onUndo(() => {
        setSelected(before);
      });
    },
  });

  useAgentTool<{ id: string; stage: Stage }>({
    name: "set_stage",
    title: "Change a deal's stage",
    description: "Move one deal to another stage.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The deal's id" },
        stage: { type: "string", enum: [...STAGES] },
      },
      required: ["id", "stage"],
      additionalProperties: false,
    },
    target: tableRef,
    describe: ({ id, stage }) =>
      `Moved ${deals.find((deal) => deal.id === id)?.name ?? id} to ${stage}`,
    execute: ({ id, stage }, { onUndo }) => {
      const deal = deals.find((candidate) => candidate.id === id);
      if (!deal) throw new Error(`No deal with id ${id}.`);
      const before = deal.stage;
      const move = (to: Stage) => {
        setDeals((current) =>
          current.map((candidate) =>
            candidate.id === id ? { ...candidate, stage: to } : candidate,
          ),
        );
      };
      move(stage);
      onUndo(() => {
        move(before);
      });
      return `${deal.name} is now in ${stage} (was ${before}).`;
    },
  });

  useAgentTool({
    name: "email_owners",
    title: "Email deal owners",
    description:
      "Email the owner of every selected deal a reminder about it. Select the deals first.",
    reversibility: "irreversible",
    precondition: () => (selected.size === 0 ? "No deals are selected." : undefined),
    preview: () => ({
      changes: chosen.map((deal) => ({
        id: deal.id,
        label: `Email to ${deal.owner}`,
        kind: "create" as const,
        detail: `About ${deal.name}`,
      })),
      noun: { one: "email", other: "emails" },
    }),
    describe: () =>
      `Emailed the ${chosen.length === 1 ? "owner" : "owners"} of ${String(chosen.length)} ` +
      (chosen.length === 1 ? "deal" : "deals"),
    execute: () => {
      setEmailed(new Set([...emailed, ...selected]));
      return `Sent ${String(chosen.length)} emails: ${chosen
        .map((deal) => `${deal.owner} about ${deal.name}`)
        .join("; ")}.`;
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={filterId} className="text-sm font-medium">
          Filter deals
        </label>
        <Input
          id={filterId}
          ref={filterRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Name, stage or owner"
        />
      </div>
      <Table ref={tableRef} aria-label="Deals">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Selected</span>
            </TableHead>
            <TableHead>Deal</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-end">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((deal) => (
            <TableRow key={deal.id} data-state={selected.has(deal.id) ? "selected" : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Select ${deal.name}`}
                  checked={selected.has(deal.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(deal.id)) next.delete(deal.id);
                    else next.add(deal.id);
                    setSelected(next);
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{deal.name}</TableCell>
              <TableCell>
                {deal.owner}
                {emailed.has(deal.id) ? (
                  <Badge variant="secondary" className="ms-2">
                    Emailed
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>{deal.stage}</TableCell>
              <TableCell className="text-end tabular-nums">
                {money.format(deal.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
