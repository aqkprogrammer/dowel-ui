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
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentSurface, type AgentSurfaceApi, type AgentToolResult } from "../agent-surface";
import { DataTable, DataTableColumnHeader } from "../data-table";
import { useDataTableAgentTools } from "./agent-data-table";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount: number;
}

const DEALS: Deal[] = [
  { id: "d1", name: "Acme", stage: "Negotiation", amount: 48 },
  { id: "d2", name: "Bolt", stage: "Renewal", amount: 120 },
  { id: "d3", name: "Cove", stage: "Discovery", amount: 12 },
  { id: "d4", name: "Dune", stage: "Renewal", amount: 30 },
];

const full = tableFeatures({
  rowSortingFeature,
  globalFilteringFeature,
  columnFilteringFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
});

function Deals({ pageSize = 10 }: { pageSize?: number }) {
  const table = useTable({
    features: full,
    data: DEALS,
    getRowId: (deal) => deal.id,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    globalFilterFn: "includesString",
    columns: [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Deal" />,
        filterFn: "includesString",
      },
      { accessorKey: "stage", header: "Stage", filterFn: "equalsString" },
      { accessorKey: "amount", header: "Amount" },
    ],
  });
  useDataTableAgentTools(table, {
    name: "deals",
    description: "Deals in the pipeline",
    columnLabels: { name: "Deal" },
  });
  return <DataTable table={table} aria-label="Deals" />;
}

const sortOnly = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

function SortOnly() {
  const table = useTable({
    features: sortOnly,
    data: DEALS,
    columns: [{ accessorKey: "name", header: "Deal" }],
  });
  useDataTableAgentTools(table, { name: "deals", description: "Deals" });
  return <DataTable table={table} aria-label="Deals" />;
}

function setup(ui = <Deals />) {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(<AgentSurface apiRef={apiRef}>{ui}</AgentSurface>);
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  const call = async (name: string, input?: Record<string, unknown>) => {
    let result: AgentToolResult = { ok: false, status: "refused", text: "" };
    await act(async () => {
      result = await api().call(name, input);
    });
    return result;
  };
  return { ...utils, api, call };
}

function names(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent ?? "");
}

describe("useDataTableAgentTools", () => {
  it("offers a tool for each feature the table has", () => {
    const { api } = setup();
    expect(
      api()
        .tools()
        .map((tool) => tool.name),
    ).toEqual([
      "deals_rows",
      "deals_sort",
      "deals_search",
      "deals_filter",
      "deals_select",
      "deals_page",
    ]);
  });

  it("offers nothing a table cannot do", () => {
    const { api } = setup(<SortOnly />);
    expect(
      api()
        .tools()
        .map((tool) => tool.name),
    ).toEqual(["deals_rows", "deals_sort"]);
  });

  it("describes the columns to the model, by id and label", () => {
    const { api } = setup();
    const rows = api()
      .tools()
      .find((tool) => tool.name === "deals_rows");
    expect(rows?.description).toContain(
      "Columns: name (Deal), stage (Stage), amount (Amount).",
    );
    expect(rows?.annotations).toMatchObject({ readOnlyHint: true, untrustedContentHint: true });
  });

  it("reads the rows shown, with ids, totals and the page", async () => {
    const { call } = setup(<Deals pageSize={2} />);
    const result = await call("deals_rows");
    expect(result.data).toEqual({
      rows: [
        { id: "d1", name: "Acme", stage: "Negotiation", amount: 48, selected: false },
        { id: "d2", name: "Bolt", stage: "Renewal", amount: 120, selected: false },
      ],
      total: 4,
      page: { number: 1, of: 2 },
      sorting: [],
      search: undefined,
    });
  });

  it("sorts exactly as the column header does", async () => {
    const user = userEvent.setup();
    const { call } = setup();
    await call("deals_sort", { column: "amount", direction: "desc" });
    expect(names()).toEqual(["Bolt", "Acme", "Dune", "Cove"]);

    // A person sorting by the header lands in the same state the tool did.
    await user.click(screen.getByRole("button", { name: /Deal, not sorted/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sort descending" }));
    expect(names()).toEqual(["Dune", "Cove", "Bolt", "Acme"]);
    expect(screen.getByRole("columnheader", { name: /Deal/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await call("deals_sort", { column: "name", direction: "none" });
    expect(names()).toEqual(["Acme", "Bolt", "Cove", "Dune"]);
  });

  it("refuses a column it cannot sort by, naming the ones it can", async () => {
    const { call } = setup();
    const result = await call("deals_sort", { column: "owner" });
    expect(result.text).toBe(
      'Invalid input: column must be one of: "name", "stage", "amount".',
    );
  });

  it("searches across columns, and says how many match", async () => {
    const { call } = setup();
    const result = await call("deals_search", { text: "renewal" });
    expect(result.text).toBe("2 rows match.");
    expect(names()).toEqual(["Bolt", "Dune"]);
    await call("deals_search", { text: "" });
    expect(names()).toHaveLength(4);
  });

  it("filters one column, and removes the filter with an empty value", async () => {
    const { call } = setup();
    expect((await call("deals_filter", { column: "stage", value: "Renewal" })).text).toBe(
      "2 rows match.",
    );
    expect(names()).toEqual(["Bolt", "Dune"]);
    await call("deals_filter", { column: "stage", value: "" });
    expect(names()).toHaveLength(4);
  });

  it("selects rows by id, adding and removing", async () => {
    const { call } = setup();
    expect((await call("deals_select", { ids: ["d1", "d3"] })).text).toBe("2 selected.");
    expect((await call("deals_select", { ids: ["d4"], mode: "add" })).text).toBe("3 selected.");
    expect((await call("deals_select", { ids: ["d1"], mode: "remove" })).text).toBe(
      "2 selected.",
    );
    const rows = (await call("deals_rows")).data as {
      rows: { id: string; selected: boolean }[];
    };
    expect(rows.rows.filter((row) => row.selected).map((row) => row.id)).toEqual(["d3", "d4"]);
    expect(
      screen.getAllByRole("row").filter((row) => row.dataset.state === "selected"),
    ).toHaveLength(2);
  });

  it("refuses ids that are not rows, and says where to find them", async () => {
    const { call } = setup();
    const result = await call("deals_select", { ids: ["d9"] });
    expect(result).toMatchObject({ ok: false });
    expect(result.text).toBe("Failed: No row with id d9. Read the rows for their ids.");
  });

  it("goes to a page numbered from one, and no further than the last", async () => {
    const { call } = setup(<Deals pageSize={2} />);
    await call("deals_page", { page: 2 });
    expect(names()).toEqual(["Cove", "Dune"]);
    const result = await call("deals_page", { page: 3 });
    expect(result.text).toBe("Invalid input: page must be at most 2.");
  });

  it("registers no undo for a view change, so the ledger leaves it out", async () => {
    const calls: { tool: string; undoable: boolean; status: string }[] = [];
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef} onToolCall={(entry) => calls.push(entry)}>
        <Deals />
      </AgentSurface>,
    );
    await act(async () => {
      await apiRef.current?.call("deals_sort", { column: "name" });
    });
    expect(calls.at(-1)).toMatchObject({ tool: "deals_sort", status: "done", undoable: false });
  });

  it("has no detectable accessibility violations after the agent acts", async () => {
    const { call, container } = setup();
    await call("deals_select", { ids: ["d2"] });
    await expectNoA11yViolations(container);
  });
});
