import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TodoTower, type TodoItem } from "./todo-tower";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const TODOS: TodoItem[] = [
  { id: "nadia", label: "Reply to Nadia" },
  { id: "domain", label: "Renew the domain" },
  { id: "flights", label: "Book the flights" },
];

function reduce(matches: boolean) {
  motionPreference.reduced = matches;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  motionPreference.reduced = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function rows() {
  return document.querySelectorAll<HTMLElement>('[data-slot="todo-tower-row"]');
}

describe("TodoTower", () => {
  it("renders a labelled list of cards stacked from the floor", () => {
    render(<TodoTower defaultItems={TODOS} />);
    expect(screen.getByRole("list", { name: "To-dos" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Done: Reply to Nadia" })).toBeInTheDocument();
    // Top card sits two pitches up, the bottom one on the floor.
    expect(rows()[0]!.style.getPropertyValue("--todo-tower-y")).toBe("-92px");
    expect(rows()[2]!.style.getPropertyValue("--todo-tower-y")).toBe("0px");
  });

  it("flicks a checked card away, then removes it, announces and refocuses", () => {
    vi.useFakeTimers();
    reduce(false);
    const onComplete = vi.fn();
    const onItemsChange = vi.fn();
    render(
      <TodoTower defaultItems={TODOS} onComplete={onComplete} onItemsChange={onItemsChange} />,
    );
    const done = screen.getByRole("button", { name: "Done: Renew the domain" });
    fireEvent.click(done);
    expect(done).toHaveAttribute("aria-pressed", "true");
    expect(done.closest('[data-slot="todo-tower-card"]')).toHaveAttribute("data-out");
    fireEvent.click(done);
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(TODOS[1]);
    expect(onItemsChange).toHaveBeenCalledWith([TODOS[0], TODOS[2]]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Completed: Renew the domain");
    expect(screen.getByRole("button", { name: "Done: Book the flights" })).toHaveFocus();
  });

  it("removes at once under reduced motion, from the keyboard", async () => {
    reduce(true);
    const user = userEvent.setup();
    render(<TodoTower defaultItems={TODOS.slice(0, 1)} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("list")).toHaveFocus();
  });

  it("re-drops the stack when the last card is done and it loops", () => {
    reduce(true);
    render(<TodoTower defaultItems={TODOS.slice(0, 1)} loop />);
    fireEvent.click(screen.getByRole("button", { name: "Done: Reply to Nadia" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("follows controlled items and only reports completion", () => {
    reduce(true);
    function Controlled() {
      const [items, setItems] = useState(TODOS);
      return <TodoTower items={items} onItemsChange={setItems} />;
    }
    const { unmount } = render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Done: Book the flights" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    unmount();
    render(<TodoTower items={TODOS} />);
    fireEvent.click(screen.getByRole("button", { name: "Done: Book the flights" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("drags a card and sways the cards above it, then springs home", async () => {
    reduce(false);
    render(<TodoTower defaultItems={TODOS} />);
    const [top, middle, bottom] = [...rows()];
    fireEvent.pointerDown(middle!, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    expect(middle).toHaveAttribute("data-held");
    const tower = document.querySelector<HTMLElement>('[data-slot="todo-tower"]')!;
    fireEvent.pointerMove(tower, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(tower, { pointerId: 1, clientX: 160, clientY: 90 });
    const body = (row: HTMLElement) => (row.firstElementChild as HTMLElement).style.transform;
    await waitFor(() => {
      expect(body(middle!)).toContain("translateX(");
    });
    await waitFor(() => {
      expect(body(top!)).toContain("translateX(");
    });
    expect(body(bottom!)).not.toContain("translateX(");
    fireEvent.pointerUp(tower, { pointerId: 2 });
    fireEvent.pointerUp(tower, { pointerId: 1 });
    await waitFor(
      () => {
        expect(middle).not.toHaveAttribute("data-held");
      },
      { timeout: 3000 },
    );
  });

  it("does not drag under reduced motion, with another button, or from the check", () => {
    reduce(true);
    render(<TodoTower defaultItems={TODOS} />);
    const middle = rows()[1]!;
    fireEvent.pointerDown(middle, { pointerId: 1, button: 0 });
    expect(middle).not.toHaveAttribute("data-held");
    motionPreference.reduced = false;
    fireEvent.pointerDown(middle, { pointerId: 1, button: 2 });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Done: Renew the domain" }), {
      pointerId: 1,
      button: 0,
    });
    expect(middle).not.toHaveAttribute("data-held");
  });

  it("clears pending flicks on unmount", () => {
    vi.useFakeTimers();
    reduce(false);
    const onComplete = vi.fn();
    const { unmount } = render(<TodoTower defaultItems={TODOS} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Done: Reply to Nadia" }));
    unmount();
    act(() => {
      vi.runAllTimers();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("takes custom labels", () => {
    reduce(true);
    render(
      <TodoTower
        defaultItems={TODOS.slice(0, 1)}
        label="Chores"
        checkLabel={(text) => `Finish ${text}`}
        completedLabel={(text) => `${text} finished`}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Finish Reply to Nadia" }));
    expect(screen.getByRole("status")).toHaveTextContent("Reply to Nadia finished");
    expect(screen.getByRole("list", { name: "Chores" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <TodoTower
        ref={ref}
        defaultItems={TODOS}
        className="w-full"
        data-testid="tower"
        fill="dark"
        stroke
      />,
    );
    const tower = screen.getByTestId("tower");
    expect(ref.current).toBe(tower);
    expect(tower).toHaveClass("w-full");
    expect(tower).not.toHaveClass("w-[18.75rem]");
    expect(tower).toHaveStyle({ height: "158px" });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TodoTower defaultItems={TODOS} />);
    await expectNoA11yViolations(container);
  });
});
