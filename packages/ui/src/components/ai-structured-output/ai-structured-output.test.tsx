import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  StructuredConfidence,
  StructuredField,
  StructuredOutput,
  type OutputField,
} from "./ai-structured-output";

const FIELDS: OutputField[] = [
  { name: "vendor", label: "Vendor" },
  { name: "total", label: "Total" },
  { name: "dueDate", label: "Due date" },
];

function fieldEl(container: HTMLElement, name: string): HTMLElement {
  return container.querySelector(`[data-field='${name}']`) as HTMLElement;
}

describe("StructuredOutput", () => {
  it("renders every declared field before any value arrives", () => {
    render(<StructuredOutput fields={FIELDS} value={{}} streaming />);

    expect(screen.getByText("Vendor")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
  });

  it("reserves height from the declared field list, so arrival does not shift layout", () => {
    const { container } = render(
      <StructuredOutput
        fields={[{ name: "notes", label: "Notes", lines: 3 }]}
        value={{}}
        streaming
      />,
    );

    // Read the inline declaration rather than the computed style: jsdom does
    // not resolve rem units, so toHaveStyle sees nothing at all here.
    const dd = container.querySelector("dd");
    expect((dd as HTMLElement).style.minHeight).toBe("3.75rem");
  });

  it("associates each value with its label as a description list", () => {
    const { container } = render(
      <StructuredOutput fields={FIELDS} value={{ vendor: "Acme" }} />,
    );

    expect(container.querySelector("dl")).toBeInTheDocument();
    expect(container.querySelectorAll("dt")).toHaveLength(3);
  });

  describe("field state", () => {
    it("marks an absent field pending", () => {
      const { container } = render(<StructuredOutput fields={FIELDS} value={{}} streaming />);
      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "pending");
    });

    it("settles a field once a later one has appeared", () => {
      // The documented inference: depth-first JSON streaming cannot return to
      // an earlier key, so a later arrival proves the earlier one finished.
      const { container } = render(
        <StructuredOutput fields={FIELDS} value={{ vendor: "Acme", total: 120 }} streaming />,
      );

      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "settled");
      expect(fieldEl(container, "total")).toHaveAttribute("data-state", "streaming");
    });

    it("settles everything present once streaming ends", () => {
      const { container } = render(
        <StructuredOutput fields={FIELDS} value={{ vendor: "Acme", total: 120 }} />,
      );

      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "settled");
      expect(fieldEl(container, "total")).toHaveAttribute("data-state", "settled");
    });

    it("prefers an explicit settled list over the inference", () => {
      const { container } = render(
        <StructuredOutput
          fields={FIELDS}
          value={{ vendor: "Acme", total: 120 }}
          streaming
          settled={["total"]}
        />,
      );

      expect(fieldEl(container, "total")).toHaveAttribute("data-state", "settled");
      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "streaming");
    });

    it("marks a field with an error, whatever its value", () => {
      const { container } = render(
        <StructuredOutput
          fields={FIELDS}
          value={{ vendor: "Acme" }}
          errors={{ vendor: "Could not read the vendor block" }}
        />,
      );

      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "error");
    });

    it("does not treat a falsy value as absent", () => {
      // 0 and empty string are extracted values, not missing ones.
      const { container } = render(
        <StructuredOutput fields={FIELDS} value={{ total: 0, vendor: "" }} />,
      );

      expect(fieldEl(container, "total")).toHaveAttribute("data-state", "settled");
      expect(fieldEl(container, "vendor")).toHaveAttribute("data-state", "settled");
    });
  });

  describe("announcement", () => {
    it("is a polite live region so fields are read as they settle", () => {
      const { container } = render(<StructuredOutput fields={FIELDS} value={{}} streaming />);

      const list = container.querySelector("[data-slot='structured-output']");
      expect(list).toHaveAttribute("aria-live", "polite");
    });

    it("reports busy while streaming and stops when it ends", () => {
      const { container, rerender } = render(
        <StructuredOutput fields={FIELDS} value={{}} streaming />,
      );
      expect(container.querySelector("[data-slot='structured-output']")).toHaveAttribute(
        "aria-busy",
        "true",
      );

      rerender(<StructuredOutput fields={FIELDS} value={{ vendor: "Acme" }} />);
      expect(container.querySelector("[data-slot='structured-output']")).toHaveAttribute(
        "aria-busy",
        "false",
      );
    });

    it("hides the placeholder from assistive technology", () => {
      // A pulsing box is not information; announcing it would interrupt.
      const { container } = render(<StructuredOutput fields={FIELDS} value={{}} streaming />);

      const placeholder = container.querySelector("[data-slot='structured-field-placeholder']");
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("values", () => {
    it("formats booleans and arrays for people", () => {
      render(
        <StructuredOutput
          fields={[
            { name: "paid", label: "Paid" },
            { name: "tags", label: "Tags" },
          ]}
          value={{ paid: true, tags: ["urgent", "eu"] }}
        />,
      );

      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("urgent, eu")).toBeInTheDocument();
    });

    it("uses a custom formatter with the field name available", () => {
      render(
        <StructuredOutput
          fields={[{ name: "total", label: "Total" }]}
          value={{ total: 1299 }}
          formatValue={(value, name) => `${name}=${String(value)}`}
        />,
      );

      expect(screen.getByText("total=1299")).toBeInTheDocument();
    });

    it("accepts a custom renderer per field", () => {
      render(
        <StructuredOutput fields={FIELDS} value={{ vendor: "Acme" }}>
          <StructuredField name="vendor">
            <strong>Custom</strong>
          </StructuredField>
        </StructuredOutput>,
      );

      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("fails loudly for a field that was never declared", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(() =>
        render(
          <StructuredOutput fields={FIELDS} value={{}}>
            <StructuredField name="nope" />
          </StructuredOutput>,
        ),
      ).toThrow(/not declared in the fields prop/);
      consoleError.mockRestore();
    });
  });

  describe("confidence", () => {
    it("states the number, not just a colour", () => {
      render(<StructuredConfidence value={0.94} />);
      expect(screen.getByText("94% confidence")).toBeInTheDocument();
    });

    it("says plainly when it is worth checking", () => {
      render(<StructuredConfidence value={0.42} />);
      expect(screen.getByText(/Low confidence, 42% — worth checking/)).toBeInTheDocument();
    });

    it("respects a custom threshold", () => {
      const { container } = render(<StructuredConfidence value={0.8} lowBelow={0.9} />);
      expect(container.querySelector("[data-slot='structured-confidence']")).toHaveAttribute(
        "data-low",
      );
    });
  });

  it("throws a useful error when a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<StructuredField name="vendor" />)).toThrow(
      /must be rendered inside <StructuredOutput>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations while streaming", async () => {
    const { container } = render(
      <StructuredOutput fields={FIELDS} value={{ vendor: "Acme" }} streaming />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations once complete", async () => {
    const { container } = render(
      <StructuredOutput
        fields={FIELDS}
        value={{ vendor: "Acme", total: 1299, dueDate: "2026-10-01" }}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
