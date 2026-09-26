import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useId, useRef, useState, type RefObject } from "react";

import { AgentApprovals } from "@/components/agent-approvals";
import { AgentLedger } from "@/components/agent-ledger";
import { Button } from "@/components/button";
import { ControlBaton } from "@/components/control-baton";
import { Input } from "@/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";

import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "./agent-surface";
import { isWebMCPAvailable } from "./webmcp";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-3xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Agent Surface",
  component: AgentSurface,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof AgentSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount: number;
}

const DEALS: Deal[] = [
  { id: "d1", name: "Acme expansion", stage: "Negotiation", amount: 48_000 },
  { id: "d2", name: "Bolt renewal", stage: "Renewal", amount: 120_000 },
  { id: "d3", name: "Cove pilot", stage: "Discovery", amount: 12_000 },
  { id: "d4", name: "Dune upsell", stage: "Proposal", amount: 30_000 },
  { id: "d5", name: "Echo renewal", stage: "Renewal", amount: 64_000 },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function matches(deal: Deal, text: string): boolean {
  const needle = text.trim().toLowerCase();
  return !needle || `${deal.name} ${deal.stage}`.toLowerCase().includes(needle);
}

/**
 * A deals table whose every action is also a tool. Each tool calls the same
 * state setter the person's input does — there is no second code path for
 * the agent to drift out of step with.
 */
function DealsTable() {
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

  const visible = DEALS.filter((deal) => matches(deal, query)).sort((a, b) => {
    if (!order) return 0;
    const sign = order.direction === "asc" ? 1 : -1;
    return a[order.column] > b[order.column] ? sign : -sign;
  });

  useAgentTool({
    name: "list_deals",
    description: "The deals currently shown, in table order, with which are selected.",
    effect: "read",
    describe: () => "Read the deals table",
    execute: () => ({
      deals: visible.map((deal) => ({ ...deal, selected: selected.has(deal.id) })),
    }),
  });

  useAgentTool<{ text: string }>({
    name: "filter_deals",
    description: "Show only deals whose name or stage contains the text. Empty text shows all.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to match" } },
      required: ["text"],
      additionalProperties: false,
    },
    target: filterRef,
    describe: ({ text }) => (text ? `Filtered deals to “${text}”` : "Cleared the filter"),
    execute: ({ text }) => {
      setQuery(text);
      const count = DEALS.filter((deal) => matches(deal, text)).length;
      return `${String(count)} deals match.`;
    },
  });

  useAgentTool<{ column: "name" | "amount"; direction?: "asc" | "desc" }>({
    name: "sort_deals",
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
    description: "Select deals by id, replacing the current selection.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
    },
    target: tableRef,
    describe: ({ ids }) => `Selected ${String(ids.length)} deals`,
    execute: ({ ids }, { onUndo }) => {
      const unknown = ids.filter((id) => !DEALS.some((deal) => deal.id === id));
      if (unknown.length > 0) throw new Error(`No deal with id ${unknown.join(", ")}`);
      const before = selected;
      setSelected(new Set(ids));
      onUndo(() => {
        setSelected(before);
      });
    },
  });

  useAgentTool({
    name: "email_owners",
    title: "Email deal owners",
    description: "Email the owner of every selected deal a renewal reminder. Cannot be unsent.",
    reversibility: "irreversible",
    describe: () => `Emailed the owners of ${String(selected.size)} deals`,
    execute: () => {
      if (selected.size === 0) throw new Error("Select deals first.");
      setEmailed(new Set([...emailed, ...selected]));
      return `Sent ${String(selected.size)} emails.`;
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
          placeholder="Name or stage"
        />
      </div>
      <Table ref={tableRef} aria-label="Deals">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Selected</span>
            </TableHead>
            <TableHead>Deal</TableHead>
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
              <TableCell className="font-medium">
                {deal.name}
                {emailed.has(deal.id) ? (
                  <span className="ms-2 text-xs text-muted-foreground">Emailed</span>
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

type Step = { tool: string; input?: Record<string, unknown> } | { handOver: string };

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Stands in for a model. A real agent would decide each step from the last
 * result; this one follows a script, but it meets refusals and hand-backs the
 * way a real one does — through what each call tells it.
 */
function useScriptedAgent(apiRef: RefObject<AgentSurfaceApi | null>, script: Step[]) {
  const [log, setLog] = useState<{ id: number; text: string; tone: "call" | "reply" }[]>([]);
  const [running, setRunning] = useState(false);
  const next = useRef(0);

  const write = (text: string, tone: "call" | "reply") => {
    next.current += 1;
    const id = next.current;
    setLog((current) => [...current, { id, text, tone }]);
  };

  const run = async () => {
    const api = apiRef.current;
    if (!api || running) return;
    setRunning(true);
    setLog([]);
    api.grant();

    for (const step of script) {
      await wait(1200);
      if ("handOver" in step) {
        write(`hands over: ${step.handOver}`, "call");
        api.handOver(step.handOver);
        continue;
      }
      for (;;) {
        write(`${step.tool}(${JSON.stringify(step.input ?? {})})`, "call");
        const result = await api.call(step.tool, step.input);
        write(result.text, "reply");
        if (result.status !== "refused" || api.getHolder() !== "person") break;
        // Refused because the person holds control: wait for the hand-back.
        while (api.getHolder() === "person") await wait(300);
      }
    }

    await wait(800);
    api.release();
    setRunning(false);
  };

  return { log, running, run };
}

function Transcript({ log }: { log: { id: number; text: string; tone: "call" | "reply" }[] }) {
  return (
    <section aria-label="What the agent sent and was told" className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">Agent transcript</h3>
      <ol className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
        {log.length === 0 ? <li className="text-muted-foreground">Not started.</li> : null}
        {log.map((line) => (
          <li
            key={line.id}
            className={
              line.tone === "call"
                ? "text-foreground"
                : "ps-4 whitespace-pre-wrap text-muted-foreground"
            }
          >
            {line.tone === "call" ? "→ " : "← "}
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Desk({ script, webmcp = false }: { script: Step[]; webmcp?: boolean }) {
  const apiRef = useRef<AgentSurfaceApi>(null);
  const { log, running, run } = useScriptedAgent(apiRef, script);

  return (
    <AgentSurface
      apiRef={apiRef}
      agentName="Claude"
      name={webmcp ? "deals" : undefined}
      webmcp={webmcp}
      className="flex flex-col gap-4 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ControlBaton className="flex-1" />
        <Button onClick={() => void run()} disabled={running} variant="outline">
          {running ? "Agent running…" : "Run the agent"}
        </Button>
      </div>
      {/* Mounting it is the wiring: approvals go to it, and without it
          irreversible calls are refused. */}
      <AgentApprovals />
      <DealsTable />
      <Transcript log={log} />
      <AgentLedger />
    </AgentSurface>
  );
}

const WORK: Step[] = [
  { tool: "list_deals" },
  { tool: "filter_deals", input: { text: "renewal" } },
  { tool: "sort_deals", input: { column: "amount", direction: "desc" } },
  { tool: "select_deals", input: { ids: ["d2", "d5"] } },
  { tool: "email_owners" },
];

/**
 * Run the agent, then take over — with the baton, or just by typing in the
 * filter or ticking a box, since operating a control while the agent drives
 * is taking over. Its next call is refused; hand back with a note and the
 * transcript shows the note arriving with the call after that. The email step
 * cannot be undone, so it waits for approval in `agent-approvals`; afterwards
 * `agent-ledger` lists what can be taken back and what cannot.
 */
export const Default: Story = {
  render: () => <Desk script={WORK} />,
};

/**
 * The agent reaches something only the person can do and hands over, saying
 * why. The person does it, hands back with a note, and the agent carries on
 * knowing what changed.
 */
export const AgentNeedsYou: Story = {
  render: () => (
    <Desk
      script={[
        { tool: "filter_deals", input: { text: "renewal" } },
        { handOver: "Sign in to the CRM so I can export these deals" },
        { tool: "list_deals" },
      ]}
    />
  ),
};

/**
 * The same tools, exposed to whatever agent runs in the browser through
 * WebMCP (Chrome and Edge origin trials; locally, chrome://flags/#enable-webmcp-testing).
 * The names carry the surface's prefix: deals_filter_deals, deals_sort_deals…
 */
export const BrowserAgents: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {isWebMCPAvailable()
          ? "This browser supports WebMCP: the table's tools are registered with it now."
          : "This browser does not expose WebMCP, so nothing is registered — the page works exactly the same."}
      </p>
      <Desk script={WORK} webmcp />
    </div>
  ),
};
