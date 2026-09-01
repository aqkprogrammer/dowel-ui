import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

function Example() {
  return (
    <Table>
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">INV-001</TableHead>
          <TableCell>Paid</TableCell>
          <TableCell>$250.00</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableHead scope="row">INV-002</TableHead>
          <TableCell>Pending</TableCell>
          <TableCell>$150.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell>$400.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe("Table", () => {
  it("renders a real table, not a grid of divs", () => {
    render(<Example />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("is named by its caption", () => {
    render(<Example />);
    expect(screen.getByRole("table", { name: "Recent invoices" })).toBeInTheDocument();
  });

  it("exposes column headers", () => {
    render(<Example />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Invoice",
      "Status",
      "Amount",
    ]);
  });

  it("exposes row headers when scope is set", () => {
    render(<Example />);
    expect(screen.getAllByRole("rowheader")).toHaveLength(2);
  });

  it("groups rows into header, body and footer", () => {
    render(<Example />);
    expect(screen.getAllByRole("rowgroup")).toHaveLength(3);
  });

  it("marks a selected row for styling", () => {
    render(<Example />);
    const rows = screen.getAllByRole("row");
    const selected = rows.find((row) => row.getAttribute("data-state") === "selected");
    expect(selected).toBeDefined();
    expect(within(selected as HTMLElement).getByText("Pending")).toBeInTheDocument();
  });

  describe("the scrolling wrapper", () => {
    it("is focusable, so an overflowing table can be scrolled by keyboard", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example />);

      const wrapper = container.querySelector("[data-slot='table-container']");
      expect(wrapper).toHaveAttribute("tabindex", "0");

      await user.tab();
      expect(wrapper).toHaveFocus();
    });

    it("is a named region, so it is not an unlabelled focus stop", () => {
      render(<Example />);
      expect(screen.getByRole("region", { name: "Table" })).toBeInTheDocument();
    });

    it("takes its name from the table's aria-label", () => {
      render(
        <Table aria-label="Invoices">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByRole("region", { name: "Invoices" })).toBeInTheDocument();
    });

    it("accepts props of its own", () => {
      const { container } = render(
        <Table containerProps={{ className: "max-h-64", "data-testid": "wrapper" }}>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(container.querySelector("[data-testid='wrapper']")).toHaveClass("max-h-64");
    });
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <Table className="text-base" aria-label="T">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveClass("text-base");
    expect(table).not.toHaveClass("text-sm");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
