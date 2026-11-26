import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CoverFlow, type CoverFlowProps } from "./cover-flow";

function Flow(props: Partial<CoverFlowProps>) {
  return (
    <CoverFlow {...props}>
      {["A", "B", "C", "D", "E"].map((name) => (
        <button key={name} type="button">
          Open {name}
        </button>
      ))}
    </CoverFlow>
  );
}

function active(container: HTMLElement) {
  return container.querySelector("[data-active]")?.getAttribute("aria-label");
}

describe("CoverFlow", () => {
  it("is a named carousel region of slides, centred on the middle one", () => {
    const { container } = render(<Flow label="Albums" />);
    const region = screen.getByRole("region", { name: "Albums" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getAllByRole("group", { hidden: true })).toHaveLength(5);
    expect(active(container)).toBe("3 of 5");
  });

  it("only exposes the active card's contents", () => {
    render(<Flow />);
    expect(screen.getAllByRole("button", { name: /^Open/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open C" })).toBeInTheDocument();
  });

  it("moves with the buttons and announces it", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    const { container } = render(<Flow onIndexChange={onIndexChange} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    expect(active(container)).toBe("4 of 5");
    expect(screen.getByText("Slide 4 of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(active(container)).toBe("3 of 5");
  });

  it("moves with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const { container } = render(<Flow />);
    screen.getByRole("region").focus();

    await user.keyboard("{ArrowRight}");
    expect(active(container)).toBe("4 of 5");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(active(container)).toBe("2 of 5");
    await user.keyboard("{End}");
    expect(active(container)).toBe("5 of 5");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.keyboard("{Home}");
    expect(active(container)).toBe("1 of 5");
  });

  it("wraps when looping", async () => {
    const user = userEvent.setup();
    const { container } = render(<Flow loop defaultIndex={4} />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(active(container)).toBe("1 of 5");
  });

  it("brings a side card forward on click", async () => {
    const user = userEvent.setup();
    const { container } = render(<Flow />);
    const side = container.querySelector<HTMLElement>("[aria-label='5 of 5']")!;
    await user.click(side);
    expect(active(container)).toBe("5 of 5");
  });

  it("follows a controlled index", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState(0);
      return <Flow index={index} onIndexChange={setIndex} />;
    }
    const { container } = render(<Controlled />);
    expect(active(container)).toBe("1 of 5");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(active(container)).toBe("2 of 5");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Flow ref={ref} className="custom" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("custom", "flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Flow />);
    await expectNoA11yViolations(container);
  });
});
