import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ActionLedger,
  ActionLedgerEntry,
  ActionLedgerList,
  ActionLedgerSelectionSummary,
  ActionLedgerToolbar,
  type LedgerAction,
} from "./ai-action-ledger";

const ACTIONS: LedgerAction[] = [
  {
    id: "1",
    summary: "Deleted 3 contacts",
    reversibility: "revertible",
    status: "applied",
    target: "contacts",
  },
  {
    id: "2",
    summary: "Refunded $240 to Acme",
    reversibility: "compensable",
    status: "applied",
    target: "billing",
  },
  {
    id: "3",
    summary: "Emailed 12 customers",
    reversibility: "irreversible",
    status: "applied",
    target: "email",
  },
];

function Example({
  actions = ACTIONS,
  onRevert,
}: {
  actions?: LedgerAction[];
  onRevert?: (actions: LedgerAction[]) => void;
} = {}) {
  return (
    <ActionLedger actions={actions} onRevert={onRevert}>
      <ActionLedgerToolbar />
      <ActionLedgerSelectionSummary />
      <ActionLedgerList>
        {actions.map((action) => (
          <ActionLedgerEntry key={action.id} action={action} />
        ))}
      </ActionLedgerList>
    </ActionLedger>
  );
}

describe("ActionLedger", () => {
  it("lists every action with what it did", () => {
    render(<Example />);

    expect(screen.getByText("Deleted 3 contacts")).toBeInTheDocument();
    expect(screen.getByText("Refunded $240 to Acme")).toBeInTheDocument();
    expect(screen.getByText("Emailed 12 customers")).toBeInTheDocument();
  });

  describe("reversibility", () => {
    it("states it in words on every entry", () => {
      // Not a colour, not an icon: it decides whether undo means anything.
      render(<Example />);

      expect(screen.getByText("Can be undone")).toBeInTheDocument();
      expect(screen.getByText("Can be offset, not undone")).toBeInTheDocument();
      expect(screen.getByText("Cannot be undone")).toBeInTheDocument();
    });

    it("does not offer to undo an irreversible action", () => {
      render(<Example />);

      const irreversible = screen.getByLabelText("Emailed 12 customers");
      expect(irreversible).toBeDisabled();
    });

    it("allows selecting a compensable action, which is not the same as undoable", () => {
      render(<Example />);
      expect(screen.getByLabelText("Refunded $240 to Acme")).toBeEnabled();
    });
  });

  describe("selection", () => {
    it("selects and deselects an action", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const checkbox = screen.getByLabelText("Deleted 3 contacts");
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("counts only undoable actions in select-all", () => {
      render(<Example />);
      // Three actions, one irreversible.
      expect(screen.getByRole("button", { name: "Select all 2 undoable" })).toBeInTheDocument();
    });

    it("selects every undoable action, leaving the rest alone", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(screen.getByRole("button", { name: "Select all 2 undoable" }));

      expect(screen.getByLabelText("Deleted 3 contacts")).toBeChecked();
      expect(screen.getByLabelText("Refunded $240 to Acme")).toBeChecked();
      expect(screen.getByLabelText("Emailed 12 customers")).not.toBeChecked();
    });

    it("clears the selection once everything is selected", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(screen.getByRole("button", { name: "Select all 2 undoable" }));
      await user.click(screen.getByRole("button", { name: "Clear selection" }));

      expect(screen.getByLabelText("Deleted 3 contacts")).not.toBeChecked();
    });
  });

  describe("the revert control", () => {
    it("says what pressing it will do", async () => {
      const user = userEvent.setup();
      render(<Example />);

      expect(screen.getByRole("button", { name: "Undo selected" })).toBeDisabled();

      await user.click(screen.getByLabelText("Deleted 3 contacts"));
      expect(screen.getByRole("button", { name: "Undo 1 selected" })).toBeEnabled();
    });

    it("hands the chosen actions to the application rather than acting itself", async () => {
      const onRevert = vi.fn();
      const user = userEvent.setup();
      render(<Example onRevert={onRevert} />);

      await user.click(screen.getByLabelText("Deleted 3 contacts"));
      await user.click(screen.getByRole("button", { name: "Undo 1 selected" }));

      expect(onRevert).toHaveBeenCalledTimes(1);
      expect(onRevert.mock.calls[0]?.[0]).toEqual([ACTIONS[0]]);
    });

    it("does nothing when nothing is selected", async () => {
      const onRevert = vi.fn();
      const user = userEvent.setup();
      render(<Example onRevert={onRevert} />);

      await user.click(screen.getByRole("button", { name: "Undo selected" }));
      expect(onRevert).not.toHaveBeenCalled();
    });
  });

  describe("selection summary", () => {
    it("warns before the click when something can only be offset", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(screen.getByLabelText("Refunded $240 to Acme"));

      expect(
        screen.getByText(/1 selected, of which 1 can only be offset by a further action/),
      ).toBeInTheDocument();
    });

    it("does not warn when everything selected is truly revertible", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(screen.getByLabelText("Deleted 3 contacts"));

      expect(screen.getByText("1 selected")).toBeInTheDocument();
      expect(screen.queryByText(/can only be offset/)).not.toBeInTheDocument();
    });

    it("is announced politely as the selection changes", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example />);

      await user.click(screen.getByLabelText("Deleted 3 contacts"));

      const summary = container.querySelector("[data-slot='action-ledger-selection-summary']");
      expect(summary).toHaveAttribute("aria-live", "polite");
    });

    it("renders nothing at all when the selection is empty", () => {
      const { container } = render(<Example />);
      expect(
        container.querySelector("[data-slot='action-ledger-selection-summary']"),
      ).not.toBeInTheDocument();
    });
  });

  describe("resolved and failed actions", () => {
    it("does not offer to undo something already reverted", () => {
      render(
        <Example
          actions={[
            {
              id: "1",
              summary: "Deleted a row",
              reversibility: "revertible",
              status: "reverted",
            },
          ]}
        />,
      );

      expect(screen.getByLabelText("Deleted a row")).toBeDisabled();
      expect(screen.getByText("Reverted")).toBeInTheDocument();
    });

    it("shows why a revert failed rather than hiding it", () => {
      render(
        <Example
          actions={[
            {
              id: "1",
              summary: "Deleted a row",
              reversibility: "revertible",
              status: "failed",
              error: "Row was modified after deletion",
            },
          ]}
        />,
      );

      expect(screen.getByText("Revert failed")).toBeInTheDocument();
      expect(screen.getByText("Row was modified after deletion")).toBeInTheDocument();
    });

    it("marks a partially reverted set honestly, action by action", () => {
      const { container } = render(
        <Example
          actions={[
            { id: "1", summary: "A", reversibility: "revertible", status: "reverted" },
            {
              id: "2",
              summary: "B",
              reversibility: "revertible",
              status: "failed",
              error: "x",
            },
            { id: "3", summary: "C", reversibility: "revertible", status: "applied" },
          ]}
        />,
      );

      const statuses = [...container.querySelectorAll("[data-slot='action-ledger-entry']")].map(
        (entry) => entry.getAttribute("data-status"),
      );
      expect(statuses).toEqual(["reverted", "failed", "applied"]);
    });

    it("offers no selection at all when nothing can be undone", () => {
      render(
        <Example
          actions={[
            { id: "1", summary: "Sent mail", reversibility: "irreversible", status: "applied" },
          ]}
        />,
      );

      expect(screen.getByRole("button", { name: "Select all 0 undoable" })).toBeDisabled();
    });
  });

  it("throws a useful error when a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<ActionLedgerToolbar />)).toThrow(
      /must be rendered inside <ActionLedger>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
