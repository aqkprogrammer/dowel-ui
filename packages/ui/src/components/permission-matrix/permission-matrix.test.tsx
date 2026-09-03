import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PermissionMatrix, type PermissionMatrixProps } from "./permission-matrix";
import {
  cellState,
  countGranted,
  groupPermissions,
  groupState,
  inheritedFrom,
  type Grants,
  type Permission,
  type Role,
} from "./permission-model";

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
  { id: "billing.read", label: "View billing", group: "Billing" },
  { id: "billing.write", label: "Change billing", group: "Billing" },
];

const GRANTS: Grants = {
  viewer: ["project.read"],
  editor: ["project.write"],
  admin: ["project.delete", "billing.read"],
};

function Example(props: Partial<PermissionMatrixProps> = {}) {
  return (
    <PermissionMatrix
      label="Permissions for Acme"
      roles={ROLES}
      permissions={PERMISSIONS}
      grants={GRANTS}
      onChange={vi.fn()}
      {...props}
    />
  );
}

const box = (name: string) => screen.getByRole("checkbox", { name });
const role = (id: string) => ROLES.find((r) => r.id === id) as Role;

describe("permission model", () => {
  it("resolves inheritance transitively", () => {
    expect(inheritedFrom(ROLES, GRANTS, role("admin"), "project.read")?.id).toBe("viewer");
    expect(inheritedFrom(ROLES, GRANTS, role("admin"), "project.write")?.id).toBe("editor");
    expect(inheritedFrom(ROLES, GRANTS, role("viewer"), "project.write")).toBeNull();
  });

  it("treats a locked ancestor as granting everything", () => {
    const roles: Role[] = [
      { id: "god", label: "God", locked: true },
      { id: "x", label: "X", inherits: ["god"] },
    ];
    expect(inheritedFrom(roles, {}, roles[1] as Role, "anything")?.id).toBe("god");
  });

  it("survives a cycle", () => {
    const roles: Role[] = [
      { id: "a", label: "A", inherits: ["b"] },
      { id: "b", label: "B", inherits: ["a"] },
    ];
    expect(inheritedFrom(roles, {}, roles[0] as Role, "x")).toBeNull();
    expect(inheritedFrom(roles, { b: ["x"] }, roles[0] as Role, "x")?.id).toBe("b");
  });

  it("ignores an inherits entry that names no role", () => {
    const roles: Role[] = [{ id: "a", label: "A", inherits: ["ghost"] }];
    expect(cellState(roles, {}, roles[0] as Role, "x")).toEqual({
      granted: false,
      inheritedFrom: null,
      fixed: false,
    });
  });

  it("describes a cell as explicit, inherited, locked or absent", () => {
    expect(cellState(ROLES, GRANTS, role("editor"), "project.write")).toMatchObject({
      granted: true,
      inheritedFrom: null,
      fixed: false,
    });
    expect(cellState(ROLES, GRANTS, role("editor"), "project.read")).toMatchObject({
      granted: true,
      fixed: true,
    });
    expect(cellState(ROLES, GRANTS, role("owner"), "billing.write")).toMatchObject({
      granted: true,
      fixed: true,
      inheritedFrom: null,
    });
    expect(cellState(ROLES, GRANTS, role("viewer"), "billing.write").granted).toBe(false);
  });

  it("states a group as all, some or none", () => {
    const projects = ["project.read", "project.write", "project.delete"];
    expect(groupState(ROLES, GRANTS, role("admin"), projects)).toBe("all");
    expect(groupState(ROLES, GRANTS, role("editor"), projects)).toBe("some");
    expect(groupState(ROLES, GRANTS, role("viewer"), ["billing.read", "billing.write"])).toBe(
      "none",
    );
  });

  it("counts what a role can do by any route", () => {
    expect(countGranted(ROLES, GRANTS, role("admin"), PERMISSIONS)).toBe(4);
    expect(countGranted(ROLES, GRANTS, role("owner"), PERMISSIONS)).toBe(5);
  });

  it("groups permissions in first-appearance order, ungrouped ones on their own", () => {
    const groups = groupPermissions([
      { id: "b1", label: "B1", group: "B" },
      { id: "u", label: "U" },
      { id: "a1", label: "A1", group: "A" },
      { id: "b2", label: "B2", group: "B" },
    ]);
    expect(groups.map((g) => [g.group, g.permissions.map((p) => p.id)])).toEqual([
      ["B", ["b1", "b2"]],
      [undefined, ["u"]],
      ["A", ["a1"]],
    ]);
  });
});

describe("PermissionMatrix", () => {
  it("is a named grid with roles across and permissions down", () => {
    render(<Example />);

    const grid = screen.getByRole("grid", { name: "Permissions for Acme" });
    expect(within(grid).getByRole("columnheader", { name: /^Owner/ })).toBeInTheDocument();
    expect(
      within(grid).getByRole("rowheader", { name: /Delete projects/ }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole("rowheader", { name: /Cannot be undone/ }),
    ).toBeInTheDocument();
  });

  it("names every checkbox by both coordinates", () => {
    render(<Example />);

    expect(box("Delete projects for Admin")).toBeChecked();
    expect(box("Delete projects for Editor")).not.toBeChecked();
    expect(box("View projects for Viewer")).toBeChecked();
  });

  it("counts each role's grants in the header, by any route", () => {
    render(<Example />);

    expect(screen.getByRole("columnheader", { name: /Admin/ })).toHaveTextContent("4/5");
    expect(screen.getByRole("columnheader", { name: /Editor/ })).toHaveTextContent("2/5");
    expect(screen.getByRole("columnheader", { name: /Owner/ })).toHaveTextContent(
      "all, locked",
    );
  });

  describe("changing a cell", () => {
    it("reports a grant", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(box("Change billing for Admin"));

      expect(onChange).toHaveBeenCalledWith("admin", ["billing.write"], true);
    });

    it("reports a revocation", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(box("Delete projects for Admin"));

      expect(onChange).toHaveBeenCalledWith("admin", ["project.delete"], false);
    });
  });

  describe("inherited grants", () => {
    it("show as checked, say where they came from, and cannot be changed here", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      const cell = box("View projects for Admin");
      expect(cell).toBeChecked();
      expect(cell).toHaveAttribute("aria-disabled", "true");
      expect(cell).toHaveAccessibleDescription("via Viewer");

      await user.click(cell);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("stay in the keyboard path rather than being disabled", () => {
      render(<Example />);
      expect(box("View projects for Admin")).not.toBeDisabled();
    });
  });

  describe("a locked role", () => {
    it("has everything, says so, and changes nothing", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      const cell = box("Change billing for Owner");
      expect(cell).toBeChecked();
      expect(cell).toHaveAccessibleDescription(/Owner has every permission/);

      await user.click(cell);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("group toggles", () => {
    it("is unchecked, mixed or checked by the group's state", () => {
      render(<Example />);

      expect(box("All Projects for Admin")).toBeChecked();
      expect(box("All Projects for Editor")).toHaveAttribute("aria-checked", "mixed");
      expect(box("All Billing for Viewer")).not.toBeChecked();
    });

    it("grants the whole group in one call", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(box("All Billing for Viewer"));

      expect(onChange).toHaveBeenCalledWith("viewer", ["billing.read", "billing.write"], true);
    });

    it("completes a mixed group, touching only what is not inherited", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      // Editor: read is inherited from Viewer, write is explicit, delete is absent.
      await user.click(box("All Projects for Editor"));

      expect(onChange).toHaveBeenCalledWith(
        "editor",
        ["project.write", "project.delete"],
        true,
      );
    });

    it("revokes a full group, leaving inherited grants alone", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(box("All Projects for Admin"));

      expect(onChange).toHaveBeenCalledWith("admin", ["project.delete"], false);
    });

    it("is fixed for a locked role and for a group that is entirely inherited", () => {
      render(
        <Example
          grants={{ viewer: ["billing.read", "billing.write"], editor: [], admin: [] }}
        />,
      );

      expect(box("All Billing for Owner")).toHaveAttribute("aria-disabled", "true");
      expect(box("All Billing for Editor")).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("keyboard", () => {
    it("has one tab stop", () => {
      render(<Example />);

      const stops = screen.getAllByRole("checkbox").filter((c) => c.tabIndex === 0);
      expect(stops).toHaveLength(1);
    });

    it("moves between cells with the arrow keys", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.tab();
      expect(box("All Projects for Owner")).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      expect(box("All Projects for Admin")).toHaveFocus();

      await user.keyboard("{ArrowDown}");
      expect(box("View projects for Admin")).toHaveFocus();

      await user.keyboard("{ArrowLeft}");
      expect(box("View projects for Owner")).toHaveFocus();

      await user.keyboard("{ArrowUp}");
      expect(box("All Projects for Owner")).toHaveFocus();
    });

    it("stops at the edges rather than wrapping", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.tab();
      await user.keyboard("{ArrowUp}{ArrowLeft}");
      expect(box("All Projects for Owner")).toHaveFocus();
    });

    it("jumps along a row with Home and End, and across the grid with Ctrl", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.tab();
      await user.keyboard("{End}");
      expect(box("All Projects for Viewer")).toHaveFocus();

      await user.keyboard("{Home}");
      expect(box("All Projects for Owner")).toHaveFocus();

      await user.keyboard("{Control>}{End}{/Control}");
      expect(box("Change billing for Viewer")).toHaveFocus();

      await user.keyboard("{Control>}{Home}{/Control}");
      expect(box("All Projects for Owner")).toHaveFocus();
    });

    it("returns Tab to the cell that last had focus", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Example />
          <button type="button">After</button>
        </>,
      );

      await user.tab();
      await user.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}");
      expect(box("View projects for Editor")).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

      await user.tab({ shift: true });
      expect(box("View projects for Editor")).toHaveFocus();
    });

    it("toggles with Space", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      box("Change billing for Viewer").focus();
      await user.keyboard(" ");

      expect(onChange).toHaveBeenCalledWith("viewer", ["billing.write"], true);
    });
  });

  it("renders as a read-only record without onChange", async () => {
    const user = userEvent.setup();
    render(<Example onChange={undefined} />);

    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "true");
    const cell = box("Change billing for Viewer");
    expect(cell).toHaveAttribute("aria-disabled", "true");
    await user.click(cell);
    expect(cell).not.toBeChecked();
  });

  it("renders permissions without a group as plain rows", () => {
    render(<Example permissions={[{ id: "x", label: "Do a thing" }]} grants={{}} />);

    expect(screen.queryByRole("checkbox", { name: /^All / })).not.toBeInTheDocument();
    expect(box("Do a thing for Viewer")).toBeInTheDocument();
  });

  it("lets a className override win a conflict", () => {
    render(<Example className="text-xs" />);
    const grid = screen.getByRole("grid");
    expect(grid).toHaveClass("text-xs");
    expect(grid).not.toHaveClass("text-sm");
  });

  it("forwards a ref and native attributes to the table", () => {
    const ref = createRef<HTMLTableElement>();
    render(<Example ref={ref} data-testid="matrix" />);
    expect(ref.current).toBe(screen.getByTestId("matrix"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations as a record", async () => {
    const { container } = render(<Example onChange={undefined} />);
    await expectNoA11yViolations(container);
  });
});
