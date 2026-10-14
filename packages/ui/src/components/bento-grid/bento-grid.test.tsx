import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BentoGrid, BentoItem } from "./bento-grid";

describe("BentoGrid", () => {
  it("keeps tiles in document order, one column on small screens", async () => {
    const { container } = render(
      <BentoGrid data-testid="grid">
        <BentoItem colSpan={2} rowSpan={2}>
          <h3>Big</h3>
        </BentoItem>
        <BentoItem>
          <h3>Small</h3>
        </BentoItem>
      </BentoGrid>,
    );
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Big", "Small"]);
    const grid = screen.getByTestId("grid");
    expect(grid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-3");
    expect(grid).not.toHaveClass("md:grid-flow-row-dense");
    await expectNoA11yViolations(container);
  });

  it("spans columns and rows from md up", () => {
    render(
      <BentoGrid columns={4}>
        <BentoItem colSpan={3} rowSpan={2} data-testid="tile" />
      </BentoGrid>,
    );
    expect(screen.getByTestId("tile")).toHaveClass("md:col-span-3", "md:row-span-2");
  });

  it("sets columns, gap and row height, and fills gaps only when dense", () => {
    render(<BentoGrid columns={6} dense gap={24} rowHeight={10} data-testid="grid" />);
    const grid = screen.getByTestId("grid");
    expect(grid).toHaveClass("md:grid-cols-6", "md:grid-flow-row-dense");
    expect(grid.style.getPropertyValue("--bento-gap")).toBe("24px");
    // A row is never shorter than 40px.
    expect(grid.style.getPropertyValue("--bento-row")).toBe("40px");
  });

  it("lets className win on both parts and forwards refs", () => {
    const gridRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    render(
      <BentoGrid ref={gridRef} className="gap-0">
        <BentoItem ref={itemRef} className="p-0">
          x
        </BentoItem>
      </BentoGrid>,
    );
    expect(gridRef.current).toHaveClass("gap-0");
    expect(itemRef.current).toHaveClass("p-0");
    expect(itemRef.current).not.toHaveClass("p-6");
  });
});
