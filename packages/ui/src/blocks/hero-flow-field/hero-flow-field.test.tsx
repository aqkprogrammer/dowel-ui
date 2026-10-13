import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../../components/dither-canvas/canvas-mock";
import { HeroFlowFieldBlock } from "./hero-flow-field";

describe("HeroFlowFieldBlock", () => {
  let canvas: CanvasMock;
  beforeEach(() => {
    canvas = installCanvasMock();
  });
  afterEach(() => {
    canvas.restore();
  });

  it("is one section landmark named by its headline", async () => {
    const { container } = render(<HeroFlowFieldBlock title="Ship it" />);
    expect(screen.getByRole("region", { name: "Ship it" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Ship it" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("shows a command with a named copy button", () => {
    render(<HeroFlowFieldBlock command="pnpm dlx dowel add card" />);
    expect(screen.getByText("pnpm dlx dowel add card").tagName).toBe("CODE");
    expect(screen.getByRole("button", { name: "Copy command" })).toBeInTheDocument();
  });

  it("reads each figure with what it counts", () => {
    render(
      <HeroFlowFieldBlock
        stats={[
          { value: "12", label: "regions" },
          { value: "99.99%", label: "uptime" },
        ]}
      />,
    );
    const terms = screen.getAllByRole("term");
    expect(terms.map((term) => term.textContent)).toEqual(["regions", "uptime"]);
    const first = terms[0]?.parentElement;
    expect(within(first as HTMLElement).getByRole("definition")).toHaveTextContent("12");
  });

  it("hides what is null or empty", () => {
    render(
      <HeroFlowFieldBlock
        eyebrow={null}
        command={null}
        primaryAction={null}
        secondaryAction={null}
        stats={[]}
        headingLevel={2}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
