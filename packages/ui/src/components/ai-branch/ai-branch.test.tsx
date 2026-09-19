import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
  type BranchProps,
} from "./ai-branch";

function Example(props: BranchProps & { count?: number }) {
  const { count = 3, ...rest } = props;
  return (
    <Branch {...rest}>
      <BranchMessages>
        {Array.from({ length: count }, (_, index) => (
          <p key={index}>Answer {index + 1}</p>
        ))}
      </BranchMessages>
      <BranchSelector>
        <BranchPrevious />
        <BranchPage />
        <BranchNext />
      </BranchSelector>
    </Branch>
  );
}

function visible() {
  return screen.getAllByText(/^Answer \d$/).filter((node) => !node.closest("[hidden]"));
}

describe("Branch", () => {
  it("shows only the current version and keeps the others mounted", () => {
    render(<Example />);
    expect(visible().map((node) => node.textContent)).toEqual(["Answer 1"]);
    expect(screen.getByText("Answer 2").closest("[data-slot=branch-message]")).toHaveAttribute(
      "data-state",
      "inactive",
    );
    expect(screen.getByRole("group", { name: "Versions" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toHaveAttribute("aria-live", "polite");
  });

  it("pages forwards and back, wrapping at both ends", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Previous version" }));
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(visible()[0]).toHaveTextContent("Answer 3");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    await user.click(screen.getByRole("button", { name: "Next version" }));
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue={1} />);
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Next version" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(2);
      return (
        <Example value={value} onValueChange={(next) => setValue(next === 0 ? 1 : next)} />
      );
    }
    render(<Controlled />);
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next version" }));
    // The parent redirected 0 to 1.
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("clamps an out-of-range value", () => {
    render(<Example value={9} />);
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("hides the pager when there is only one version", () => {
    render(<Example count={1} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(visible()).toHaveLength(1);
  });

  it("lets a consumer cancel a page turn and replace the icons and names", async () => {
    const user = userEvent.setup();
    render(
      <Branch>
        <BranchMessages>
          <p>Answer 1</p>
          <p>Answer 2</p>
        </BranchMessages>
        <BranchSelector from="user" className="gap-3">
          <BranchPrevious aria-label="Older" onClick={(event) => event.preventDefault()}>
            ‹
          </BranchPrevious>
          <BranchNext />
        </BranchSelector>
      </Branch>,
    );
    const group = screen.getByRole("group");
    expect(group).toHaveClass("justify-end", "gap-3");
    await user.click(screen.getByRole("button", { name: "Older" }));
    expect(visible()[0]).toHaveTextContent("Answer 1");
    expect(
      screen.getByRole("button", { name: "Next version" }).querySelector("svg"),
    ).toHaveClass("rtl:-scale-x-100");
  });

  it("throws a helpful error outside a Branch", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BranchPage />)).toThrow("<BranchPage> must be used within <Branch>.");
    vi.restoreAllMocks();
  });

  it("defines its entrance keyframe through the duration tokens", () => {
    render(<Example />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-ai-branch-in{");
    expect(css).toContain("var(--duration-slow)");
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Example ref={ref} className="gap-6" data-testid="b" />);
    const root = container.querySelector('[data-slot="branch"]');
    expect(root).toHaveClass("gap-6");
    expect(root).not.toHaveClass("gap-2");
    expect(ref.current).toBe(root);
    expect(screen.getByTestId("b")).toBe(root);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
