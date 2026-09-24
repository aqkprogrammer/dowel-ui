import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AnimatedChecklist, type ChecklistItem } from "./animated-checklist";

const TASKS: ChecklistItem[] = [
  { id: "a", label: "Book the studio", done: true },
  { id: "b", label: "Send the estimate" },
  { id: "c", label: "Pick a typeface" },
];

afterEach(() => {
  vi.useRealTimers();
});

/** Task labels in the order they are shown. */
function shown() {
  return screen.getAllByRole("listitem").map((row) => row.textContent);
}

describe("AnimatedChecklist", () => {
  it("renders a labelled group with a list of checkboxes", () => {
    render(<AnimatedChecklist aria-label="Today" defaultItems={TASKS} />);
    const group = screen.getByRole("group", { name: "Today" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: "Book the studio" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Send the estimate" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Add new task" })).toBeInTheDocument();
  });

  it("toggles by clicking anywhere on the row, and with Space", async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<AnimatedChecklist defaultItems={TASKS} onItemsChange={onItemsChange} />);
    await user.click(screen.getByText("Send the estimate"));
    const box = screen.getByRole("checkbox", { name: "Send the estimate" });
    expect(box).toBeChecked();
    expect(box.closest("li")).toHaveAttribute("data-done");
    expect(onItemsChange).toHaveBeenLastCalledWith([
      TASKS[0],
      { ...TASKS[1], done: true },
      TASKS[2],
    ]);

    box.focus();
    await user.keyboard(" ");
    expect(box).not.toBeChecked();
  });

  it("adds a task with Enter, announces it, and keeps the field open", async () => {
    const user = userEvent.setup();
    render(<AnimatedChecklist defaultItems={TASKS} />);
    await user.click(screen.getByRole("button", { name: "Add new task" }));
    const field = screen.getByRole("textbox", { name: "New task" });
    expect(field).toHaveFocus();
    await user.keyboard("   {Enter}");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    await user.keyboard("Order prints{Enter}");
    expect(screen.getByRole("checkbox", { name: "Order prints" })).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Added: Order prints");
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
  });

  it("Escape cancels adding and returns focus to the add button", async () => {
    const user = userEvent.setup();
    render(<AnimatedChecklist defaultItems={TASKS} />);
    await user.click(screen.getByRole("button", { name: "Add new task" }));
    await user.keyboard("Half a thought{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add new task" })).toHaveFocus();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("closes an empty field on blur but keeps a draft", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AnimatedChecklist defaultItems={TASKS} />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Add new task" }));
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add new task" }));
    await user.keyboard("Draft");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.getByRole("textbox")).toHaveValue("Draft");
  });

  it("hides the add row at capacity and focuses the task that filled it", async () => {
    const user = userEvent.setup();
    render(<AnimatedChecklist defaultItems={TASKS} maxItems={4} />);
    await user.click(screen.getByRole("button", { name: "Add new task" }));
    await user.keyboard("Last one{Enter}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add new task" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Last one" })).toHaveFocus();
  });

  it("removes tasks, announcing and moving focus to a neighbour", async () => {
    const user = userEvent.setup();
    render(<AnimatedChecklist defaultItems={TASKS.slice(0, 2)} removable />);
    await user.click(screen.getByRole("button", { name: "Remove Book the studio" }));
    expect(screen.getByRole("status")).toHaveTextContent("Removed: Book the studio");
    expect(screen.getByRole("checkbox", { name: "Send the estimate" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Remove Send the estimate" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add new task" })).toHaveFocus();
  });

  it("follows controlled items", async () => {
    function Controlled() {
      const [items, setItems] = useState(TASKS);
      return (
        <>
          <AnimatedChecklist items={items} onItemsChange={setItems} allowAdd={false} />
          <output>{items.filter((item) => item.done).length} done</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.queryByRole("button", { name: "Add new task" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    expect(screen.getByText("2 done")).toBeInTheDocument();
  });

  it("only requests changes when controlled", async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    render(<AnimatedChecklist items={TASKS} onItemsChange={onItemsChange} />);
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    expect(onItemsChange).toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Pick a typeface" })).not.toBeChecked();
  });

  it("takes the bounce, box size and radius as custom properties", () => {
    render(
      <AnimatedChecklist
        data-testid="list"
        defaultItems={TASKS}
        bounce={0}
        boxSize={24}
        radius={8}
      />,
    );
    const list = screen.getByTestId("list");
    expect(list.style.getPropertyValue("--animated-checklist-box")).toBe("24px");
    expect(list.style.getPropertyValue("--animated-checklist-ease")).toBe(
      "cubic-bezier(0.34, 1, 0.64, 1)",
    );
    expect(list.style.borderRadius).toBe("8px");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AnimatedChecklist
        ref={ref}
        className="w-full rounded-none bg-muted"
        data-testid="list"
        stroke
      />,
    );
    const list = screen.getByTestId("list");
    expect(ref.current).toBe(list);
    expect(list).toHaveClass("w-full", "rounded-none", "bg-muted");
    expect(list).not.toHaveClass("bg-card", "rounded-[1.125rem]");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AnimatedChecklist aria-label="Today" defaultItems={TASKS} removable />,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Add new task" }));
    await expectNoA11yViolations(container);
  });
});

describe("AnimatedChecklist size", () => {
  it("scales the box, rows, text and card together", () => {
    const { rerender } = render(<AnimatedChecklist data-testid="list" defaultItems={TASKS} />);
    const list = screen.getByTestId("list");
    const row = () => screen.getAllByRole("listitem")[0]!;
    const text = () => row().querySelector('[data-slot="animated-checklist-text"]');
    expect(list).toHaveAttribute("data-size", "md");
    expect(list.style.getPropertyValue("--animated-checklist-box")).toBe("18px");
    expect(list).toHaveClass("rounded-[1.125rem]", "px-3.5");
    expect(row()).toHaveClass("h-10");
    expect(text()).toHaveClass("text-sm", "leading-tight");

    rerender(<AnimatedChecklist data-testid="list" defaultItems={TASKS} size="sm" />);
    expect(list.style.getPropertyValue("--animated-checklist-box")).toBe("15px");
    expect(list).toHaveClass("rounded-[0.875rem]", "px-3");
    expect(row()).toHaveClass("h-8");
    expect(text()).toHaveClass("text-xs");
    expect(screen.getByRole("button", { name: "Add new task" })).toHaveClass("text-xs");

    rerender(<AnimatedChecklist data-testid="list" defaultItems={TASKS} size="lg" removable />);
    expect(list.style.getPropertyValue("--animated-checklist-box")).toBe("20px");
    expect(list).toHaveClass("rounded-[1.375rem]", "px-4");
    expect(row()).toHaveClass("h-12");
    expect(text()).toHaveClass("text-base");
    expect(screen.getByRole("button", { name: "Remove Book the studio" })).toHaveClass(
      "size-8",
    );
  });

  it("lets an explicit boxSize win over the size", () => {
    render(<AnimatedChecklist data-testid="list" size="lg" boxSize={24} />);
    expect(screen.getByTestId("list").style.getPropertyValue("--animated-checklist-box")).toBe(
      "24px",
    );
  });
});

describe("AnimatedChecklist sortDone", () => {
  function setup() {
    // Real time keeps the fake clock moving too (user-event needs it), so the
    // assertions below leave a margin either side of the settle pause.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    return userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
  }

  it("shows tasks already done at the bottom from the first paint", () => {
    render(<AnimatedChecklist defaultItems={TASKS} sortDone />);
    expect(shown()).toEqual(["Send the estimate", "Pick a typeface", "Book the studio"]);
  });

  it("sinks a ticked task once its tick has played, keeping focus on it", async () => {
    const user = setup();
    const onItemsChange = vi.fn();
    render(<AnimatedChecklist defaultItems={TASKS} sortDone onItemsChange={onItemsChange} />);
    const box = screen.getByRole("checkbox", { name: "Send the estimate" });
    box.focus();
    await user.keyboard(" ");
    expect(box).toBeChecked();
    expect(shown()).toEqual(["Send the estimate", "Pick a typeface", "Book the studio"]);
    expect(onItemsChange).toHaveBeenLastCalledWith([
      TASKS[0],
      { ...TASKS[1], done: true },
      TASKS[2],
    ]);

    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(shown()[0]).toBe("Send the estimate");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(shown()).toEqual(["Pick a typeface", "Book the studio", "Send the estimate"]);
    expect(box.closest("li")).toHaveAttribute("data-sunk");
    expect(box).toHaveFocus();
  });

  it("lifts an unticked task straight back to its place", async () => {
    const user = setup();
    render(<AnimatedChecklist defaultItems={TASKS} sortDone />);
    const box = screen.getByRole("checkbox", { name: "Book the studio" });
    box.focus();
    await user.keyboard(" ");
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);
    expect(box).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);
  });

  it("never moves a task unticked again before it settles", async () => {
    const user = setup();
    render(<AnimatedChecklist defaultItems={TASKS} sortDone />);
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown()).toEqual(["Send the estimate", "Pick a typeface", "Book the studio"]);
  });

  it("follows controlled changes, and settles each task on its own clock", async () => {
    function Controlled() {
      const [items, setItems] = useState(TASKS);
      return (
        <>
          <AnimatedChecklist items={items} onItemsChange={setItems} sortDone />
          <button
            type="button"
            onClick={() => {
              setItems((current) => current.map((item) => ({ ...item, done: false })));
            }}
          >
            Reset
          </button>
        </>
      );
    }
    const user = setup();
    render(<Controlled />);
    await user.click(screen.getByRole("checkbox", { name: "Send the estimate" }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    act(() => {
      vi.advanceTimersByTime(250);
    });
    // The first has settled; the second is still playing its tick.
    expect(shown()).toEqual(["Pick a typeface", "Book the studio", "Send the estimate"]);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);

    // Unticked from outside: every task lifts back to its place at once.
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);
  });

  it("keeps the order it was given without sortDone, and returns to it when turned off", async () => {
    const user = setup();
    const { rerender } = render(<AnimatedChecklist defaultItems={TASKS} />);
    await user.click(screen.getByRole("checkbox", { name: "Send the estimate" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);

    rerender(<AnimatedChecklist defaultItems={TASKS} sortDone />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(shown()).toEqual(["Pick a typeface", "Book the studio", "Send the estimate"]);

    rerender(<AnimatedChecklist defaultItems={TASKS} sortDone={false} />);
    expect(shown()).toEqual(["Book the studio", "Send the estimate", "Pick a typeface"]);
  });

  it("moves focus to the neighbour on screen after a removal", async () => {
    const user = userEvent.setup();
    render(<AnimatedChecklist defaultItems={TASKS} sortDone removable />);
    await user.click(screen.getByRole("button", { name: "Remove Pick a typeface" }));
    expect(screen.getByRole("checkbox", { name: "Book the studio" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Remove Book the studio" }));
    expect(screen.getByRole("checkbox", { name: "Send the estimate" })).toHaveFocus();
  });

  it("clears pending timers when it unmounts or a task goes away", async () => {
    const user = setup();
    const { unmount } = render(<AnimatedChecklist defaultItems={TASKS} sortDone removable />);
    await user.click(screen.getByRole("checkbox", { name: "Send the estimate" }));
    await user.click(screen.getByRole("button", { name: "Remove Send the estimate" }));
    await user.click(screen.getByRole("checkbox", { name: "Pick a typeface" }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("has no accessibility violations while sorting", async () => {
    const { container } = render(
      <AnimatedChecklist aria-label="Today" defaultItems={TASKS} sortDone size="lg" />,
    );
    await expectNoA11yViolations(container);
  });
});
