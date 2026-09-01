"use client";

import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableViewOptions,
} from "@/components/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { cn } from "@/lib/utils";

/**
 * A user administration table.
 *
 * The filter is the part worth reading. Results change as you type, which for
 * a screen reader user is a change they never asked for and cannot see — so the
 * row count is announced politely, and the search input is a labelled control
 * rather than a placeholder-only box.
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
}

export interface AdminUsersBlockProps {
  users: AdminUser[];
  onInvite?: () => void;
  onEdit?: (user: AdminUser) => void;
  onRemove?: (user: AdminUser) => void;
  className?: string;
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminUsersBlock({
  users,
  onInvite,
  onEdit,
  onRemove,
  className,
}: AdminUsersBlockProps) {
  const [query, setQuery] = useState("");

  // Filtered here rather than through the table's filtering feature, so the
  // block stays usable without wiring that feature up.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
    );
  }, [users, query]);

  const table = useTable({
    features,
    data: filtered,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    columns: [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initials(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge
            size="sm"
            variant={
              row.original.status === "Active"
                ? "success"
                : row.original.status === "Suspended"
                  ? "destructive"
                  : "secondary"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "lastActive",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last active" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.lastActive}</span>
        ),
      },
      {
        id: "actions",
        // Not an empty header: a th with no text is a column a screen reader
        // cannot name. Hidden visually, present in the table semantics.
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                // Named per row: four identical "Actions" buttons tell a screen
                // reader user nothing about which row they are on.
                aria-label={`Actions for ${row.original.name}`}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{row.original.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  onEdit?.(row.original);
                }}
              >
                Edit member
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onRemove?.(row.original);
                }}
              >
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
  });

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "person" : "people"} in this workspace.
          </p>
        </div>
        <Button onClick={onInvite}>Invite people</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 gap-1.5 sm:max-w-xs">
          {/* A real label, not a placeholder: placeholders vanish as soon as
              anyone types, taking the field's name with them. */}
          <Label htmlFor="user-filter" className="sr-only">
            Filter by name or email
          </Label>
          <Input
            id="user-filter"
            inputSize="sm"
            type="search"
            placeholder="Filter by name or email…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        <DataTableViewOptions table={table} />
      </div>

      {/* Filtering changes the results without the user asking, so the count is
          announced. Polite, so it waits for a pause in typing. */}
      <p aria-live="polite" className="sr-only">
        {filtered.length} {filtered.length === 1 ? "person" : "people"} match the filter.
      </p>

      <DataTable
        table={table}
        aria-label="Team members"
        empty={
          <EmptyState size="sm">
            <EmptyStateTitle>No one matches “{query}”</EmptyStateTitle>
            <EmptyStateDescription>
              Try a different name or email address.
            </EmptyStateDescription>
          </EmptyState>
        }
      />

      <DataTablePagination table={table} pageSizes={[10, 25, 50]} />
    </div>
  );
}
