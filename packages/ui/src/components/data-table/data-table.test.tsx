import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableViewOptions,
} from "./data-table";

/**
 * Driven by a real table instance rather than a stub, because the point of
 * these components is that they present whatever the table library produces.
 */

interface Person {
  name: string;
  role: string;
  age: number;
}

const PEOPLE: Person[] = [
  { name: "Ada Lovelace", role: "Engineering", age: 36 },
  { name: "Grace Hopper", role: "Engineering", age: 45 },
  { name: "Katherine Johnson", role: "Research", age: 52 },
  { name: "Radia Perlman", role: "Networking", age: 41 },
];

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

function useDemoTable(data: Person[] = PEOPLE, pageSize = 10) {
  return useTable({
    features,
    data,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    columns: [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      },
      { accessorKey: "role", header: "Role", enableSorting: false },
      {
        accessorKey: "age",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
      },
    ],
  });
}

function Example({ data, pageSize }: { data?: Person[]; pageSize?: number } = {}) {
  const table = useDemoTable(data, pageSize);
  return (
    <div>
      <DataTableViewOptions table={table} />
      <DataTable table={table} aria-label="People" />
      <DataTablePagination table={table} />
    </div>
  );
}

function rowTexts(): string[][] {
  const body = screen.getAllByRole("rowgroup")[1];
  if (!body) return [];
  return within(body)
    .getAllByRole("row")
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent ?? ""),
    );
}

describe("DataTable", () => {
  it("renders a row per record and a cell per column", () => {
    render(<Example />);
    const rows = rowTexts();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual(["Ada Lovelace", "Engineering", "36"]);
  });

  it("renders the header for each column", () => {
    render(<Example />);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
  });

  it("marks sortable columns with aria-sort", () => {
    render(<Example />);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("does not claim a non-sortable column is sortable", () => {
    render(<Example />);
    expect(screen.getByRole("columnheader", { name: "Role" })).not.toHaveAttribute("aria-sort");
  });

  it("shows an empty message when there are no rows", () => {
    render(<Example data={[]} />);
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("accepts a custom empty state", () => {
    function CustomEmpty() {
      const table = useDemoTable([]);
      return <DataTable table={table} empty={<span>Nothing to show yet.</span>} />;
    }

    render(<CustomEmpty />);
    expect(screen.getByText("Nothing to show yet.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});

describe("DataTableColumnHeader", () => {
  it("renders a sortable column as a button", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: /Name, not sorted/ })).toBeInTheDocument();
  });

  it("renders a non-sortable column as text, not a dead button", () => {
    render(<Example />);
    expect(screen.queryByRole("button", { name: /Role/ })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
  });

  it("sorts ascending, and says so in text as well as in aria-sort", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /Name, not sorted/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sort ascending" }));

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
    });
    expect(screen.getByRole("button", { name: /Name, sorted ascending/ })).toBeInTheDocument();
    expect(rowTexts()[0]?.[0]).toBe("Ada Lovelace");
  });

  it("sorts descending", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /Name, not sorted/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sort descending" }));

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
        "aria-sort",
        "descending",
      );
    });
    expect(rowTexts()[0]?.[0]).toBe("Radia Perlman");
  });

  it("actually reorders the rows when sorting a numeric column", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /Age, not sorted/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sort descending" }));

    await waitFor(() => {
      expect(rowTexts()[0]?.[2]).toBe("52");
    });
  });
});

describe("DataTableViewOptions", () => {
  it("lists the hideable columns", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Columns" }));
    for (const id of ["name", "role", "age"]) {
      expect(await screen.findByRole("menuitemcheckbox", { name: id })).toBeInTheDocument();
    }
  });

  it("hides a column when toggled off", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "role" }));

    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: "Role" })).not.toBeInTheDocument();
    });
    expect(rowTexts()[0]).toEqual(["Ada Lovelace", "36"]);
  });
});

describe("DataTablePagination", () => {
  it("reports the page position in a live region", () => {
    render(<Example pageSize={2} />);

    const status = screen.getByText(/Page 1 of 2/);
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("moves between pages", async () => {
    const user = userEvent.setup();
    render(<Example pageSize={2} />);

    expect(rowTexts()).toHaveLength(2);
    expect(rowTexts()[0]?.[0]).toBe("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    await waitFor(() => {
      expect(rowTexts()[0]?.[0]).toBe("Katherine Johnson");
    });
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go to previous page" }));
    await waitFor(() => {
      expect(rowTexts()[0]?.[0]).toBe("Ada Lovelace");
    });
  });

  it("disables the controls at the ends", async () => {
    const user = userEvent.setup();
    render(<Example pageSize={2} />);

    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled();
    });
  });

  it("changes the page size", async () => {
    const user = userEvent.setup();
    render(<Example pageSize={2} />);

    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(await screen.findByRole("option", { name: "10" }));

    await waitFor(() => {
      expect(rowTexts()).toHaveLength(4);
    });
  });

  it("accepts a status slot in place of the page position", () => {
    function WithStatus() {
      const table = useDemoTable();
      return <DataTablePagination table={table} status="2 of 4 rows selected" />;
    }

    render(<WithStatus />);
    expect(screen.getByText("2 of 4 rows selected")).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example pageSize={2} />);
    await expectNoA11yViolations(container);
  });
});
