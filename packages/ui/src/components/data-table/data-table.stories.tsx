import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/badge";

import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableViewOptions,
} from "./data-table";

interface Deployment {
  id: string;
  branch: string;
  status: "Ready" | "Building" | "Failed";
  duration: number;
}

const DEPLOYMENTS: Deployment[] = [
  { id: "dpl_a1", branch: "main", status: "Ready", duration: 42 },
  { id: "dpl_b2", branch: "feat/shortcuts", status: "Building", duration: 12 },
  { id: "dpl_c3", branch: "fix/tokens", status: "Failed", duration: 8 },
  { id: "dpl_d4", branch: "main", status: "Ready", duration: 51 },
  { id: "dpl_e5", branch: "chore/deps", status: "Ready", duration: 37 },
  { id: "dpl_f6", branch: "feat/table", status: "Ready", duration: 64 },
  { id: "dpl_g7", branch: "main", status: "Failed", duration: 3 },
];

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

/**
 * Annotated rather than inferred: DataTable is generic over the table's feature
 * set, and inferring story args through the meta makes every story demand a
 * fully-typed `table` arg even though they all render their own.
 */
const meta: Meta = {
  title: "Data/Data Table",
  component: DataTable,
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj;

function useDeploymentsTable(data: Deployment[], pageSize = 5) {
  return useTable({
    features,
    data,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    columns: [
      {
        accessorKey: "id",
        header: "Deployment",
        enableSorting: false,
      },
      {
        accessorKey: "branch",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              size="sm"
              variant={
                status === "Ready"
                  ? "success"
                  : status === "Failed"
                    ? "destructive"
                    : "secondary"
              }
            >
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "duration",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.duration}s</span>,
      },
    ],
  });
}

/** Sortable columns, hideable columns and pagination, all driven by the table instance. */
export const Default: Story = {
  render: function Default() {
    const table = useDeploymentsTable(DEPLOYMENTS);

    return (
      <div className="w-[42rem]">
        <div className="flex items-center justify-end pb-3">
          <DataTableViewOptions table={table} />
        </div>
        <DataTable table={table} aria-label="Deployments" />
        <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: function Empty() {
    const table = useDeploymentsTable([]);

    return (
      <div className="w-[42rem]">
        <DataTable table={table} aria-label="Deployments" />
        <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
      </div>
    );
  },
};

/** The status slot replaces the page position for things like a selection count. */
export const WithStatusSlot: Story = {
  render: function WithStatusSlot() {
    const table = useDeploymentsTable(DEPLOYMENTS);

    return (
      <div className="w-[42rem]">
        <DataTable table={table} aria-label="Deployments" />
        <DataTablePagination
          table={table}
          pageSizes={[5, 10, 20]}
          status={`${DEPLOYMENTS.length} deployments`}
        />
      </div>
    );
  },
};
