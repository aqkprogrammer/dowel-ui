import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  MemoryInspector,
  countMemories,
  describeMemoryCount,
  formatMemoryDate,
  groupMemories,
  isoTime,
  matchesMemory,
  quoteMemory,
  sortMemories,
  type Memory,
  type MemoryInspectorProps,
} from "./memory-inspector";
import { UndoWindows } from "./undo-window";

const MEMORIES: Memory[] = [
  {
    id: "m1",
    text: "Prefers metric units.",
    source: { label: "Chat on 3 Sep", href: "/chats/1" },
    createdAt: Date.UTC(2026, 8, 3, 23, 30),
    lastUsedAt: Date.UTC(2026, 8, 20, 9),
    scope: "Work",
  },
  { id: "m2", text: "Is vegetarian.", source: { label: "Recipe planning" }, pinned: true },
  { id: "m3", text: "Works on the Dowel UI library.", scope: "Work" },
];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Holds the memories the way an application would, and reports what it was asked. */
function Harness({
  initial = MEMORIES,
  onEdit,
  onForget,
  onPin,
  ...props
}: Partial<MemoryInspectorProps> & { initial?: Memory[] }) {
  const [memories, setMemories] = useState(initial);
  return (
    <MemoryInspector
      memories={memories}
      onEdit={(id, text) => {
        onEdit?.(id, text);
        setMemories((list) => list.map((m) => (m.id === id ? { ...m, text } : m)));
      }}
      onForget={(ids) => {
        onForget?.(ids);
        setMemories((list) => list.filter((m) => !ids.includes(m.id)));
      }}
      onPin={(id, pinned) => {
        onPin?.(id, pinned);
        setMemories((list) => list.map((m) => (m.id === id ? { ...m, pinned } : m)));
      }}
      {...props}
    />
  );
}

function row(text: string): HTMLElement {
  const item = screen.getByText(text).closest("li");
  if (!item) throw new Error(`No row for ${text}`);
  return item;
}

/**
 * Fake timers that still let Testing Library's own zero-length waits resolve.
 * The clock also creeps with real time, so windows are asserted with a margin.
 */
function timed() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

describe("memory model", () => {
  it("matches on text and source, ignoring case", () => {
    expect(matchesMemory(MEMORIES[0]!, "METRIC")).toBe(true);
    expect(matchesMemory(MEMORIES[1]!, "recipe")).toBe(true);
    expect(matchesMemory(MEMORIES[2]!, "recipe")).toBe(false);
    expect(matchesMemory(MEMORIES[2]!, "  ")).toBe(true);
  });

  it("puts pinned first and otherwise keeps the order given", () => {
    expect(sortMemories(MEMORIES).map((m) => m.id)).toEqual(["m2", "m1", "m3"]);
  });

  it("groups by scope in order of first appearance", () => {
    const groups = groupMemories([...MEMORIES, { id: "m4", text: "x", scope: "" }]);
    expect(groups.map((g) => g.label)).toEqual(["Work", "General"]);
    expect(groups[1]!.memories.map((m) => m.id)).toEqual(["m2", "m4"]);
  });

  it("formats dates in UTC, so server and browser agree", () => {
    expect(formatMemoryDate(Date.UTC(2026, 8, 3, 23, 30))).toBe("3 Sep 2026");
    expect(formatMemoryDate(Number.NaN)).toBe("");
    expect(isoTime(Date.UTC(2026, 0, 1))).toBe("2026-01-01T00:00:00.000Z");
    expect(isoTime(Number.NaN)).toBeUndefined();
    expect(isoTime(undefined)).toBeUndefined();
  });

  it("counts in words", () => {
    expect(countMemories(1)).toBe("1 memory");
    expect(describeMemoryCount("Claude", 12)).toBe("Claude remembers 12 things");
    expect(describeMemoryCount("Claude", 1)).toBe("Claude remembers 1 thing");
    expect(describeMemoryCount("Claude", 0)).toBe("Claude doesn't remember anything");
  });

  it("quotes a memory short enough to repeat, cutting at a word", () => {
    expect(quoteMemory("Is vegetarian.")).toBe("“Is vegetarian.”");
    expect(quoteMemory("one two three four five", 12)).toBe("“one two…”");
    expect(quoteMemory("abcdefghijklmnop", 8)).toBe("“abcdefgh…”");
  });
});

describe("UndoWindows", () => {
  it("waits while held and resumes with the time that was left", () => {
    vi.useFakeTimers();
    const expire = vi.fn();
    const windows = new UndoWindows();
    windows.open("a", ["1"], 1000, expire);
    vi.advanceTimersByTime(600);
    windows.hold("a", "focus");
    windows.hold("a", "pointer");
    vi.advanceTimersByTime(5000);
    windows.release("a", "focus");
    vi.advanceTimersByTime(5000);
    expect(expire).not.toHaveBeenCalled();
    windows.release("a", "pointer");
    vi.advanceTimersByTime(399);
    expect(expire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it("closes without expiring, and closes everything at once", () => {
    vi.useFakeTimers();
    const expire = vi.fn();
    const windows = new UndoWindows();
    windows.open("a", ["1"], 1000, expire);
    windows.open("b", ["2", "3"], 1000, expire);
    expect(windows.close("a")).toEqual(["1"]);
    expect(windows.close("a")).toBeUndefined();
    expect(windows.closeAll()).toEqual(["2", "3"]);
    vi.advanceTimersByTime(2000);
    expect(expire).not.toHaveBeenCalled();
  });
});

describe("MemoryInspector", () => {
  it("is a section named by how much it remembers", () => {
    const { rerender } = render(<MemoryInspector memories={MEMORIES} />);
    expect(
      screen.getByRole("region", { name: "The assistant remembers 3 things" }),
    ).toBeInTheDocument();
    rerender(<MemoryInspector memories={MEMORIES.slice(0, 1)} agentName="Claude" />);
    expect(
      screen.getByRole("heading", { name: "Claude remembers 1 thing" }),
    ).toBeInTheDocument();
  });

  it("says when there is nothing, and offers no search", () => {
    render(<MemoryInspector memories={[]} onForget={() => undefined} />);
    expect(screen.getByRole("heading")).toHaveTextContent("doesn't remember anything");
    expect(screen.getByText("Nothing remembered yet")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists pinned memories first and says so in words", () => {
    render(<Harness />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.dataset.memoryId)).toEqual(["m2", "m1", "m3"]);
    expect(items[0]).toHaveTextContent("Pinned");
    expect(within(items[0]!).getByRole("button", { name: "Pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("names each memory's actions by the memory", () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: "Prefers metric units." });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Edit", "Pin", "Forget"]);
  });

  it("says where each memory came from, as a link when there is one", () => {
    render(<MemoryInspector memories={MEMORIES} />);
    expect(screen.getByRole("link", { name: "Chat on 3 Sep" })).toHaveAttribute(
      "href",
      "/chats/1",
    );
    expect(row("Is vegetarian.")).toHaveTextContent("From Recipe planning");
    expect(row("Prefers metric units.")).toHaveTextContent("Work");
  });

  it("shows dates that cannot differ between server and browser", () => {
    render(<MemoryInspector memories={MEMORIES} />);
    const item = row("Prefers metric units.");
    expect(item).toHaveTextContent("Added 3 Sep 2026");
    expect(item).toHaveTextContent("Last used 20 Sep 2026");
    expect(item.querySelector("time")).toHaveAttribute("datetime", "2026-09-03T23:30:00.000Z");
  });

  it("formats time as asked", () => {
    render(
      <MemoryInspector memories={MEMORIES} formatTime={(ms) => (ms > 0 ? "recently" : "")} />,
    );
    const times = row("Prefers metric units.").querySelectorAll("time");
    expect([...times].map((time) => time.parentElement?.textContent)).toEqual([
      "Added recently",
      "Last used recently",
    ]);
  });

  it("filters by text and source, and announces the count once typing pauses", async () => {
    const user = timed();
    render(<Harness />);
    const status = screen.getByRole("status");
    await user.type(screen.getByRole("searchbox", { name: "Search memories" }), "recipe");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Showing 1 of 3.")).toHaveAttribute("aria-hidden", "true");
    expect(status).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(status).toHaveTextContent("Showing 1 of 3.");

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zebra");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(status).toHaveTextContent("No memories match “zebra”.");
  });

  it("edits in place, saves trimmed text and returns focus to Edit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<Harness onEdit={onEdit} />);
    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Edit",
      }),
    );
    const field = screen.getByRole("textbox", { name: "Memory" });
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, "  Is vegan.  ");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith("m2", "Is vegan.");
    const group = screen.getByRole("group", { name: "Is vegan." });
    expect(within(group).getByRole("button", { name: "Edit" })).toHaveFocus();
  });

  it("cancels an edit with Escape, and saves with Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<Harness onEdit={onEdit} />);
    // The actions are replaced while editing, so Edit is found afresh each time.
    const edit = () =>
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Edit",
      });
    await user.click(edit());
    await user.type(screen.getByRole("textbox"), " Mostly.");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(edit()).toHaveFocus();
    expect(onEdit).not.toHaveBeenCalled();

    await user.click(edit());
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(edit()).toHaveFocus();

    await user.click(edit());
    await user.type(screen.getByRole("textbox"), " Mostly.");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onEdit).toHaveBeenCalledWith("m2", "Is vegetarian. Mostly.");
  });

  it("refuses an empty memory and says why", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<Harness onEdit={onEdit} />);
    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Edit",
      }),
    );
    const field = screen.getByRole("textbox");
    await user.clear(field);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(
      "A memory can't be empty. To remove it, use Forget.",
    );
    await user.type(field, "x");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("pins and unpins, keeping focus on Pin as the memory moves", async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    render(<Harness onPin={onPin} />);
    const pin = within(
      screen.getByRole("group", { name: "Works on the Dowel UI library." }),
    ).getByRole("button", { name: "Pin" });
    expect(pin).toHaveAttribute("aria-pressed", "false");
    await user.click(pin);
    expect(onPin).toHaveBeenCalledWith("m3", true);
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("data-memory-id", "m3");
    const moved = within(row("Works on the Dowel UI library.")).getByRole("button", {
      name: "Pin",
    });
    expect(moved).toHaveAttribute("aria-pressed", "true");
    expect(moved).toHaveFocus();
  });

  it("hides a forgotten memory at once and forgets it when the window closes", async () => {
    const user = timed();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} />);
    await user.click(
      within(screen.getByRole("group", { name: "Prefers metric units." })).getByRole("button", {
        name: "Forget",
      }),
    );
    expect(screen.queryByText("Prefers metric units.")).not.toBeInTheDocument();
    expect(screen.getByText("Forgot “Prefers metric units.”")).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("remembers 2 things");
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toHaveFocus();
    expect(undo).toHaveAccessibleDescription("Forgot “Prefers metric units.”");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onForget).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onForget).toHaveBeenCalledWith(["m1"]);
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    // The next memory's first action, where the forgotten one used to be.
    expect(
      within(screen.getByRole("group", { name: "Works on the Dowel UI library." })).getByRole(
        "button",
        { name: "Edit" },
      ),
    ).toHaveFocus();
  });

  it("brings a memory back with Undo and never forgets it", async () => {
    const user = timed();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} />);
    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Forget",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Undo" }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onForget).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Forget",
      }),
    ).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Restored “Is vegetarian.”");
  });

  it("holds the window while keyboard focus or the pointer is on Undo", async () => {
    const user = timed();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} />);
    const forget = within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole(
      "button",
      { name: "Forget" },
    );
    forget.focus();
    await user.keyboard("{Enter}");
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onForget).not.toHaveBeenCalled();

    fireEvent.pointerEnter(undo);
    await user.tab();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onForget).not.toHaveBeenCalled();
    fireEvent.pointerLeave(undo);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onForget).toHaveBeenCalledWith(["m2"]);
  });

  it("forgets what is still waiting when it unmounts", async () => {
    const user = timed();
    const onForget = vi.fn();
    const { unmount } = render(<Harness onForget={onForget} />);
    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Forget",
      }),
    );
    unmount();
    expect(onForget).toHaveBeenCalledWith(["m2"]);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onForget).toHaveBeenCalledTimes(1);
  });

  it("forgets at once when there is no window", async () => {
    const user = userEvent.setup();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} forgetDelayMs={0} />);
    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Forget",
      }),
    );
    expect(onForget).toHaveBeenCalledWith(["m2"]);
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Prefers metric units." })).getByRole("button", {
        name: "Edit",
      }),
    ).toHaveFocus();
  });

  it("asks before forgetting everything, in place", async () => {
    const user = timed();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} />);
    const trigger = screen.getByRole("button", { name: "Forget all" });
    await user.click(trigger);
    const confirm = screen.getByRole("group", {
      name: "Forget all 3 memories? 1 of them is pinned.",
    });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: /Forget all/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forget all" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Forget all" }));
    await user.click(screen.getByRole("button", { name: "Forget 3" }));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("Forgot 3 memories")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Forget all" })).toHaveFocus();
    expect(onForget).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Forget all" }));
    await user.click(screen.getByRole("button", { name: "Forget 3" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onForget).toHaveBeenCalledWith(["m2", "m1", "m3"]);
    expect(screen.getByText("Nothing remembered yet")).toBeInTheDocument();
  });

  it("forgets only what the search shows", async () => {
    const user = timed();
    const onForget = vi.fn();
    render(<Harness onForget={onForget} />);
    await user.type(screen.getByRole("searchbox"), "dowel");
    await user.click(screen.getByRole("button", { name: "Forget 1 shown" }));
    expect(
      screen.getByRole("group", { name: "Forget the 1 memory shown?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Forget it" }));
    expect(screen.getByText("Forgot “Works on the Dowel UI library.”")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onForget).toHaveBeenCalledWith(["m3"]);
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("offers no actions when read-only, or without their handlers", () => {
    const { rerender } = render(<Harness readOnly />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    rerender(<MemoryInspector memories={MEMORIES} onPin={() => undefined} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Pin",
      "Pin",
      "Pin",
    ]);
  });

  it("groups by scope under headings that name each list", () => {
    render(<Harness groupBy="scope" />);
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "Work",
      "General",
    ]);
    const work = screen.getByRole("list", { name: "Work" });
    expect(within(work).getAllByRole("listitem")).toHaveLength(2);
    // The heading already says the scope, so the row does not repeat it.
    expect(row("Prefers metric units.")).not.toHaveTextContent("Work");
  });

  it("lets className override its own utilities", () => {
    render(<MemoryInspector memories={MEMORIES} className="p-2" />);
    const region = screen.getByRole("region");
    expect(region).toHaveClass("p-2");
    expect(region).not.toHaveClass("p-4");
  });

  it("has a plain variant with no chrome", () => {
    render(<MemoryInspector memories={MEMORIES} variant="plain" />);
    expect(screen.getByRole("region")).not.toHaveClass("border");
  });

  it("forwards ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<MemoryInspector ref={ref} memories={MEMORIES} data-testid="memories" />);
    expect(ref.current).toBe(screen.getByTestId("memories"));
  });

  it("has no detectable accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness groupBy="scope" />);
    await expectNoA11yViolations(container);

    await user.click(
      within(screen.getByRole("group", { name: "Is vegetarian." })).getByRole("button", {
        name: "Edit",
      }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "Prefers metric units." })).getByRole("button", {
        name: "Forget",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Forget all" }));
    await expectNoA11yViolations(container);
  });
});
