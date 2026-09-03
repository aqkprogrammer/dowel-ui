import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExtractionReview, type ExtractionReviewProps } from "./ai-extraction-review";
import {
  clampSpan,
  evidenceOf,
  segmentSource,
  summarizeReview,
  type ExtractionField,
  type FieldDecision,
} from "./extraction-model";

const SOURCE = [
  "INVOICE 4471",
  "Issued 1 March 2026 by Northwind Traders",
  "Total due: $1,240.00",
  "Pay within 30 days.",
].join("\n");

const at = (text: string) => {
  const start = SOURCE.indexOf(text);
  if (start < 0) throw new Error(`"${text}" is not in the source`);
  return { start, end: start + text.length };
};

const FIELDS: ExtractionField[] = [
  { name: "number", label: "Invoice number", value: "4471", span: at("4471") },
  { name: "issued", label: "Issued", value: "2026-03-01", span: at("1 March 2026") },
  { name: "total", label: "Total", value: "1240.00", span: at("$1,240.00"), confidence: 0.98 },
  { name: "currency", label: "Currency", value: "USD" },
];

function Example(props: Partial<ExtractionReviewProps> = {}) {
  return (
    <ExtractionReview
      source={SOURCE}
      heading="Invoice 4471"
      fields={FIELDS}
      onDecision={vi.fn()}
      {...props}
    />
  );
}

/** A controlled harness, so decisions round-trip the way they do in an app. */
function Controlled(props: Partial<ExtractionReviewProps> = {}) {
  const [decisions, setDecisions] = useState<Record<string, FieldDecision>>({});
  return (
    <ExtractionReview
      source={SOURCE}
      heading="Invoice 4471"
      fields={FIELDS}
      decisions={decisions}
      onDecision={(name, decision) => {
        setDecisions({ ...decisions, [name]: decision });
        props.onDecision?.(name, decision);
      }}
      {...props}
    />
  );
}

const field = (label: string) => screen.getByLabelText(label);
const item = (label: string) =>
  field(label).closest("[data-slot='extraction-field']") as HTMLElement;

describe("extraction model", () => {
  describe("clampSpan", () => {
    it("brings a span past the end back within the source", () => {
      expect(clampSpan({ start: 5, end: 50 }, 10)).toEqual({ start: 5, end: 10 });
    });

    it("treats an inverted span as no evidence", () => {
      expect(clampSpan({ start: 8, end: 3 }, 10)).toBeNull();
    });

    it("treats an empty span as no evidence", () => {
      expect(clampSpan({ start: 4, end: 4 }, 10)).toBeNull();
    });

    it("treats a span entirely past the end as no evidence", () => {
      expect(clampSpan({ start: 20, end: 30 }, 10)).toBeNull();
    });
  });

  describe("evidenceOf", () => {
    it("returns the text the span points at", () => {
      expect(evidenceOf(SOURCE, at("$1,240.00"))).toBe("$1,240.00");
    });

    it("returns nothing for a missing or invalid span", () => {
      expect(evidenceOf(SOURCE, undefined)).toBe("");
      expect(evidenceOf(SOURCE, { start: 9, end: 2 })).toBe("");
    });
  });

  describe("segmentSource", () => {
    it("returns the whole source as one uncited run when nothing is cited", () => {
      expect(segmentSource("abc", [{ name: "x", label: "X", value: "1" }])).toEqual([
        { text: "abc", fields: [] },
      ]);
    });

    it("returns no runs for an empty source", () => {
      expect(segmentSource("", FIELDS)).toEqual([]);
    });

    it("cuts at every span boundary and names the fields covering each run", () => {
      const runs = segmentSource("ab cd ef", [
        { name: "a", label: "A", value: "ab", span: { start: 0, end: 2 } },
        { name: "b", label: "B", value: "ef", span: { start: 6, end: 8 } },
      ]);

      expect(runs).toEqual([
        { text: "ab", fields: ["a"] },
        { text: " cd ", fields: [] },
        { text: "ef", fields: ["b"] },
      ]);
    });

    it("renders overlapping evidence as nested coverage rather than a fight", () => {
      // A total that sits inside the line that contains it.
      const runs = segmentSource("Total due: $12", [
        { name: "line", label: "Line", value: "Total due: $12", span: { start: 0, end: 14 } },
        { name: "total", label: "Total", value: "12", span: { start: 12, end: 14 } },
      ]);

      expect(runs).toEqual([
        { text: "Total due: $", fields: ["line"] },
        { text: "12", fields: ["line", "total"] },
      ]);
    });

    it("reassembles to the source exactly", () => {
      const text = segmentSource(SOURCE, FIELDS)
        .map((run) => run.text)
        .join("");
      expect(text).toBe(SOURCE);
    });

    it("ignores a span it cannot place instead of throwing", () => {
      const runs = segmentSource("abc", [
        { name: "x", label: "X", value: "1", span: { start: 9, end: 2 } },
      ]);
      expect(runs).toEqual([{ text: "abc", fields: [] }]);
    });
  });

  describe("summarizeReview", () => {
    it("counts decisions by kind", () => {
      const summary = summarizeReview(SOURCE, FIELDS, {
        number: { kind: "accepted", value: "4471" },
        issued: { kind: "corrected", value: "2026-03-02", proposed: "2026-03-01" },
        total: { kind: "rejected" },
      });

      expect(summary).toMatchObject({
        total: 4,
        reviewed: 3,
        accepted: 1,
        corrected: 1,
        rejected: 1,
        remaining: ["currency"],
        complete: false,
      });
    });

    it("is complete only once every field has a decision", () => {
      const all: Record<string, FieldDecision> = Object.fromEntries(
        FIELDS.map((f) => [f.name, { kind: "accepted", value: f.value ?? "" }]),
      );
      expect(summarizeReview(SOURCE, FIELDS, all).complete).toBe(true);
    });

    it("is never complete with no fields", () => {
      expect(summarizeReview(SOURCE, [], {}).complete).toBe(false);
    });

    it("names the fields whose value has no evidence, including a span it cannot place", () => {
      const summary = summarizeReview(SOURCE, [
        ...FIELDS,
        { name: "bad", label: "Bad", value: "x", span: { start: 500, end: 600 } },
      ]);
      expect(summary.unsourced).toEqual(["currency", "bad"]);
    });

    it("does not call a field without a value unsourced", () => {
      const summary = summarizeReview(SOURCE, [{ name: "vat", label: "VAT" }]);
      expect(summary.unsourced).toEqual([]);
    });
  });
});

describe("ExtractionReview", () => {
  it("names the review and the source", () => {
    render(<Example sourceLabel="Invoice 4471.pdf, page 1" />);

    expect(screen.getByRole("region", { name: "Invoice 4471" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Invoice 4471.pdf, page 1" }),
    ).toBeInTheDocument();
  });

  it("renders each field as a labelled control holding the model's value", () => {
    render(<Example />);

    expect(field("Invoice number")).toHaveValue("4471");
    expect(field("Issued")).toHaveValue("2026-03-01");
    expect(field("Total")).toHaveValue("1240.00");
  });

  it("quotes each field's evidence in text, so the source is not the only way to see it", () => {
    render(<Example />);

    expect(field("Issued")).toHaveAccessibleDescription(/In the source: “1 March 2026”/);
    expect(field("Total")).toHaveAccessibleDescription(/“\$1,240.00”/);
  });

  it("says outright when the model supplied a value without evidence", () => {
    // The case the review exists to catch, and the one a filled-object view
    // renders identically to a good value.
    render(<Example />);

    expect(field("Currency")).toHaveAccessibleDescription(/supplied this without evidence/);
    expect(item("Currency")).toHaveAttribute("data-unsourced");
    expect(screen.getByText(/1 without evidence/)).toBeInTheDocument();
  });

  it("says when the model found nothing, and lets the reviewer supply it", async () => {
    const onDecision = vi.fn();
    const user = userEvent.setup();
    render(<Example fields={[{ name: "vat", label: "VAT number" }]} onDecision={onDecision} />);

    expect(field("VAT number")).toHaveValue("");
    expect(field("VAT number")).toHaveAccessibleDescription(/found nothing/);

    await user.type(field("VAT number"), "GB123");
    await user.click(screen.getByRole("button", { name: /Accept correction/ }));

    expect(onDecision).toHaveBeenCalledWith("vat", {
      kind: "corrected",
      value: "GB123",
      proposed: "",
    });
  });

  it("highlights every piece of evidence in the source as a mark", () => {
    render(<Example />);

    const marks = screen.getByRole("region", { name: "Source" }).querySelectorAll("mark");
    expect([...marks].map((mark) => mark.textContent)).toEqual([
      "4471",
      "1 March 2026",
      "$1,240.00",
    ]);
  });

  it("splices nothing into the source text", () => {
    render(<Example />);
    expect(screen.getByRole("region", { name: "Source" })).toHaveTextContent(
      SOURCE.replace(/\s+/g, " "),
    );
  });

  it("shows a confidence as a number, and calls a low one low in words", () => {
    render(
      <Example
        fields={[
          { ...FIELDS[2], confidence: 0.98 } as ExtractionField,
          { name: "vendor", label: "Vendor", value: "Northwind", confidence: 0.4 },
        ]}
      />,
    );

    expect(field("Total")).toHaveAccessibleDescription(/98% confidence/);
    expect(field("Vendor")).toHaveAccessibleDescription(/Low confidence, 40%/);
  });

  describe("deciding", () => {
    it("accepts the model's value as it was", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Accept — Invoice number" }));

      expect(onDecision).toHaveBeenCalledWith("number", { kind: "accepted", value: "4471" });
    });

    it("returns a correction with the model's value kept beside it", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.clear(field("Total"));
      await user.type(field("Total"), "1240.50");
      await user.click(screen.getByRole("button", { name: "Accept correction — Total" }));

      expect(onDecision).toHaveBeenCalledWith("total", {
        kind: "corrected",
        value: "1240.50",
        proposed: "1240.00",
      });
    });

    it("says the acceptance carries a correction, so the button matches what it does", async () => {
      const user = userEvent.setup();
      render(<Example />);

      expect(screen.getByRole("button", { name: "Accept — Total" })).toBeInTheDocument();
      await user.type(field("Total"), "1");
      expect(
        screen.getByRole("button", { name: "Accept correction — Total" }),
      ).toBeInTheDocument();
    });

    it("treats a value typed back to the original as no correction", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.type(field("Total"), "1");
      await user.keyboard("{Backspace}");
      await user.click(screen.getByRole("button", { name: "Accept — Total" }));

      expect(onDecision).toHaveBeenCalledWith("total", { kind: "accepted", value: "1240.00" });
    });

    it("rejects", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Reject — Currency" }));

      expect(onDecision).toHaveBeenCalledWith("currency", { kind: "rejected" });
    });

    it("gives every button the field it belongs to, so ten Accepts are ten buttons", () => {
      render(<Example />);

      const accepts = screen.getAllByRole("button", { name: /^Accept — / });
      expect(accepts.map((b) => b.getAttribute("aria-label"))).toEqual([
        "Accept — Invoice number",
        "Accept — Issued",
        "Accept — Total",
        "Accept — Currency",
      ]);
    });

    it("accepts on Enter in a single-line field", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(field("Invoice number"));
      await user.keyboard("{Enter}");

      expect(onDecision).toHaveBeenCalledWith("number", { kind: "accepted", value: "4471" });
    });

    it("keeps Enter as a newline in a multiline field, and accepts on Ctrl+Enter", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(
        <Example
          fields={[{ name: "address", label: "Address", value: "1 Main St", multiline: true }]}
          onDecision={onDecision}
        />,
      );

      await user.click(field("Address"));
      await user.keyboard("{Enter}");
      expect(onDecision).not.toHaveBeenCalled();

      await user.keyboard("{Control>}{Enter}{/Control}");
      expect(onDecision).toHaveBeenCalledTimes(1);
      expect(onDecision.mock.calls[0]?.[1]).toMatchObject({ kind: "corrected" });
    });

    it("does not accept on the Enter that confirms an IME candidate", () => {
      const onDecision = vi.fn();
      render(<Example onDecision={onDecision} />);

      const input = field("Invoice number");
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(event, "isComposing", { value: true });
      input.dispatchEvent(event);

      expect(onDecision).not.toHaveBeenCalled();
    });
  });

  describe("status", () => {
    it("says not reviewed until there is a decision", () => {
      render(<Example />);
      expect(field("Total")).toHaveAccessibleDescription(/Not reviewed/);
    });

    it("says accepted, and presses the button, once accepted", () => {
      render(<Example decisions={{ total: { kind: "accepted", value: "1240.00" } }} />);

      expect(field("Total")).toHaveAccessibleDescription(/Accepted/);
      expect(screen.getByRole("button", { name: "Accept — Total" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(item("Total")).toHaveAttribute("data-state", "accepted");
    });

    it("says what a correction was corrected from", () => {
      render(
        <Example
          decisions={{ total: { kind: "corrected", value: "1240.50", proposed: "1240.00" } }}
        />,
      );

      expect(field("Total")).toHaveValue("1240.50");
      expect(field("Total")).toHaveAccessibleDescription(/Corrected from “1240.00”/);
    });

    it("says rejected, and presses the button", () => {
      render(<Example decisions={{ currency: { kind: "rejected" } }} />);

      expect(field("Currency")).toHaveAccessibleDescription(/Rejected/);
      expect(screen.getByRole("button", { name: "Reject — Currency" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("says when a value changed after it was accepted, and releases the button", async () => {
      // An accepted value that is then edited is neither accepted nor
      // corrected. Saying so is the difference between a record and a guess.
      const user = userEvent.setup();
      render(<Example decisions={{ total: { kind: "accepted", value: "1240.00" } }} />);

      await user.type(field("Total"), "1");

      expect(field("Total")).toHaveAccessibleDescription(/Changed since it was accepted/);
      expect(screen.getByRole("button", { name: /Accept correction — Total/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("keeps the field's accessible name stable while it is edited", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.type(field("Total"), "1");
      expect(screen.getByLabelText("Total")).toBeInTheDocument();
    });

    it("strikes through the evidence of a rejected field in the source", () => {
      render(<Example decisions={{ total: { kind: "rejected" } }} />);

      const mark = screen
        .getByRole("region", { name: "Source" })
        .querySelector("mark[data-fields='total']");
      expect(mark).toHaveClass("line-through");
    });
  });

  describe("the running count", () => {
    it("is a polite live region present from the start", () => {
      render(<Example />);
      const summary = screen.getByText(/0 of 4 reviewed/);
      expect(summary).toHaveAttribute("aria-live", "polite");
    });

    it("follows each decision", async () => {
      const user = userEvent.setup();
      render(<Controlled />);

      await user.click(screen.getByRole("button", { name: "Accept — Invoice number" }));
      expect(screen.getByText(/1 of 4 reviewed/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Reject — Currency" }));
      expect(screen.getByText(/2 of 4 reviewed/)).toBeInTheDocument();
    });

    it("marks the review complete once every field is decided", () => {
      const { container } = render(
        <Example
          decisions={Object.fromEntries(
            FIELDS.map((f) => [f.name, { kind: "accepted", value: f.value ?? "" }]),
          )}
        />,
      );
      expect(container.querySelector("[data-slot='extraction-review']")).toHaveAttribute(
        "data-complete",
      );
    });
  });

  describe("following the reviewer into the source", () => {
    it("marks a field's evidence active when focus enters the field", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(field("Issued"));

      const source = screen.getByRole("region", { name: "Source" });
      expect(source.querySelector("mark[data-active]")).toHaveTextContent("1 March 2026");
      expect(item("Issued")).toHaveAttribute("data-active");
    });

    it("moves the active evidence as focus moves", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(field("Issued"));
      await user.click(field("Total"));

      const source = screen.getByRole("region", { name: "Source" });
      expect(source.querySelectorAll("mark[data-active]")).toHaveLength(1);
      expect(source.querySelector("mark[data-active]")).toHaveTextContent("$1,240.00");
    });

    it("shows the source from the field without moving focus into it", async () => {
      const user = userEvent.setup();
      render(<Example />);

      const show = screen.getByRole("button", { name: "Show in source — Total" });
      await user.click(show);

      expect(show).toHaveFocus();
      expect(
        screen.getByRole("region", { name: "Source" }).querySelector("mark[data-active]"),
      ).toHaveTextContent("$1,240.00");
    });

    it("offers no jump for a field with nothing to jump to", () => {
      render(<Example />);
      expect(
        screen.queryByRole("button", { name: "Show in source — Currency" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("while fields are still arriving", () => {
    it("holds a missing value as arriving rather than calling it not found", () => {
      render(<Example fields={[{ name: "vat", label: "VAT" }]} streaming />);

      expect(screen.getByText("Arriving")).toBeInTheDocument();
      expect(screen.queryByText(/found nothing/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /VAT/ })).not.toBeInTheDocument();
    });

    it("reports itself busy and says so in the count", () => {
      const { container } = render(<Example streaming />);

      expect(container.querySelector("[data-slot='extraction-review']")).toHaveAttribute(
        "aria-busy",
        "true",
      );
      expect(screen.getByText(/Fields are still arriving/)).toBeInTheDocument();
    });

    it("lets fields that have arrived be reviewed already", () => {
      render(<Example streaming />);
      expect(screen.getByRole("button", { name: "Accept — Invoice number" })).toBeEnabled();
    });
  });

  describe("as a record", () => {
    it("renders values and decisions without controls when there is no onDecision", () => {
      render(
        <Example
          onDecision={undefined}
          decisions={{
            number: { kind: "accepted", value: "4471" },
            total: { kind: "corrected", value: "1240.50", proposed: "1240.00" },
          }}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("1240.50")).toBeInTheDocument();
      expect(screen.getByText(/Corrected from “1240.00”/)).toBeInTheDocument();
    });
  });

  it("renders an empty source honestly", () => {
    render(<Example source="" fields={[{ name: "x", label: "X", value: "1" }]} />);
    expect(screen.getByText("No source text.")).toBeInTheDocument();
    expect(field("X")).toHaveAccessibleDescription(/without evidence/);
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="gap-8" />);
    const root = container.querySelector("[data-slot='extraction-review']");
    expect(root).toHaveClass("gap-8");
    expect(root).not.toHaveClass("gap-3");
  });

  it("forwards a ref and native attributes to the section", () => {
    const ref = createRef<HTMLElement>();
    render(<Example ref={ref} data-testid="review" />);
    expect(ref.current).toBe(screen.getByTestId("review"));
  });

  it("renders children between the heading and the panels", () => {
    render(
      <Example>
        <p>Check the total against the PO.</p>
      </Example>,
    );
    expect(screen.getByText("Check the total against the PO.")).toBeInTheDocument();
  });

  it("has no accessibility violations while reviewing", async () => {
    const { container } = render(
      <Example decisions={{ number: { kind: "accepted", value: "4471" } }} />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations while fields arrive", async () => {
    const { container } = render(
      <Example fields={[...FIELDS, { name: "vat", label: "VAT" }]} streaming />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations as a record", async () => {
    const { container } = render(
      <Example onDecision={undefined} decisions={{ total: { kind: "rejected" } }} />,
    );
    await expectNoA11yViolations(container);
  });

  it("keeps each field's controls inside its own item", () => {
    render(<Example />);
    const total = item("Total");
    expect(within(total).getByRole("button", { name: "Accept — Total" })).toBeInTheDocument();
    expect(within(total).getByRole("button", { name: "Reject — Total" })).toBeInTheDocument();
  });
});
