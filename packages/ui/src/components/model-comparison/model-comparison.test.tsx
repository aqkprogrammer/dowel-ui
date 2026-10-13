import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  bestModels,
  ModelComparison,
  type ModelComparisonMetric,
  type ModelComparisonModel,
} from "./model-comparison";

const models: ModelComparisonModel[] = [
  {
    id: "swift",
    name: "Swift",
    provider: "Acme",
    values: { price: 0.25, speed: 210, context: 128_000, vision: false },
  },
  {
    id: "sage",
    name: "Sage",
    provider: "Acme",
    values: { price: 3, speed: 80, context: 200_000, vision: true },
  },
  {
    id: "atlas",
    name: "Atlas",
    provider: "Orbit",
    values: { price: 3, speed: 95, context: null, vision: true },
  },
];
const metrics: ModelComparisonMetric[] = [
  {
    id: "price",
    label: "Price",
    description: "per million input tokens",
    better: "lower",
    format: (v) => `$${v.toFixed(2)}`,
  },
  { id: "speed", label: "Speed", description: "tokens per second", better: "higher" },
  { id: "context", label: "Context window", better: "higher" },
  { id: "vision", label: "Image input" },
];

describe("bestModels", () => {
  it("finds the highest or lowest, keeps ties, and skips non-numbers", () => {
    expect([...bestModels(models, { id: "price", better: "lower" })]).toEqual(["swift"]);
    expect([...bestModels(models, { id: "speed", better: "higher" })]).toEqual(["swift"]);
    const tied = [
      { id: "a", name: "A", values: { x: 2 } },
      { id: "b", name: "B", values: { x: 2 } },
      { id: "c", name: "C", values: { x: 1 } },
    ];
    expect([...bestModels(tied, { id: "x", better: "higher" })]).toEqual(["a", "b"]);
    expect(bestModels(models, { id: "vision", better: "higher" }).size).toBe(0);
    expect(bestModels(models, { id: "price" }).size).toBe(0);
  });

  it("names no winner when everyone is equal", () => {
    const same = [
      { id: "a", name: "A", values: { x: 1 } },
      { id: "b", name: "B", values: { x: 1 } },
    ];
    expect(bestModels(same, { id: "x", better: "higher" }).size).toBe(0);
  });
});

describe("ModelComparison", () => {
  it("is a captioned table with model columns and metric rows", async () => {
    const { container } = render(
      <ModelComparison label="Compare models" models={models} metrics={metrics} />,
    );
    const table = screen.getByRole("table", { name: "Compare models" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Metric", "SwiftAcme", "SageAcme", "AtlasOrbit"]);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Compare models" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    await expectNoA11yViolations(container);
  });

  it("marks the best of each row in words and formats values", () => {
    render(<ModelComparison label="Compare" models={models} metrics={metrics} />);
    const priceRow = screen.getByRole("rowheader", { name: /Price/ }).closest("tr");
    expect(priceRow).not.toBeNull();
    const cells = within(priceRow as HTMLElement).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("$0.25Best");
    expect(cells[1]).toHaveTextContent("$3.00");
    expect(cells[1]).not.toHaveTextContent("Best");
    expect(screen.getAllByText("Best")).toHaveLength(3);
    expect(screen.getByText("Not available")).toHaveClass("sr-only");
    expect(screen.getAllByText("Yes")).toHaveLength(2);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("can leave the best unmarked", () => {
    render(
      <ModelComparison
        label="Compare"
        models={models}
        metrics={metrics}
        highlightBest={false}
      />,
    );
    expect(screen.queryByText("Best")).not.toBeInTheDocument();
  });

  it("lets people choose a model", () => {
    const onSelect = vi.fn();
    render(
      <ModelComparison
        label="Compare"
        models={models}
        metrics={metrics}
        selected="sage"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "Chosen: Sage" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose: Atlas" }));
    expect(onSelect).toHaveBeenCalledWith("atlas");
  });
});
