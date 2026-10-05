import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ManagementBar, type ManagementBarAction } from "./management-bar";

function actions(overrides: Partial<ManagementBarAction>[] = []): ManagementBarAction[] {
  const base: ManagementBarAction[] = [
    { label: "Archive", icon: <svg />, onSelect: vi.fn() },
    { label: "Export", icon: <svg />, onSelect: vi.fn(), tone: "primary" },
    { label: "Delete", icon: <svg />, onSelect: vi.fn(), tone: "destructive" },
  ];
  return base.map((action, index) => ({ ...action, ...overrides[index] }));
}

function bar() {
  return screen.getByRole("toolbar", { name: "Bulk actions" });
}

function shownValue(slot: string) {
  return bar()
    .querySelector(`[data-slot="management-bar-${slot}"] [data-slot="number-flow"]`)
    ?.getAttribute("data-value");
}

describe("ManagementBar", () => {
  it("renders nothing with nothing selected", () => {
    render(<ManagementBar selectedCount={0} actions={actions()} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("renders a named toolbar with the count, actions and pager", () => {
    render(
      <ManagementBar
        selectedCount={3}
        onClearSelection={vi.fn()}
        actions={actions()}
        pageCount={5}
      />,
    );
    const toolbar = bar();
    expect(toolbar).toHaveAttribute("data-slot", "management-bar");
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(toolbar).toHaveTextContent("3 selected");
    expect(shownValue("count")).toBe("3");
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
    for (const name of ["Archive", "Export", "Delete"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(toolbar).toHaveTextContent("Page 1 of 5");
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Next page" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("springs in when a selection appears and leaves when it clears", async () => {
    const { rerender } = render(<ManagementBar selectedCount={0} actions={actions()} />);
    rerender(<ManagementBar selectedCount={2} actions={actions()} />);
    expect(bar()).toBeInTheDocument();
    rerender(<ManagementBar selectedCount={5} actions={actions()} />);
    expect(shownValue("count")).toBe("5");
    rerender(<ManagementBar selectedCount={0} actions={actions()} />);
    // Leaving, it holds the last count instead of rolling to zero.
    if (screen.queryByRole("toolbar")) expect(shownValue("count")).toBe("5");
    await waitFor(() => {
      expect(screen.queryByRole("toolbar")).toBeNull();
    });
  });

  it("follows `open` over the count", async () => {
    const { rerender } = render(<ManagementBar selectedCount={0} open />);
    expect(bar()).toHaveTextContent("0 selected");
    rerender(<ManagementBar selectedCount={4} open={false} />);
    await waitFor(() => {
      expect(screen.queryByRole("toolbar")).toBeNull();
    });
  });

  it("runs actions and clears the selection", async () => {
    const user = userEvent.setup();
    const list = actions();
    const onClearSelection = vi.fn();
    render(
      <ManagementBar selectedCount={2} actions={list} onClearSelection={onClearSelection} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(list[2]?.onSelect).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("ignores a disabled action but keeps it focusable", async () => {
    const user = userEvent.setup();
    const list = actions([{ disabled: true }]);
    render(<ManagementBar selectedCount={1} actions={list} />);
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(archive);
    expect(list[0]?.onSelect).not.toHaveBeenCalled();
    await user.tab();
    expect(archive).toHaveFocus();
  });

  it("springs a label open on hover and focus, or keeps them all open", () => {
    const { rerender } = render(<ManagementBar selectedCount={1} actions={actions()} />);
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive).not.toHaveAttribute("data-expanded");
    fireEvent.pointerEnter(archive);
    expect(archive).toHaveAttribute("data-expanded");
    fireEvent.pointerLeave(archive);
    expect(archive).not.toHaveAttribute("data-expanded");
    fireEvent.focus(archive);
    expect(archive).toHaveAttribute("data-expanded");
    fireEvent.pointerLeave(screen.getByRole("button", { name: "Export" }));
    expect(archive).toHaveAttribute("data-expanded");
    fireEvent.blur(archive);
    expect(archive).not.toHaveAttribute("data-expanded");
    rerender(<ManagementBar selectedCount={1} actions={actions()} labels="always" />);
    for (const name of ["Archive", "Export", "Delete"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("data-expanded");
    }
  });

  it.each([
    ["default", ""],
    ["primary", "text-primary"],
    ["destructive", "text-destructive"],
  ] as const)("applies the %s tone", (tone, colour) => {
    render(<ManagementBar selectedCount={1} actions={actions([{ tone }])} />);
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive).toHaveAttribute("data-tone", tone);
    if (colour) expect(archive).toHaveClass(colour);
  });

  it("pages uncontrolled, and stops at the bounds", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<ManagementBar selectedCount={1} pageCount={3} onPageChange={onPageChange} />);
    const next = screen.getByRole("button", { name: "Next page" });
    const previous = screen.getByRole("button", { name: "Previous page" });
    await user.click(next);
    expect(bar()).toHaveTextContent("Page 2 of 3");
    expect(shownValue("page")).toBe("2");
    await user.click(next);
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledTimes(2);
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(previous);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("pages controlled", async () => {
    function Controlled() {
      const [page, setPage] = useState(4);
      return (
        <ManagementBar selectedCount={1} page={page} pageCount={4} onPageChange={setPage} />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(bar()).toHaveTextContent("Page 4 of 4");
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(bar()).toHaveTextContent("Page 3 of 4");
  });

  it("has no pager for a single page, and clamps an out-of-range page", () => {
    const { rerender } = render(<ManagementBar selectedCount={1} pageCount={1} />);
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
    rerender(<ManagementBar selectedCount={1} page={9} pageCount={3} />);
    expect(bar()).toHaveTextContent("Page 3 of 3");
  });

  it("is one Tab stop with a roving tabindex", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <ManagementBar
          selectedCount={2}
          onClearSelection={vi.fn()}
          actions={actions()}
          pageCount={2}
        />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    await user.tab();
    const clear = screen.getByRole("button", { name: "Clear selection" });
    expect(clear).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Next page" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(clear).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Next page" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(clear).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    const previous = screen.getByRole("button", { name: "Previous page" });
    expect(previous).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    // Coming back, the toolbar's Tab stop is the control last focused.
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(previous).toHaveFocus();
    expect(previous).toHaveAttribute("tabindex", "0");
    expect(clear).toHaveAttribute("tabindex", "-1");
    await user.keyboard("a");
    expect(previous).toHaveFocus();
  });

  it("reverses the arrows right to left", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <ManagementBar selectedCount={2} actions={actions()} />
      </div>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
  });

  it("respects a consumer's prevented keydown", async () => {
    const user = userEvent.setup();
    render(
      <ManagementBar
        selectedCount={2}
        actions={actions()}
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
  });

  it("gives the Tab stop back to the first control when the controls shrink", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ManagementBar selectedCount={2} actions={actions()} />);
    await user.tab();
    await user.keyboard("{End}");
    rerender(<ManagementBar selectedCount={2} actions={actions().slice(0, 1)} />);
    expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute("tabindex", "0");
  });

  it("returns focus to where it came from when it closes", async () => {
    function Selection() {
      const [count, setCount] = useState(2);
      return (
        <>
          <button type="button">Rows</button>
          <ManagementBar
            selectedCount={count}
            onClearSelection={() => {
              setCount(0);
            }}
          />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Selection />);
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Rows" })).toHaveFocus();
  });

  it("takes custom names", () => {
    render(
      <ManagementBar
        selectedCount={1200}
        aria-label="Selected files"
        selectedLabel="files"
        clearLabel="Deselect all"
        previousLabel="Back"
        nextLabel="Forward"
        onClearSelection={vi.fn()}
        pageCount={2}
      />,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Selected files" });
    expect(toolbar).toHaveTextContent(`${new Intl.NumberFormat().format(1200)} files`);
    for (const name of ["Deselect all", "Back", "Forward"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it.each([
    ["floating", "fixed"],
    ["inline", "relative"],
  ] as const)("applies the %s placement", (placement, position) => {
    render(<ManagementBar selectedCount={1} placement={placement} />);
    expect(bar()).toHaveClass(position);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ManagementBar
        ref={ref}
        selectedCount={1}
        className="bottom-10"
        surfaceClassName="rounded-xl"
        data-testid="bar"
      />,
    );
    const toolbar = screen.getByTestId("bar");
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveClass("bottom-10");
    expect(toolbar).not.toHaveClass("bottom-6");
    const surface = toolbar.querySelector('[data-slot="management-bar-surface"]');
    expect(surface).toHaveClass("rounded-xl");
    expect(surface).not.toHaveClass("rounded-full");
  });

  it("calls a ref callback", () => {
    const ref = vi.fn();
    render(<ManagementBar ref={ref} selectedCount={1} />);
    expect(ref).toHaveBeenCalledWith(bar());
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ManagementBar
        selectedCount={3}
        onClearSelection={vi.fn()}
        actions={actions([{ disabled: true }])}
        pageCount={4}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
