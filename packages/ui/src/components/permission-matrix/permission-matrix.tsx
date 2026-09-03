"use client";

import {
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { Checkbox } from "@/components/checkbox";
import { cn } from "@/lib/utils";

import {
  cellState,
  countGranted,
  groupPermissions,
  groupState,
  type Grants,
  type Permission,
  type Role,
} from "./permission-model";

/**
 * Roles across, permissions down, a checkbox at every crossing.
 *
 * Every admin panel has one and every admin panel builds it, because the
 * hard part is not the checkboxes. It is that a role can inherit from
 * another, so a box can be ticked without anyone having ticked it; that an
 * Owner has everything and none of it can be unticked; that a section of
 * eight permissions wants one control for all of them; and that sixty
 * checkboxes are sixty tab stops unless something is done about it.
 *
 * Something is done about it. This is a grid in the WAI-ARIA sense — one tab
 * stop, arrow keys between cells, Home and End along a row — which is the
 * right call here and was the wrong one for the diff viewer: a diff is read,
 * a matrix is operated. Every checkbox is named by both coordinates, "Delete
 * projects for Editor", so a reader arriving by arrow key knows where they
 * are without re-reading the headers.
 *
 * A grant that arrived by inheritance is shown as a checked box that cannot
 * be unchecked here, with the role it came from said beside it and in the
 * box's description. A disabled control would be the obvious rendering, and
 * it would take the box out of the tab order and the arrow-key path, so a
 * keyboard user would step over the one cell whose state needs explaining.
 *
 * Changes are reported, never applied. A group toggle reports every
 * permission it touched in one call, so an application can save it as one
 * change rather than eight.
 */

export interface PermissionMatrixProps extends Omit<
  ComponentPropsWithRef<"table">,
  "onChange"
> {
  /** Names the matrix: "Permissions for Acme". */
  label: string;
  roles: Role[];
  permissions: Permission[];
  grants: Grants;
  /**
   * A change to make. Several ids arrive together when a group toggle was
   * used. Omit to render the matrix as a record.
   */
  onChange?: (roleId: string, permissionIds: string[], granted: boolean) => void;
}

type MatrixRow =
  | { kind: "group"; label: string; permissions: Permission[] }
  | { kind: "permission"; permission: Permission };

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export function PermissionMatrix({
  className,
  label,
  roles,
  permissions,
  grants,
  onChange,
  ...props
}: PermissionMatrixProps) {
  const uid = useId();

  const rows = useMemo<MatrixRow[]>(
    () =>
      groupPermissions(permissions).flatMap((group): MatrixRow[] => [
        ...(group.group !== undefined
          ? [{ kind: "group" as const, label: group.group, permissions: group.permissions }]
          : []),
        ...group.permissions.map((permission) => ({ kind: "permission" as const, permission })),
      ]),
    [permissions],
  );

  // One tab stop. The cell that last had focus is the one Tab returns to.
  const [active, setActive] = useState<[number, number]>([0, 0]);

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    let next: [number, number] | null = null;
    const arrow = ARROWS[event.key];
    if (arrow) {
      next = [row + arrow[0], col + arrow[1]];
    } else if (event.key === "Home") {
      next = event.ctrlKey ? [0, 0] : [row, 0];
    } else if (event.key === "End") {
      next = event.ctrlKey ? [rows.length - 1, roles.length - 1] : [row, roles.length - 1];
    }
    if (!next) return;

    const [nextRow, nextCol] = next;
    if (nextRow < 0 || nextRow >= rows.length || nextCol < 0 || nextCol >= roles.length) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const cell = event.currentTarget.querySelector<HTMLElement>(
      `[data-row="${String(nextRow)}"][data-col="${String(nextCol)}"]`,
    );
    cell?.focus();
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <table
        data-slot="permission-matrix"
        role="grid"
        aria-label={label}
        aria-readonly={onChange ? undefined : true}
        onKeyDown={onKeyDown}
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      >
        <thead>
          <tr role="row" className="border-b border-border">
            <th
              role="columnheader"
              scope="col"
              className="px-3 py-2 text-left text-xs font-medium"
            >
              Permission
            </th>
            {roles.map((role) => {
              const granted = countGranted(roles, grants, role, permissions);
              return (
                <th
                  key={role.id}
                  role="columnheader"
                  scope="col"
                  className="px-3 py-2 text-center text-xs font-medium"
                >
                  {role.label}
                  <span className="block font-normal text-muted-foreground">
                    {role.locked ? (
                      "all, locked"
                    ) : (
                      <>
                        {String(granted)}/{String(permissions.length)}
                        <span className="sr-only"> granted</span>
                      </>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) =>
            row.kind === "group" ? (
              <tr
                key={`group-${row.label}`}
                role="row"
                className="border-b border-border bg-muted/40"
              >
                <th
                  role="rowheader"
                  scope="row"
                  className="px-3 py-1.5 text-left text-xs font-medium"
                >
                  {row.label}
                  <span className="sr-only">, all</span>
                </th>
                {roles.map((role, colIndex) => (
                  <GroupCell
                    key={role.id}
                    role={role}
                    roles={roles}
                    grants={grants}
                    group={row.label}
                    permissions={row.permissions}
                    position={[rowIndex, colIndex]}
                    active={active[0] === rowIndex && active[1] === colIndex}
                    onActivate={setActive}
                    onChange={onChange}
                  />
                ))}
              </tr>
            ) : (
              <tr
                key={row.permission.id}
                role="row"
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <th
                  role="rowheader"
                  scope="row"
                  className={cn(
                    "px-3 py-2 text-left font-normal",
                    row.permission.group !== undefined && "pl-6",
                  )}
                >
                  {row.permission.label}
                  {row.permission.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {row.permission.description}
                    </span>
                  ) : null}
                </th>
                {roles.map((role, colIndex) => (
                  <PermissionCell
                    key={role.id}
                    id={`${uid}-${role.id}-${row.permission.id}`}
                    role={role}
                    roles={roles}
                    grants={grants}
                    permission={row.permission}
                    position={[rowIndex, colIndex]}
                    active={active[0] === rowIndex && active[1] === colIndex}
                    onActivate={setActive}
                    onChange={onChange}
                  />
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

interface CellProps {
  role: Role;
  roles: Role[];
  grants: Grants;
  position: [number, number];
  active: boolean;
  onActivate: (position: [number, number]) => void;
  onChange?: (roleId: string, permissionIds: string[], granted: boolean) => void;
}

function PermissionCell({
  id,
  role,
  roles,
  grants,
  permission,
  position,
  active,
  onActivate,
  onChange,
}: CellProps & { id: string; permission: Permission }) {
  const state = cellState(roles, grants, role, permission.id);
  const fixed = state.fixed || !onChange;
  const noteId = `${id}-note`;

  const note = role.locked
    ? `${role.label} has every permission; this cannot be changed.`
    : state.inheritedFrom
      ? `Inherited from ${state.inheritedFrom.label}.`
      : null;

  return (
    <td
      role="gridcell"
      data-slot="permission-cell"
      data-granted={state.granted || undefined}
      data-inherited={state.inheritedFrom ? "" : undefined}
      className="px-3 py-2 text-center align-middle"
    >
      <Checkbox
        id={id}
        checked={state.granted}
        aria-label={`${permission.label} for ${role.label}`}
        aria-describedby={note ? noteId : undefined}
        // Fixed cells stay focusable, so the arrow-key path and the tab order
        // do not step over the one cell whose state needs explaining.
        aria-disabled={fixed || undefined}
        tabIndex={active ? 0 : -1}
        data-row={position[0]}
        data-col={position[1]}
        className={cn(fixed && "opacity-55")}
        onFocus={() => {
          onActivate(position);
        }}
        onCheckedChange={(next) => {
          if (fixed) return;
          onChange?.(role.id, [permission.id], next === true);
        }}
      />
      {state.inheritedFrom ? (
        <span id={noteId} className="mt-0.5 block text-2xs text-muted-foreground">
          via {state.inheritedFrom.label}
        </span>
      ) : note ? (
        <span id={noteId} className="sr-only">
          {note}
        </span>
      ) : null}
    </td>
  );
}

function GroupCell({
  role,
  roles,
  grants,
  group,
  permissions,
  position,
  active,
  onActivate,
  onChange,
}: CellProps & { group: string; permissions: Permission[] }) {
  const ids = permissions.map((permission) => permission.id);
  const state = groupState(roles, grants, role, ids);
  // Only what can actually change here: inherited grants stay either way.
  const changeable = permissions
    .filter((permission) => !cellState(roles, grants, role, permission.id).fixed)
    .map((permission) => permission.id);
  const fixed = role.locked || !onChange || changeable.length === 0;

  return (
    <td
      role="gridcell"
      data-slot="permission-group-cell"
      className="px-3 py-1.5 text-center align-middle"
    >
      <Checkbox
        checked={state === "all" ? true : state === "some" ? "indeterminate" : false}
        aria-label={`All ${group} for ${role.label}`}
        aria-disabled={fixed || undefined}
        tabIndex={active ? 0 : -1}
        data-row={position[0]}
        data-col={position[1]}
        className={cn(fixed && "opacity-55")}
        onFocus={() => {
          onActivate(position);
        }}
        onCheckedChange={(next) => {
          if (fixed) return;
          onChange?.(role.id, changeable, next === true);
        }}
      />
    </td>
  );
}
