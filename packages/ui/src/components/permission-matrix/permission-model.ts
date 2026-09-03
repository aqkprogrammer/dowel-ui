/**
 * Roles, permissions and who has what — resolved, so the grid only draws.
 *
 * Pure, so inheritance and the group states are tested without rendering
 * anything, and so a server can answer "may this role do this" from the same
 * grants the matrix edits, with the same rule for inheritance.
 */

export interface Permission {
  id: string;
  label: string;
  description?: string;
  /** Permissions with the same group share a heading and an all-or-none toggle. */
  group?: string;
}

export interface Role {
  id: string;
  label: string;
  /** Roles whose grants this one includes. Resolved transitively. */
  inherits?: string[];
  /** Has every permission, and none of them can be changed. An Owner. */
  locked?: boolean;
}

/** Explicit grants, by role id. Inherited ones are not listed here. */
export type Grants = Record<string, string[]>;

export interface CellState {
  /** Whether the role can do it, by any route. */
  granted: boolean;
  /** The role it comes from, when it is not explicit here. */
  inheritedFrom: Role | null;
  /** Cannot be changed here — locked role, or inherited. */
  fixed: boolean;
}

export type GroupState = "all" | "some" | "none";

function roleById(roles: Role[], id: string): Role | undefined {
  return roles.find((role) => role.id === id);
}

/**
 * The role a permission is inherited from, or null. Depth-first through
 * `inherits`, cycle-safe, so two roles that inherit each other resolve rather
 * than recurse forever — a configuration a form can produce by accident.
 */
export function inheritedFrom(
  roles: Role[],
  grants: Grants,
  role: Role,
  permissionId: string,
  seen: Set<string> = new Set(),
): Role | null {
  seen.add(role.id);
  for (const parentId of role.inherits ?? []) {
    if (seen.has(parentId)) continue;
    const parent = roleById(roles, parentId);
    if (!parent) continue;
    if (parent.locked || (grants[parent.id] ?? []).includes(permissionId)) return parent;
    const further = inheritedFrom(roles, grants, parent, permissionId, seen);
    if (further) return further;
  }
  return null;
}

export function cellState(
  roles: Role[],
  grants: Grants,
  role: Role,
  permissionId: string,
): CellState {
  if (role.locked) return { granted: true, inheritedFrom: null, fixed: true };
  const explicit = (grants[role.id] ?? []).includes(permissionId);
  if (explicit) return { granted: true, inheritedFrom: null, fixed: false };
  const from = inheritedFrom(roles, grants, role, permissionId);
  return { granted: from !== null, inheritedFrom: from, fixed: from !== null };
}

export function groupState(
  roles: Role[],
  grants: Grants,
  role: Role,
  permissionIds: string[],
): GroupState {
  const granted = permissionIds.filter(
    (id) => cellState(roles, grants, role, id).granted,
  ).length;
  if (granted === 0) return "none";
  return granted === permissionIds.length ? "all" : "some";
}

export function countGranted(
  roles: Role[],
  grants: Grants,
  role: Role,
  permissions: Permission[],
): number {
  return permissions.filter(
    (permission) => cellState(roles, grants, role, permission.id).granted,
  ).length;
}

export interface PermissionGroup {
  /** Undefined for permissions declared without one. */
  group: string | undefined;
  permissions: Permission[];
}

/** Permissions by group, in the order the groups first appear. */
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  for (const permission of permissions) {
    const existing = groups.find((candidate) => candidate.group === permission.group);
    if (existing) existing.permissions.push(permission);
    else groups.push({ group: permission.group, permissions: [permission] });
  }
  return groups;
}
