"use client";

import {
  flexRender,
  type RowData,
  type Table as TanstackTable,
  type TableFeatures,
} from "@tanstack/react-table";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { Button } from "@/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Presentation for a TanStack Table instance.
 *
 * Deliberately not a component that takes `data` and `columns` and does
 * everything. Sorting, filtering, selection and pagination are the table
 * library's job and it does them well; wrapping them in props would re-expose
 * an API that already exists, badly, and block anything the wrapper did not
 * anticipate. The consumer owns the instance:
 *
 *   const table = useTable({ features, columns, data });
 *   <DataTable table={table} />
 *
 * ## How these are typed
 *
 * The table library's features are opt-in, and its types follow: a method like
 * `getCanSort` exists only when the sorting feature is enabled.
 *
 * The controls below therefore declare **the shape they need** rather than
 * being generic over feature flags. A column from a table without sorting does
 * not satisfy `SortableColumn`, so passing one is a compile error at the call
 * site — the guarantee we wanted, and it survives the library reshuffling its
 * internal feature types.
 *
 * `DataTable` itself has to render any table, so it uses the core API and
 * detects the optional extras with real type guards.
 */

/* -------------------------------------------------------------------------- */
/* Capability detection                                                        */
/* -------------------------------------------------------------------------- */

interface WithSortState {
  getIsSorted: () => "asc" | "desc" | false;
  getCanSort: () => boolean;
}

interface WithSize {
  getSize: () => number;
}

interface WithSelection {
  getIsSelected: () => boolean;
}

interface WithVisibility {
  getIsVisible: () => boolean;
}

function hasSortState(column: object): column is WithSortState {
  return "getIsSorted" in column && "getCanSort" in column;
}

function hasSize(header: object): header is WithSize {
  return "getSize" in header;
}

function hasSelection(row: object): row is WithSelection {
  return "getIsSelected" in row;
}

function hasVisibility(column: object): column is WithVisibility {
  return "getIsVisible" in column;
}

/**
 * Whether a column's cells should render.
 *
 * A table without the visibility feature has no notion of hidden columns, so
 * everything renders. With the feature on, this has to be honoured for cells as
 * well as headers — dropping a header while still rendering its cells shifts
 * every row out of alignment with the columns above it.
 */
function isColumnVisible(column: object): boolean {
  return !hasVisibility(column) || column.getIsVisible();
}

function ariaSort(column: object): "ascending" | "descending" | "none" | undefined {
  if (!hasSortState(column)) return undefined;

  const sorted = column.getIsSorted();
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return column.getCanSort() ? "none" : undefined;
}

function columnWidth(header: object): { width: number } | undefined {
  if (!hasSize(header)) return undefined;

  const size = header.getSize();
  return size ? { width: size } : undefined;
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export interface DataTableProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> extends Omit<ComponentPropsWithRef<"table">, "children"> {
  table: TanstackTable<TFeatures, TData>;
  /** Shown in place of rows when there are none. */
  empty?: ReactNode;
}

export function DataTable<TFeatures extends TableFeatures, TData extends RowData>({
  table,
  empty,
  className,
  ...props
}: DataTableProps<TFeatures, TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className="rounded-lg border border-border">
      <Table className={cn(className)} {...props}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={columnWidth(header)}
                  // Announces the current sort. Without it the arrow icon is the
                  // only signal, which is no signal at all for a screen reader.
                  aria-sort={ariaSort(header.column)}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-32 p-0 text-center">
                {empty ?? <span className="text-sm text-muted-foreground">No results.</span>}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={hasSelection(row) && row.getIsSelected() ? "selected" : undefined}
              >
                {row
                  .getAllCells()
                  .filter((cell) => isColumnVisible(cell.column))
                  .map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sortable column header                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The slice of a column a sortable header needs.
 *
 * A column from a table without the sorting feature does not have these
 * methods, so passing one is a compile error rather than a runtime crash.
 */
export interface SortableColumn {
  getCanSort: () => boolean;
  getIsSorted: () => "asc" | "desc" | false;
  toggleSorting: (desc?: boolean) => void;
}

export interface DataTableColumnHeaderProps extends ComponentPropsWithRef<"div"> {
  column: SortableColumn;
  title: string;
}

/**
 * A sortable column header.
 *
 * Falls back to plain text when the column cannot be sorted, rather than
 * rendering a button that does nothing — a control that looks interactive and
 * is not is worse than no control.
 */
export function DataTableColumnHeader({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("text-xs font-medium", className)} {...props}>
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 h-7 gap-1 px-2 font-medium text-muted-foreground data-[state=open]:bg-accent"
          >
            {title}
            <SortIcon direction={sorted === false ? undefined : sorted} />
            <span className="sr-only">
              {sorted === "asc"
                ? `${title}, sorted ascending`
                : sorted === "desc"
                  ? `${title}, sorted descending`
                  : `${title}, not sorted`}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              column.toggleSorting(false);
            }}
          >
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              column.toggleSorting(true);
            }}
          >
            Sort descending
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortIcon({ direction }: { direction?: "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5 opacity-70">
      <path
        d={
          direction === "asc"
            ? "m7 14 5-5 5 5"
            : direction === "desc"
              ? "m7 10 5 5 5-5"
              : "m8 10 4-4 4 4M8 14l4 4 4-4"
        }
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Column visibility                                                           */
/* -------------------------------------------------------------------------- */

/** The slice of a table the column toggle needs. */
export interface HideableTable {
  getAllColumns: () => {
    id: string;
    getCanHide: () => boolean;
    getIsVisible: () => boolean;
    toggleVisibility: (visible?: boolean) => void;
  }[];
}

export interface DataTableViewOptionsProps {
  table: HideableTable;
  label?: string;
}

/** Toggles column visibility. */
export function DataTableViewOptions({ table, label = "Columns" }: DataTableViewOptionsProps) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => {
              column.toggleVisibility(checked === true);
            }}
          >
            {column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The slice of a table the page controls need.
 *
 * `state` is a property, not a `getState()` call — the table library moved to a
 * reactive state object, and reading it the old way fails at runtime rather
 * than at compile time.
 */
export interface PaginatedTable {
  state: { pagination: { pageIndex: number; pageSize: number } };
  getPageCount: () => number;
  setPageSize: (size: number) => void;
  previousPage: () => void;
  nextPage: () => void;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
}

export interface DataTablePaginationProps {
  table: PaginatedTable;
  pageSizes?: number[];
  /**
   * Replaces the page position on the left.
   *
   * A slot rather than a `showSelectionCount` flag: a selection count needs the
   * selection and filtering features, and demanding those here would break
   * every table that only paginates.
   */
  status?: ReactNode;
}

/**
 * Page controls for a table.
 *
 * The page position is a polite live region: paging replaces the rows in place,
 * and without an announcement a screen reader user gets no confirmation that
 * anything happened.
 */
export function DataTablePagination({
  table,
  pageSizes = [10, 20, 50, 100],
  status,
}: DataTablePaginationProps) {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-3">
      <div className="text-sm text-muted-foreground" aria-live="polite">
        {status ?? (
          <>
            Page {pageIndex + 1} of {Math.max(1, pageCount)}
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground" id="rows-per-page">
            Rows per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger triggerSize="sm" className="w-18" aria-labelledby="rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={mirrorForDirection}
            >
              <path
                d="m15 18-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to next page"
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={mirrorForDirection}
            >
              <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
