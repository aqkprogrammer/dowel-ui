import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RecordDiff, RecordDiffSummary, diffRecords, type RecordField } from "./record-diff";

/** First field, with the index check strict mode requires. */
function first(fields: RecordField[]): RecordField {
  const field = fields[0];
  if (!field) throw new Error("expected diffRecords to return at least one field");
  return field;
}

const BEFORE = { name: "Acme", seats: 5, role: "viewer", active: true };
const AFTER = { name: "Acme", seats: 12, role: "admin", active: true };

function rowFor(label: string): HTMLElement {
  return screen
    .getByRole("rowheader", { name: new RegExp(`^${label}`) })
    .closest("tr") as HTMLElement;
}

describe("diffRecords", () => {
  it("classifies each field", () => {
    const fields = diffRecords({ a: 1, b: 2, c: 3 }, { a: 1, b: 99, d: 4 });
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.change]));

    expect(byKey).toEqual({ a: "unchanged", b: "changed", c: "removed", d: "added" });
  });

  it("reports removed keys, which requires the union of both sides", () => {
    // Iterating only `after` is how removals vanish from an audit log.
    const fields = diffRecords({ gone: "x" }, {});
    expect(fields.map((f) => f.key)).toEqual(["gone"]);
    expect(first(fields).change).toBe("removed");
  });

  it("compares objects structurally, not by reference", () => {
    const fields = diffRecords({ meta: { a: 1 } }, { meta: { a: 1 } });
    expect(first(fields).change).toBe("unchanged");
  });

  it("ignores key order inside nested objects", () => {
    // Serialising without sorting reports a false change on re-serialised JSON.
    const fields = diffRecords({ meta: { a: 1, b: 2 } }, { meta: { b: 2, a: 1 } });
    expect(first(fields).change).toBe("unchanged");
  });

  it("treats empty string, null and undefined as equivalently absent", () => {
    expect(first(diffRecords({ a: "" }, { a: null })).change).toBe("unchanged");
    expect(first(diffRecords({ a: null }, { a: "x" })).change).toBe("added");
  });

  it("does not confuse false with absent", () => {
    // false is a real value; treating it as empty would report a boolean flip
    // as a removal.
    expect(first(diffRecords({ a: true }, { a: false })).change).toBe("changed");
    expect(first(diffRecords({ a: false }, { a: true })).change).toBe("changed");
  });

  it("does not confuse zero with absent", () => {
    expect(first(diffRecords({ a: 5 }, { a: 0 })).change).toBe("changed");
  });

  it("humanises keys from camelCase and snake_case alike", () => {
    const fields = diffRecords({ billingEmail: "a", api_version: "1" }, {});
    expect(fields.map((f) => f.label)).toEqual(["Billing email", "Api version"]);
  });

  it("prefers an explicit label", () => {
    const fields = diffRecords({ mrr: 1 }, { mrr: 2 }, { labels: { mrr: "MRR" } });
    expect(first(fields).label).toBe("MRR");
  });

  it("restricts and orders by the fields option", () => {
    const fields = diffRecords(
      { a: 1, b: 2, c: 3 },
      { a: 9, b: 8, c: 7 },
      { fields: ["c", "a"] },
    );
    expect(fields.map((f) => f.key)).toEqual(["c", "a"]);
  });

  it("marks secret-shaped keys redacted by default", () => {
    const fields = diffRecords(
      { apiKey: "sk-old", password: "p", api_key: "x", normal: "v" },
      { apiKey: "sk-new", password: "q", api_key: "y", normal: "w" },
    );
    const redacted = fields.filter((f) => f.redacted).map((f) => f.key);
    expect(redacted).toEqual(["apiKey", "password", "api_key"]);
  });
});

describe("RecordDiff", () => {
  it("summarises how many fields changed", () => {
    render(<RecordDiff before={BEFORE} after={AFTER} />);
    expect(screen.getByText("2 of 4 fields changed")).toBeInTheDocument();
  });

  it("says so plainly when nothing changed", () => {
    render(<RecordDiff before={BEFORE} after={BEFORE} />);
    expect(screen.getByText("No fields changed")).toBeInTheDocument();
  });

  it("shows before and after for a changed field", () => {
    render(<RecordDiff before={BEFORE} after={AFTER} />);
    const row = rowFor("Role");

    expect(within(row).getByText("viewer")).toBeInTheDocument();
    expect(within(row).getByText("admin")).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("names each value with its field via a row header", () => {
      render(<RecordDiff before={BEFORE} after={AFTER} />);
      expect(screen.getByRole("rowheader", { name: /^Seats/ })).toBeInTheDocument();
    });

    it("states the kind of change in text, not only by colour", () => {
      // WCAG 1.4.1 — a coloured row is not information.
      render(<RecordDiff before={{ a: 1 }} after={{ b: 2 }} />);

      expect(screen.getByRole("rowheader", { name: /removed/ })).toBeInTheDocument();
      expect(screen.getByRole("rowheader", { name: /added/ })).toBeInTheDocument();
    });

    it("has no violations", async () => {
      const { container } = render(<RecordDiff before={BEFORE} after={AFTER} />);
      await expectNoA11yViolations(container);
    });
  });

  describe("unchanged fields", () => {
    it("hides them by default", () => {
      render(<RecordDiff before={BEFORE} after={AFTER} />);
      expect(screen.queryByRole("rowheader", { name: /^Name/ })).not.toBeInTheDocument();
    });

    it("reveals them from a real button with aria-expanded", async () => {
      const user = userEvent.setup();
      render(<RecordDiff before={BEFORE} after={AFTER} />);

      const toggle = screen.getByRole("button", { name: "Show 2 unchanged" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await user.click(toggle);

      expect(screen.getByRole("rowheader", { name: /^Name/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hide 2 unchanged" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("offers no toggle when everything changed", () => {
      render(<RecordDiff before={{ a: 1 }} after={{ a: 2 }} />);
      expect(screen.queryByRole("button", { name: /unchanged/ })).not.toBeInTheDocument();
    });

    it("shows them from the start when collapsing is off", () => {
      render(<RecordDiff before={BEFORE} after={AFTER} collapseUnchanged={false} />);
      expect(screen.getByRole("rowheader", { name: /^Name/ })).toBeInTheDocument();
    });
  });

  describe("redaction", () => {
    it("never renders a secret value", () => {
      const { container } = render(
        <RecordDiff before={{ apiKey: "sk-live-OLD" }} after={{ apiKey: "sk-live-NEW" }} />,
      );

      expect(container.textContent).not.toContain("sk-live-OLD");
      expect(container.textContent).not.toContain("sk-live-NEW");
      expect(screen.getAllByText("redacted")).toHaveLength(2);
    });

    it("does not pass a redacted value to the formatter", () => {
      // The formatter is consumer code and might log. A secret must not reach
      // it at all, rather than being formatted and then hidden.
      const formatValue = vi.fn(() => "formatted");
      render(
        <RecordDiff
          before={{ token: "secret" }}
          after={{ token: "other" }}
          formatValue={formatValue}
        />,
      );

      expect(formatValue).not.toHaveBeenCalled();
    });

    it("accepts a custom pattern", () => {
      const { container } = render(
        <RecordDiff before={{ ssn: "111" }} after={{ ssn: "222" }} redact={/ssn/} />,
      );
      expect(container.textContent).not.toContain("111");
    });
  });

  describe("value formatting", () => {
    it("renders booleans as words rather than as true and false", () => {
      render(<RecordDiff before={{ active: true }} after={{ active: false }} />);
      const row = rowFor("Active");
      expect(within(row).getByText("no")).toBeInTheDocument();
    });

    it("renders an empty array as none, not as nothing", () => {
      render(
        <RecordDiff before={{ tags: ["a"] }} after={{ tags: [] }} collapseUnchanged={false} />,
      );
      const row = rowFor("Tags");
      expect(within(row).getByText("none")).toBeInTheDocument();
    });

    it("uses a custom formatter with the key available", () => {
      render(
        <RecordDiff
          before={{ price: 1000 }}
          after={{ price: 2000 }}
          formatValue={(value, key) => `${key}:${String(value)}`}
        />,
      );
      expect(screen.getByText("price:2000")).toBeInTheDocument();
    });
  });

  it("accepts composed children in place of the default layout", () => {
    render(
      <RecordDiff before={BEFORE} after={AFTER}>
        <RecordDiffSummary />
      </RecordDiff>,
    );

    expect(screen.getByText("2 of 4 fields changed")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("throws a useful error when a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<RecordDiffSummary />)).toThrow(/must be rendered inside <RecordDiff>/);
    consoleError.mockRestore();
  });
});
