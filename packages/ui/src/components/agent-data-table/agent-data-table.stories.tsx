import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { AgentSurface, type AgentSurfaceApi } from "@/components/agent-surface";
import { Button } from "@/components/button";
import { ControlBaton } from "@/components/control-baton";
import { DataTable, DataTableColumnHeader, DataTablePagination } from "@/components/data-table";
import { Input } from "@/components/input";

import { useDataTableAgentTools } from "./agent-data-table";

/** Annotated rather than inferred: the story renders its own table. */
const meta: Meta = {
  title: "AI/Agent Data Table",
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj;

interface Deployment {
  id: string;
  branch: string;
  status: string;
  duration: number;
}

const DEPLOYMENTS: Deployment[] = [
  { id: "dpl_a1", branch: "main", status: "Ready", duration: 42 },
  { id: "dpl_b2", branch: "feat/shortcuts", status: "Building", duration: 12 },
  { id: "dpl_c3", branch: "fix/tokens", status: "Failed", duration: 8 },
  { id: "dpl_d4", branch: "main", status: "Ready", duration: 51 },
  { id: "dpl_e5", branch: "chore/deps", status: "Ready", duration: 37 },
  { id: "dpl_f6", branch: "feat/table", status: "Failed", duration: 64 },
  { id: "dpl_g7", branch: "main", status: "Failed", duration: 3 },
];

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
});

function Deployments() {
  const tableRef = useRef<HTMLDivElement>(null);
  const table = useTable({
    features,
    data: DEPLOYMENTS,
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
    columns: [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.id}`}
            checked={row.getIsSelected()}
            onChange={() => {
              row.toggleSelected();
            }}
          />
        ),
      },
      { accessorKey: "id", header: "Deployment", enableSorting: false },
      {
        accessorKey: "branch",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      },
      {
        accessorKey: "duration",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Duration (s)" />,
      },
    ],
  });

  useDataTableAgentTools(table, {
    name: "deployments",
    description: "Recent deployments of the web app",
    columnLabels: { branch: "Branch", status: "Status", duration: "Duration in seconds" },
    target: tableRef,
  });

  return (
    <div ref={tableRef} className="flex flex-col gap-3 rounded-lg">
      <Input
        aria-label="Search deployments"
        placeholder="Search deployments"
        value={String(table.state.globalFilter ?? "")}
        onChange={(event) => {
          table.setGlobalFilter(event.target.value);
        }}
      />
      <DataTable table={table} aria-label="Deployments" />
      <DataTablePagination table={table} pageSizes={[5, 10]} />
    </div>
  );
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * The agent uses the table's own API — the one the search box, the column
 * headers and the checkboxes use. Watch the header's sort state and the
 * pagination's live region report what it did, exactly as they would for you.
 * Operate any control while it runs and you have taken over.
 */
export const Default: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const [log, setLog] = useState<string[]>([]);

    const run = async () => {
      const api = apiRef.current;
      if (!api) return;
      setLog([]);
      api.grant();
      const steps: [string, Record<string, unknown>][] = [
        ["deployments_search", { text: "Failed" }],
        ["deployments_sort", { column: "duration", direction: "desc" }],
        ["deployments_select", { ids: ["dpl_f6", "dpl_c3"] }],
        ["deployments_search", { text: "" }],
        ["deployments_page", { page: 2 }],
      ];
      for (const [tool, input] of steps) {
        await wait(1000);
        const result = await api.call(tool, input);
        setLog((current) => [...current, `${tool} → ${result.text}`]);
        if (result.status === "refused") break;
      }
      api.release();
    };

    return (
      <AgentSurface
        apiRef={apiRef}
        agentName="Claude"
        className="flex w-full max-w-3xl flex-col gap-4 p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ControlBaton className="flex-1" />
          <Button variant="outline" onClick={() => void run()}>
            Run the agent
          </Button>
        </div>
        <Deployments />
        {log.length > 0 ? (
          <ol
            aria-label="What the agent did"
            className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 font-mono text-xs"
          >
            {log.map((line, index) => (
              <li key={`${String(index)}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : null}
      </AgentSurface>
    );
  },
};
