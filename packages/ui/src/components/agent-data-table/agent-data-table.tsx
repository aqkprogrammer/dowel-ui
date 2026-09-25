"use client";

import type { RowData, Table, TableFeatures } from "@tanstack/react-table";

import { useAgentTool } from "@/components/agent-surface";

/**
 * A TanStack table's own controls, offered to an agent as tools.
 *
 * Every tool calls the table's own API — `setSorting`, `setGlobalFilter`,
 * `setRowSelection`, `setPageIndex` — which is exactly what the column header,
 * the search box and the checkboxes call when a person uses them. There is no
 * second copy of the table's state for the agent to drift out of step with.
 *
 * Tools exist only for features the table has: a table without the sorting
 * feature is offered no `sort` tool, rather than one that fails. The table is
 * detected at runtime, as `DataTable` does, so any table works — rendered by
 * `data-table` or not.
 */

interface ColumnLike {
  id: string;
  columnDef: { header?: unknown; accessorKey?: unknown; accessorFn?: unknown };
  getCanSort?: () => boolean;
  getIsSorted?: () => false | "asc" | "desc";
  getCanFilter?: () => boolean;
  getFilterValue?: () => unknown;
  setFilterValue?: (value: unknown) => void;
}

interface CellLike {
  column: { id: string };
  getValue: () => unknown;
}

interface RowLike {
  id: string;
  getAllCells: () => CellLike[];
  getIsSelected?: () => boolean;
}

interface RowModelLike {
  rows: RowLike[];
  rowsById?: Record<string, RowLike>;
}

interface TableLike {
  getAllLeafColumns: () => ColumnLike[];
  getRowModel: () => RowModelLike;
  getCoreRowModel?: () => RowModelLike;
  getPrePaginatedRowModel?: () => RowModelLike;
  state?: {
    sorting?: unknown;
    globalFilter?: unknown;
    rowSelection?: Record<string, boolean>;
    pagination?: { pageIndex: number; pageSize: number };
  };
  setSorting?: (sorting: { id: string; desc: boolean }[]) => void;
  setGlobalFilter?: (value: unknown) => void;
  setRowSelection?: (selection: Record<string, boolean>) => void;
  setPageIndex?: (index: number) => void;
  getPageCount?: () => number;
}

export interface DataTableAgentOptions {
  /** Prefixes the tools: "deals" gives deals_rows, deals_sort and so on. */
  name: string;
  /** What the rows are, for the model: "Deals in the sales pipeline". */
  description: string;
  /** Names for columns whose header is not plain text. */
  columnLabels?: Record<string, string>;
  /** Outlined while the agent uses the table. */
  target?: { readonly current: HTMLElement | null };
  /** Registered only while true. */
  enabled?: boolean;
}

function humanise(id: string): string {
  const spaced = id.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function has<K extends keyof TableLike>(
  table: TableLike,
  key: K,
): table is TableLike & Required<Pick<TableLike, K>> {
  return typeof table[key] === "function";
}

function rowRecord(row: RowLike, columns: Set<string>): Record<string, unknown> {
  const record: Record<string, unknown> = { id: row.id };
  for (const cell of row.getAllCells()) {
    if (!columns.has(cell.column.id)) continue;
    const value = cell.getValue();
    if (value !== undefined) record[cell.column.id] = value;
  }
  if (row.getIsSelected) record.selected = row.getIsSelected();
  return record;
}

export function useDataTableAgentTools<TFeatures extends TableFeatures, TData extends RowData>(
  source: Table<TFeatures, TData>,
  { name, description, columnLabels = {}, target, enabled = true }: DataTableAgentOptions,
): void {
  const table = source as unknown as TableLike;
  const columns = table.getAllLeafColumns();
  // Only columns with data: a checkbox or actions column has nothing to read.
  const dataColumns = columns.filter(
    (column) =>
      column.columnDef.accessorKey !== undefined || column.columnDef.accessorFn !== undefined,
  );
  const label = (column: ColumnLike) =>
    columnLabels[column.id] ??
    (typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : humanise(column.id));
  const labelOf = (id: string) => {
    const column = columns.find((candidate) => candidate.id === id);
    return column ? label(column) : id;
  };
  const legend = dataColumns.map((column) => `${column.id} (${label(column)})`).join(", ");

  const sortable = dataColumns.filter((column) => column.getCanSort?.() === true);
  const filterable = dataColumns.filter(
    (column) => column.getCanFilter?.() === true && typeof column.setFilterValue === "function",
  );

  const allRows = () => (table.getPrePaginatedRowModel?.() ?? table.getRowModel()).rows.length;

  useAgentTool({
    name: `${name}_rows`,
    title: `Read ${name}`,
    description:
      `${description}. Returns the rows currently shown, in order, with their ids, ` +
      `the page, how many rows match in total, and the sort and filter in force. Columns: ${legend}.`,
    effect: "read",
    untrustedOutput: true,
    target,
    enabled,
    describe: () => `Read the ${name} table`,
    execute: () => {
      const ids = new Set(dataColumns.map((column) => column.id));
      const pagination = table.state?.pagination;
      return {
        rows: table.getRowModel().rows.map((row) => rowRecord(row, ids)),
        total: allRows(),
        page:
          pagination && has(table, "getPageCount")
            ? { number: pagination.pageIndex + 1, of: Math.max(1, table.getPageCount()) }
            : undefined,
        sorting: table.state?.sorting,
        search: table.state?.globalFilter,
      };
    },
  });

  useAgentTool<{ column: string; direction?: "asc" | "desc" | "none" }>({
    name: `${name}_sort`,
    title: `Sort ${name}`,
    description: `Sort the ${name} table by one column, or clear the sort with direction "none".`,
    inputSchema: {
      type: "object",
      properties: {
        column: { type: "string", enum: sortable.map((column) => column.id) },
        direction: { type: "string", enum: ["asc", "desc", "none"] },
      },
      required: ["column"],
      additionalProperties: false,
    },
    target,
    enabled: enabled && sortable.length > 0 && has(table, "setSorting"),
    describe: ({ column, direction = "asc" }) =>
      direction === "none"
        ? `Cleared the sort on ${name}`
        : `Sorted ${name} by ${labelOf(column)}, ${direction === "asc" ? "ascending" : "descending"}`,
    execute: ({ column, direction = "asc" }) => {
      table.setSorting?.(
        direction === "none" ? [] : [{ id: column, desc: direction === "desc" }],
      );
    },
  });

  useAgentTool<{ text: string }>({
    name: `${name}_search`,
    title: `Search ${name}`,
    description: `Show only ${name} rows containing the text, across every column. Empty text shows all.`,
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
      additionalProperties: false,
    },
    target,
    enabled: enabled && has(table, "setGlobalFilter"),
    describe: ({ text }) =>
      text ? `Searched ${name} for “${text}”` : `Cleared the ${name} search`,
    execute: ({ text }) => {
      table.setGlobalFilter?.(text);
      return `${String(allRows())} rows match.`;
    },
  });

  useAgentTool<{ column: string; value: string }>({
    name: `${name}_filter`,
    title: `Filter ${name}`,
    description: `Filter the ${name} table by one column's value. An empty value removes that filter.`,
    inputSchema: {
      type: "object",
      properties: {
        column: { type: "string", enum: filterable.map((column) => column.id) },
        value: { type: "string" },
      },
      required: ["column", "value"],
      additionalProperties: false,
    },
    target,
    enabled: enabled && filterable.length > 0,
    describe: ({ column, value }) =>
      value
        ? `Filtered ${name} to ${labelOf(column)} “${value}”`
        : `Removed the ${labelOf(column)} filter`,
    execute: ({ column, value }) => {
      const match = filterable.find((candidate) => candidate.id === column);
      match?.setFilterValue?.(value === "" ? undefined : value);
      return `${String(allRows())} rows match.`;
    },
  });

  useAgentTool<{ ids: string[]; mode?: "replace" | "add" | "remove" }>({
    name: `${name}_select`,
    title: `Select ${name}`,
    description:
      `Select ${name} rows by id. "replace" (the default) makes these the whole selection; ` +
      `"add" and "remove" change it.`,
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
        mode: { type: "string", enum: ["replace", "add", "remove"] },
      },
      required: ["ids"],
      additionalProperties: false,
    },
    target,
    enabled: enabled && has(table, "setRowSelection"),
    describe: ({ ids, mode = "replace" }) =>
      mode === "remove"
        ? `Deselected ${String(ids.length)} ${name}`
        : `Selected ${String(ids.length)} ${name}`,
    execute: ({ ids, mode = "replace" }) => {
      const known = (table.getCoreRowModel?.() ?? table.getRowModel()).rowsById ?? {};
      const unknown = ids.filter((id) => !(id in known));
      if (unknown.length > 0) {
        throw new Error(`No row with id ${unknown.join(", ")}. Read the rows for their ids.`);
      }
      const current = mode === "replace" ? {} : { ...table.state?.rowSelection };
      for (const id of ids) {
        if (mode === "remove") delete current[id];
        else current[id] = true;
      }
      table.setRowSelection?.(current);
      return `${String(Object.keys(current).length)} selected.`;
    },
  });

  const pageCount = has(table, "getPageCount") ? table.getPageCount() : 0;
  useAgentTool<{ page: number }>({
    name: `${name}_page`,
    title: `Go to a page of ${name}`,
    description: `Show a page of the ${name} table. Pages are numbered from 1.`,
    inputSchema: {
      type: "object",
      properties: { page: { type: "integer", minimum: 1, maximum: Math.max(1, pageCount) } },
      required: ["page"],
      additionalProperties: false,
    },
    target,
    enabled: enabled && has(table, "setPageIndex") && table.state?.pagination !== undefined,
    describe: ({ page }) => `Went to page ${String(page)} of ${name}`,
    execute: ({ page }) => {
      table.setPageIndex?.(page - 1);
    },
  });
}
