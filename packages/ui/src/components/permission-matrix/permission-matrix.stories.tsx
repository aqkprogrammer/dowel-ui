import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { PermissionMatrix } from "./permission-matrix";
import type { Grants, Permission, Role } from "./permission-model";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-3xl">
    <Story />
  </div>
);

const ROLES: Role[] = [
  { id: "owner", label: "Owner", locked: true },
  { id: "admin", label: "Admin", inherits: ["editor"] },
  { id: "editor", label: "Editor", inherits: ["viewer"] },
  { id: "viewer", label: "Viewer" },
];

const PERMISSIONS: Permission[] = [
  { id: "project.read", label: "View projects", group: "Projects" },
  { id: "project.write", label: "Edit projects", group: "Projects" },
  {
    id: "project.delete",
    label: "Delete projects",
    group: "Projects",
    description: "Cannot be undone.",
  },
  { id: "member.invite", label: "Invite members", group: "Members" },
  { id: "member.remove", label: "Remove members", group: "Members" },
  { id: "billing.read", label: "View billing", group: "Billing" },
  { id: "billing.write", label: "Change billing", group: "Billing" },
];

const GRANTS: Grants = {
  viewer: ["project.read"],
  editor: ["project.write", "member.invite"],
  admin: ["project.delete", "member.remove", "billing.read"],
};

const meta = {
  title: "Data/Permission Matrix",
  component: PermissionMatrix,
  decorators: [withWidth],
  args: {
    label: "Permissions for Acme",
    roles: ROLES,
    permissions: PERMISSIONS,
    grants: GRANTS,
    onChange: () => undefined,
  },
} satisfies Meta<typeof PermissionMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Tab in once, then arrow keys. A ticked box that says "via Viewer" arrived by
 * inheritance and cannot be unticked here; the Owner column is locked. A
 * group row's box is mixed when the group is partly granted.
 */
export const Default: Story = {};

/** Wired to state. A group toggle arrives as one change with every id it touched. */
export const Editing: Story = {
  parameters: { controls: { disable: true } },
  render: function Editing() {
    const [grants, setGrants] = useState<Grants>(GRANTS);
    const [last, setLast] = useState<string | null>(null);

    return (
      <div className="flex flex-col gap-3">
        <PermissionMatrix
          label="Permissions for Acme"
          roles={ROLES}
          permissions={PERMISSIONS}
          grants={grants}
          onChange={(roleId, ids, granted) => {
            setGrants((current) => {
              const existing = current[roleId] ?? [];
              return {
                ...current,
                [roleId]: granted
                  ? [...new Set([...existing, ...ids])]
                  : existing.filter((id) => !ids.includes(id)),
              };
            });
            setLast(`${roleId}: ${granted ? "grant" : "revoke"} ${ids.join(", ")}`);
          }}
        />
        <p className="font-mono text-2xs text-muted-foreground">
          {last ?? "Change something to see what the application receives."}
        </p>
      </div>
    );
  },
};

/** The same grants, as a record nobody can change from here. */
export const AsRecord: Story = {
  args: { onChange: undefined },
};

/** No inheritance and no groups: the plain version. */
export const Flat: Story = {
  args: {
    roles: [
      { id: "support", label: "Support" },
      { id: "sales", label: "Sales" },
    ],
    permissions: [
      { id: "tickets", label: "Answer tickets" },
      { id: "refunds", label: "Issue refunds" },
      { id: "quotes", label: "Send quotes" },
    ],
    grants: { support: ["tickets", "refunds"], sales: ["quotes"] },
  },
};
