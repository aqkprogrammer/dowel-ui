import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DiffViewer, DiffViewerToolbar } from "./diff-viewer";
import {
  buildDiff,
  countChanges,
  groupIntoHunks,
  toSplitRows,
  type DiffRow,
} from "./diff-model";

const BEFORE = ["one", "two", "three", "four", "five"].join("\n");
const AFTER = ["one", "two", "THREE", "four", "five"].join("\n");

function rows(hunks: ReturnType<typeof buildDiff>): DiffRow[] {
  return hunks.flatMap((hunk) => hunk.rows);
}

describe("buildDiff", () => {
  it("returns no hunks when nothing changed", () => {
    expect(buildDiff(BEFORE, BEFORE)).toEqual([]);
  });

  it("reports a changed line as a removal and an addition", () => {
    const kinds = rows(buildDiff(BEFORE, AFTER)).map((row) => row.kind);
    expect(kinds).toContain("removed");
    expect(kinds).toContain("added");
  });

  it("numbers lines against their own side", () => {
    const all = rows(buildDiff("a\nb", "a\nB"));

    const removed = all.find((row) => row.kind === "removed");
    const added = all.find((row) => row.kind === "added");

    expect(removed?.before).toBe(2);
    expect(removed?.after).toBeUndefined();
    expect(added?.after).toBe(2);
    expect(added?.before).toBeUndefined();
  });

  it("does not treat a trailing newline as an extra line", () => {
    expect(
      rows(buildDiff("a\nb\n", "a\nB\n")).filter((r) => r.kind !== "context"),
    ).toHaveLength(2);
  });

  it("does not report a change when only the trailing newline differs", () => {
    // jsdiff's line tokens carry their newline, so without normalising this
    // reads as the last line being removed and re-added.
    expect(buildDiff("a\nb", "a\nb\n")).toEqual([]);
  });

  it("handles an addition at the end of the file", () => {
    const all = rows(buildDiff("a", "a\nb"));
    const added = all.filter((row) => row.kind === "added");
    expect(added.map((row) => row.content)).toEqual(["b"]);
  });

  it("handles a removal at the start of the file", () => {
    const all = rows(buildDiff("a\nb", "b"));
    const removed = all.filter((row) => row.kind === "removed");
    expect(removed.map((row) => row.content)).toEqual(["a"]);
  });

  describe("word-level pairing", () => {
    it("marks only the words that changed", () => {
      const all = rows(buildDiff("the quick brown fox", "the slow brown fox"));

      const added = all.find((row) => row.kind === "added");
      const changed = added?.segments?.filter((segment) => segment.changed) ?? [];

      expect(changed.map((segment) => segment.text.trim())).toEqual(["slow"]);
    });

    it("gives the removed line its own segments", () => {
      const all = rows(buildDiff("the quick fox", "the slow fox"));

      const removed = all.find((row) => row.kind === "removed");
      const changed = removed?.segments?.filter((segment) => segment.changed) ?? [];

      expect(changed.map((segment) => segment.text.trim())).toEqual(["quick"]);
    });

    it("leaves an unpaired line without segments", () => {
      // Nothing to compare against, and marking the whole line as changed
      // would be noise rather than information.
      const all = rows(buildDiff("a", "a\nbrand new line"));
      const added = all.find((row) => row.content === "brand new line");
      expect(added?.segments).toBeUndefined();
    });

    it("pairs only as far as the runs line up", () => {
      // Two removals against one addition: the first pairs, the second cannot.
      const all = rows(buildDiff("aaa\nbbb", "aax"));
      const removed = all.filter((row) => row.kind === "removed");

      expect(removed[0]?.segments).toBeDefined();
      expect(removed[1]?.segments).toBeUndefined();
    });

    it("can be turned off", () => {
      const all = rows(buildDiff("the quick fox", "the slow fox", { words: false }));
      expect(all.every((row) => row.segments === undefined)).toBe(true);
    });
  });

  describe("context", () => {
    it("keeps the requested number of unchanged lines around a change", () => {
      const long = Array.from({ length: 40 }, (_, i) => `line ${String(i)}`);
      const changed = [...long];
      changed[20] = "CHANGED";

      const hunks = buildDiff(long.join("\n"), changed.join("\n"), { context: 2 });
      const context = hunks[0]?.rows.filter((row) => row.kind === "context") ?? [];

      expect(context).toHaveLength(4);
    });

    it("reports how many unchanged lines it hid", () => {
      const long = Array.from({ length: 40 }, (_, i) => `line ${String(i)}`);
      const changed = [...long];
      changed[20] = "CHANGED";

      const hunks = buildDiff(long.join("\n"), changed.join("\n"), { context: 2 });
      expect(hunks[0]?.skippedBefore).toBe(18);
    });

    it("merges two changes whose context overlaps into one hunk", () => {
      // Otherwise the reader gets two hunks separated by nothing at all.
      const long = Array.from({ length: 30 }, (_, i) => `line ${String(i)}`);
      const changed = [...long];
      changed[10] = "A";
      changed[12] = "B";

      const hunks = buildDiff(long.join("\n"), changed.join("\n"), { context: 3 });
      expect(hunks).toHaveLength(1);
    });

    it("keeps distant changes as separate hunks", () => {
      const long = Array.from({ length: 60 }, (_, i) => `line ${String(i)}`);
      const changed = [...long];
      changed[5] = "A";
      changed[50] = "B";

      const hunks = buildDiff(long.join("\n"), changed.join("\n"), { context: 2 });
      expect(hunks).toHaveLength(2);
    });
  });
});

describe("groupIntoHunks", () => {
  it("returns nothing when every row is context", () => {
    const only: DiffRow[] = [{ kind: "context", content: "a", before: 1, after: 1 }];
    expect(groupIntoHunks(only, 3)).toEqual([]);
  });
});

describe("toSplitRows", () => {
  it("puts a context line on both sides", () => {
    const pairs = toSplitRows([{ kind: "context", content: "a", before: 1, after: 1 }]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.left?.content).toBe("a");
    expect(pairs[0]?.right?.content).toBe("a");
  });

  it("lays a removal alongside its replacement rather than above it", () => {
    // In document order every removal precedes every addition, which is the
    // unified view wearing two columns.
    const pairs = toSplitRows([
      { kind: "removed", content: "old", before: 1 },
      { kind: "added", content: "new", after: 1 },
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.left?.content).toBe("old");
    expect(pairs[0]?.right?.content).toBe("new");
  });

  it("leaves a gap when one side has fewer lines", () => {
    const pairs = toSplitRows([
      { kind: "removed", content: "a", before: 1 },
      { kind: "removed", content: "b", before: 2 },
      { kind: "added", content: "c", after: 1 },
    ]);

    expect(pairs).toHaveLength(2);
    expect(pairs[1]?.left?.content).toBe("b");
    expect(pairs[1]?.right).toBeNull();
  });

  it("handles an addition with no removal at all", () => {
    const pairs = toSplitRows([{ kind: "added", content: "new", after: 1 }]);
    expect(pairs[0]?.left).toBeNull();
    expect(pairs[0]?.right?.content).toBe("new");
  });
});

describe("countChanges", () => {
  it("counts additions and removals across hunks", () => {
    expect(countChanges(buildDiff(BEFORE, AFTER))).toEqual({ added: 1, removed: 1 });
  });
});

describe("DiffViewer", () => {
  const hunks = buildDiff(BEFORE, AFTER);

  it("names the file and summarises the change before it is read", () => {
    render(<DiffViewer hunks={hunks} label="src/app.ts" />);

    expect(screen.getByText("src/app.ts")).toBeInTheDocument();
    expect(screen.getByText(/1 lines added, 1 removed/)).toBeInTheDocument();
  });

  it("says so when there is nothing to show", () => {
    render(<DiffViewer hunks={[]} label="src/app.ts" />);
    expect(screen.getByText("No changes.")).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("is a table, not a grid", () => {
      // role="grid" promises cell-by-cell arrow navigation that does not exist
      // and would make no sense for reading code.
      const { container } = render(<DiffViewer hunks={hunks} label="src/app.ts" />);

      expect(container.querySelector("table")).toBeInTheDocument();
      expect(container.querySelector("[role='grid']")).not.toBeInTheDocument();
    });

    it("states each row's kind in text", () => {
      render(<DiffViewer hunks={hunks} label="src/app.ts" />);

      expect(screen.getAllByText(/^Added:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/^Removed:/).length).toBeGreaterThan(0);
    });

    it("hides line numbers, which would otherwise precede every line", () => {
      const { container } = render(<DiffViewer hunks={hunks} label="src/app.ts" />);
      const numberCells = [...container.querySelectorAll("td")].filter((cell) =>
        cell.className.includes("tabular-nums"),
      );
      expect(numberCells.every((cell) => cell.getAttribute("aria-hidden") === "true")).toBe(
        true,
      );
    });

    it("marks changed words with mark elements", () => {
      const { container } = render(
        <DiffViewer hunks={buildDiff("the quick fox", "the slow fox")} label="a.txt" />,
      );
      expect(container.querySelectorAll("mark").length).toBeGreaterThan(0);
    });

    it("has no violations", async () => {
      const { container } = render(
        <DiffViewer hunks={hunks} label="src/app.ts" onDecision={vi.fn()} />,
      );
      await expectNoA11yViolations(container);
    });
  });

  describe("hunk decisions", () => {
    it("offers no controls unless a handler is given", () => {
      render(<DiffViewer hunks={hunks} label="src/app.ts" />);
      expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    });

    it("reports the hunk and the decision", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<DiffViewer hunks={hunks} label="src/app.ts" onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Accept" }));
      expect(onDecision).toHaveBeenCalledWith("hunk-0", "accepted");
    });

    it("is controlled — the component decides nothing itself", async () => {
      // It renders and reports; applying a change is the application's job.
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<DiffViewer hunks={hunks} label="src/app.ts" onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Accept" }));

      expect(screen.getByRole("button", { name: "Accept" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByText("Not decided")).toBeInTheDocument();
    });

    it("reflects a decision it is given", () => {
      render(
        <DiffViewer
          hunks={hunks}
          label="src/app.ts"
          decisions={{ "hunk-0": "accepted" }}
          onDecision={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: "Accept" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Accepted")).toBeInTheDocument();
    });

    it("states the decision in words, not only by dimming", () => {
      render(
        <DiffViewer
          hunks={hunks}
          label="src/app.ts"
          decisions={{ "hunk-0": "rejected" }}
          onDecision={vi.fn()}
        />,
      );
      expect(screen.getByText("Rejected")).toBeInTheDocument();
    });
  });

  describe("split view", () => {
    it("renders both sides on one row", () => {
      const { container } = render(
        <DiffViewer hunks={buildDiff("old", "new")} label="a.txt" view="split" />,
      );

      const row = container.querySelector("[data-slot='diff-row']");
      expect(within(row as HTMLElement).getByText(/Removed:/)).toBeInTheDocument();
      expect(within(row as HTMLElement).getByText(/Added:/)).toBeInTheDocument();
    });

    it("hides the empty half of an uneven pair", () => {
      const { container } = render(
        <DiffViewer hunks={buildDiff("a\nb", "c")} label="a.txt" view="split" />,
      );
      // The padding cell is not a blank line of code and must not be read.
      const hidden = container.querySelectorAll("td[aria-hidden='true'].bg-muted\\/20");
      expect(hidden.length).toBeGreaterThan(0);
    });

    it("has no violations", async () => {
      const { container } = render(
        <DiffViewer hunks={buildDiff("a\nb", "c")} label="a.txt" view="split" />,
      );
      await expectNoA11yViolations(container);
    });
  });

  it("reports how many unchanged lines it hid", () => {
    const long = Array.from({ length: 40 }, (_, i) => `line ${String(i)}`);
    const changed = [...long];
    changed[20] = "CHANGED";

    render(
      <DiffViewer
        hunks={buildDiff(long.join("\n"), changed.join("\n"), { context: 2 })}
        label="a.txt"
      />,
    );

    expect(screen.getByText(/18 unchanged lines hidden/)).toBeInTheDocument();
  });
});

describe("DiffViewerToolbar", () => {
  it("reports which view is active", () => {
    render(<DiffViewerToolbar view="unified" onViewChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "unified" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "split" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports a change", async () => {
    const onViewChange = vi.fn();
    const user = userEvent.setup();
    render(<DiffViewerToolbar view="unified" onViewChange={onViewChange} />);

    await user.click(screen.getByRole("button", { name: "split" }));
    expect(onViewChange).toHaveBeenCalledWith("split");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<DiffViewerToolbar view="unified" onViewChange={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});
