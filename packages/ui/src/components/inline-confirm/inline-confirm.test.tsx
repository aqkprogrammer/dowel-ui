import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { InlineConfirm } from "./inline-confirm";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("InlineConfirm", () => {
  it("renders a labelled group with the trigger", () => {
    render(<InlineConfirm />);
    expect(screen.getByRole("group", { name: "Delete file" })).toHaveAttribute(
      "data-phase",
      "idle",
    );
    expect(screen.getByRole("button", { name: "Delete file" })).toBeInTheDocument();
  });

  it("asks on click and focuses the safe answer", async () => {
    const user = userEvent.setup();
    const onPhaseChange = vi.fn();
    render(<InlineConfirm onPhaseChange={onPhaseChange} />);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(onPhaseChange).toHaveBeenLastCalledWith("asking");
  });

  it("Keep returns to idle and refocuses the trigger", async () => {
    const user = userEvent.setup();
    render(<InlineConfirm />);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.getByRole("button", { name: "Delete file" })).toHaveFocus();
  });

  it("Escape cancels asking from the keyboard", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<InlineConfirm onConfirm={onConfirm} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Delete file" })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("ignores Escape outside the asking phase", async () => {
    const user = userEvent.setup();
    const onPhaseChange = vi.fn();
    render(<InlineConfirm onPhaseChange={onPhaseChange} />);
    await user.tab();
    await user.keyboard("{Escape}");
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it("confirms, announces, focuses Undo, and Undo restores", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onUndo = vi.fn();
    render(<InlineConfirm onConfirm={onConfirm} onUndo={onUndo} />);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");
    expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Delete file" })).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("returns to idle when the undo window closes", () => {
    vi.useFakeTimers();
    render(<InlineConfirm undoWindow={1000} />);
    fireEvent.pointerDown(screen.getByRole("group"));
    fireEvent.click(screen.getByRole("button", { name: "Delete file" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("data-phase", "done");
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(group).toHaveAttribute("data-phase", "done");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(group).toHaveAttribute("data-phase", "idle");
  });

  it("pauses the undo window while keyboard focus is inside, and resumes on leaving", () => {
    vi.useFakeTimers();
    render(
      <>
        <InlineConfirm undoWindow={1000} announcement="File deleted" />
        <button type="button">After</button>
      </>,
    );
    const group = screen.getByRole("group");
    fireEvent.keyDown(group, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Delete file" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("status")).toHaveTextContent("File deleted");
    const undo = screen.getByRole("button", { name: "Undo" });
    fireEvent.keyDown(undo, { key: "Tab" });
    fireEvent.focus(undo);
    expect(group).toHaveAttribute("data-paused");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(group).toHaveAttribute("data-phase", "done");

    fireEvent.blur(undo, { relatedTarget: screen.getByRole("button", { name: "After" }) });
    expect(group).not.toHaveAttribute("data-paused");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(group).toHaveAttribute("data-phase", "idle");
  });

  it("does not pause for the focus that follows a click", async () => {
    const user = userEvent.setup();
    render(<InlineConfirm />);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("group")).not.toHaveAttribute("data-paused");
  });

  it("accepts custom labels, a custom icon and no icon", () => {
    const { rerender } = render(
      <InlineConfirm label="Remove member" icon={<svg data-testid="icon" />} />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    rerender(<InlineConfirm label="Remove member" icon={null} />);
    expect(
      screen.getByRole("button", { name: "Remove member" }).querySelector("svg"),
    ).toBeNull();
  });

  it("announces a generic word when the done label is not text", async () => {
    const user = userEvent.setup();
    render(<InlineConfirm doneLabel={<b>Gone</b>} />);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("status")).toHaveTextContent("Done");
  });

  it("sizes the pill to its measured content", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(148);
    const user = userEvent.setup();
    render(<InlineConfirm />);
    const group = screen.getByRole("group");
    expect(group.style.width).toBe("148px");
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    expect(group.style.width).toBe("148px");
  });

  it("disables the trigger", () => {
    render(<InlineConfirm disabled />);
    expect(screen.getByRole("button", { name: "Delete file" })).toBeDisabled();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const { rerender } = render(
      <InlineConfirm ref={ref} className="rounded-none bg-muted" data-testid="confirm" />,
    );
    const group = screen.getByTestId("confirm");
    expect(ref.current).toBe(group);
    expect(group).toHaveClass("rounded-none", "bg-muted");
    expect(group).not.toHaveClass("rounded-full", "bg-card");
    rerender(<InlineConfirm ref={callbackRef} shape="rounded" stroke={false} />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("passes consumer handlers through", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onPointerDown = vi.fn();
    render(
      <>
        <InlineConfirm
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={onPointerDown}
        />
        <button type="button">Next</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await user.keyboard("{Escape}");
    await user.tab();
    expect(onKeyDown).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
    expect(onPointerDown).toHaveBeenCalled();
  });

  it("has no accessibility violations in any phase", async () => {
    const user = userEvent.setup();
    const { container } = render(<InlineConfirm />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Delete file" }));
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await expectNoA11yViolations(container);
  });
});
