import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LogViewer, LogViewerRow, LogViewerToolbar } from "./log-viewer";
import {
  compileQuery,
  findMatches,
  segment,
  useLogStream,
  type LogLine,
  type VisibleLine,
} from "./log-stream";

const LINES: LogLine[] = [
  { id: "1", level: "info", message: "Server listening on 3000", timestamp: "10:00:01" },
  { id: "2", level: "warn", message: "Slow query took 1200ms", timestamp: "10:00:02" },
  {
    id: "3",
    level: "error",
    message: "Connection refused",
    timestamp: "10:00:03",
    fields: { host: "db-1", attempt: 3 },
  },
  { id: "4", level: "info", message: "Retrying connection", timestamp: "10:00:04" },
];

function visible(lines: LogLine[]): VisibleLine[] {
  return lines.map((line) => ({ ...line, matches: [] }));
}

describe("compileQuery", () => {
  it("escapes a substring so regex characters are literal", () => {
    const pattern = compileQuery("a.b", false);
    expect(pattern?.test("a.b")).toBe(true);
    pattern!.lastIndex = 0;
    expect(pattern?.test("axb")).toBe(false);
  });

  it("compiles a real pattern in regex mode", () => {
    const pattern = compileQuery("a.b", true);
    expect(pattern?.test("axb")).toBe(true);
  });

  it("returns null for an incomplete pattern rather than throwing", () => {
    // The query is typed a character at a time and spends most of its life
    // invalid. A viewer that crashes on "(" cannot be used.
    expect(compileQuery("(", true)).toBeNull();
    expect(compileQuery("[a-", true)).toBeNull();
  });

  it("returns null for an empty query", () => {
    expect(compileQuery("", false)).toBeNull();
  });
});

describe("findMatches", () => {
  it("finds every match, not only the first", () => {
    expect(findMatches("ab ab ab", compileQuery("ab", false))).toEqual([
      [0, 2],
      [3, 5],
      [6, 8],
    ]);
  });

  it("does not carry position between lines", () => {
    // A global regex keeps lastIndex across calls, which would skip matches in
    // every line after the first.
    const pattern = compileQuery("a", false);
    expect(findMatches("aaa", pattern)).toHaveLength(3);
    expect(findMatches("aaa", pattern)).toHaveLength(3);
  });

  it("terminates on a pattern that can match empty", () => {
    // "a*" matches the empty string at every position; without advancing
    // lastIndex by hand this never returns.
    const matches = findMatches("bbb", compileQuery("a*", true));
    expect(matches).toEqual([]);
  });

  it("returns nothing when there is no pattern", () => {
    expect(findMatches("anything", null)).toEqual([]);
  });
});

describe("segment", () => {
  it("splits into plain and matched parts", () => {
    expect(segment("hello world", [[6, 11]])).toEqual([
      { text: "hello ", match: false },
      { text: "world", match: true },
    ]);
  });

  it("keeps a match at the start", () => {
    expect(segment("abc", [[0, 1]])).toEqual([
      { text: "a", match: true },
      { text: "bc", match: false },
    ]);
  });

  it("returns the whole message when nothing matched", () => {
    expect(segment("abc", [])).toEqual([{ text: "abc", match: false }]);
  });
});

describe("useLogStream", () => {
  it("shows everything with no filter", () => {
    const { result } = renderHook(() => useLogStream({ lines: LINES }));
    expect(result.current.visible).toHaveLength(4);
  });

  it("filters by substring and records where it matched", () => {
    const { result } = renderHook(() => useLogStream({ lines: LINES }));

    act(() => {
      result.current.setQuery("connection");
    });

    expect(result.current.visible.map((line) => line.id)).toEqual(["3", "4"]);
    expect(result.current.visible[0]?.matches).toHaveLength(1);
  });

  it("filters case-insensitively", () => {
    const { result } = renderHook(() => useLogStream({ lines: LINES }));
    act(() => {
      result.current.setQuery("CONNECTION");
    });
    expect(result.current.visible).toHaveLength(2);
  });

  it("filters by level, and by several at once", () => {
    const { result } = renderHook(() => useLogStream({ lines: LINES }));

    act(() => {
      result.current.toggleLevel("info");
    });
    expect(result.current.visible.map((line) => line.id)).toEqual(["1", "4"]);

    act(() => {
      result.current.toggleLevel("error");
    });
    expect(result.current.visible.map((line) => line.id)).toEqual(["1", "3", "4"]);
  });

  it("combines a level filter with a query", () => {
    const { result } = renderHook(() => useLogStream({ lines: LINES }));

    act(() => {
      result.current.toggleLevel("info");
      result.current.setQuery("Retrying");
    });

    expect(result.current.visible.map((line) => line.id)).toEqual(["4"]);
  });

  describe("an invalid pattern", () => {
    it("is reported rather than swallowed", () => {
      const { result } = renderHook(() => useLogStream({ lines: LINES }));
      act(() => {
        result.current.setRegex(true);
        result.current.setQuery("(");
      });
      expect(result.current.invalidPattern).toBe(true);
    });

    it("hides nothing, because the reader has not finished typing", () => {
      // Filtering everything out mid-keystroke reads as "no matches" and sends
      // the reader looking for a problem that is not there.
      const { result } = renderHook(() => useLogStream({ lines: LINES }));
      act(() => {
        result.current.setRegex(true);
        result.current.setQuery("(");
      });
      expect(result.current.visible).toHaveLength(4);
    });

    it("is not reported for a valid pattern", () => {
      const { result } = renderHook(() => useLogStream({ lines: LINES }));
      act(() => {
        result.current.setRegex(true);
        result.current.setQuery("conn.*");
      });
      expect(result.current.invalidPattern).toBe(false);
    });
  });

  it("counts by level over the whole log, not the filtered view", () => {
    // The facet counts have to say what turning a facet on would reveal.
    const { result } = renderHook(() => useLogStream({ lines: LINES }));
    act(() => {
      result.current.setQuery("Connection refused");
    });

    expect(result.current.counts.get("info")).toBe(2);
    expect(result.current.visible).toHaveLength(1);
  });
});

describe("LogViewer", () => {
  it("names the region and marks it as a log", () => {
    render(<LogViewer lines={visible(LINES)} label="Build output" />);
    expect(screen.getByRole("log", { name: "Build output" })).toBeInTheDocument();
  });

  it("does not announce by default", () => {
    // role="log" implies polite. A console that reads every line aloud makes a
    // screen reader useless for anything else.
    render(<LogViewer lines={visible(LINES)} label="Build output" />);
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "off");
  });

  it("announces when asked to", () => {
    render(<LogViewer lines={visible(LINES)} label="Build output" announce />);
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
  });

  it("is focusable, so the log can be scrolled from the keyboard", () => {
    render(<LogViewer lines={visible(LINES)} label="Build output" />);
    expect(screen.getByRole("log")).toHaveAttribute("tabindex", "0");
  });

  it("says so when the filter excludes everything", () => {
    render(<LogViewer lines={[]} label="Build output" />);
    expect(screen.getByText(/No lines match/)).toBeInTheDocument();
  });

  describe("follow mode", () => {
    it("follows by default", () => {
      render(<LogViewer lines={visible(LINES)} label="Build output" />);
      expect(screen.getByText("Following")).toBeInTheDocument();
    });

    it("detaches when the reader scrolls up", () => {
      // Yanking someone back to the tail loses whatever they stopped to read.
      render(<LogViewer lines={visible(LINES)} label="Build output" />);
      const log = screen.getByRole("log");

      Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(log, "clientHeight", { value: 300, configurable: true });
      log.scrollTop = 100;
      fireEvent.scroll(log);

      expect(screen.getByRole("button", { name: "Jump to latest" })).toBeInTheDocument();
      expect(screen.queryByText("Following")).not.toBeInTheDocument();
    });

    it("re-attaches when the reader returns to the bottom", () => {
      render(<LogViewer lines={visible(LINES)} label="Build output" />);
      const log = screen.getByRole("log");

      Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(log, "clientHeight", { value: 300, configurable: true });
      log.scrollTop = 100;
      fireEvent.scroll(log);
      expect(screen.getByRole("button", { name: "Jump to latest" })).toBeInTheDocument();

      log.scrollTop = 700;
      fireEvent.scroll(log);
      expect(screen.getByText("Following")).toBeInTheDocument();
    });

    it("re-attaches from the jump button", async () => {
      const user = userEvent.setup();
      render(<LogViewer lines={visible(LINES)} label="Build output" />);
      const log = screen.getByRole("log");

      Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(log, "clientHeight", { value: 300, configurable: true });
      log.scrollTop = 0;
      fireEvent.scroll(log);

      await user.click(screen.getByRole("button", { name: "Jump to latest" }));
      expect(screen.getByText("Following")).toBeInTheDocument();
    });
  });

  describe("the way out of the virtual window", () => {
    it("offers a download when one is given", async () => {
      // Virtualized rows are not in the DOM, so assistive technology cannot
      // reach them. Without an escape the component is not honestly accessible.
      const onDownload = vi.fn();
      const user = userEvent.setup();
      render(<LogViewer lines={visible(LINES)} label="Build output" onDownload={onDownload} />);

      await user.click(screen.getByRole("button", { name: "Download full log" }));
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it("omits it when there is nothing to download", () => {
      render(<LogViewer lines={visible(LINES)} label="Build output" />);
      expect(screen.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <LogViewer lines={visible(LINES)} label="Build output" onDownload={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("LogViewerRow", () => {
  // Exercised directly: jsdom measures every box as zero, so the virtualizer
  // inside LogViewer renders no rows there. Row behaviour is verified here and
  // the virtualized container is verified in a browser.
  const line = (over: Partial<VisibleLine> = {}): VisibleLine => ({
    id: "1",
    level: "error",
    message: "Connection refused",
    timestamp: "10:00:03",
    matches: [],
    ...over,
  });

  it("writes the level in text, not only as a colour", () => {
    render(<LogViewerRow line={line()} />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows the timestamp as a time element", () => {
    const { container } = render(<LogViewerRow line={line()} />);
    expect(container.querySelector("time")?.textContent).toBe("10:00:03");
  });

  it("marks matches with mark, not just a background colour", () => {
    const { container } = render(
      <LogViewerRow line={line({ message: "Connection refused", matches: [[0, 10]] })} />,
    );

    const marks = [...container.querySelectorAll("mark")];
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe("Connection");
  });

  it("highlights every match in a line", () => {
    const { container } = render(
      <LogViewerRow
        line={line({
          message: "retry retry",
          matches: [
            [0, 5],
            [6, 11],
          ],
        })}
      />,
    );
    expect(container.querySelectorAll("mark")).toHaveLength(2);
  });

  it("offers expansion only when there are structured fields", () => {
    const { rerender } = render(<LogViewerRow line={line()} />);
    expect(screen.queryByRole("button", { name: "Fields" })).not.toBeInTheDocument();

    rerender(<LogViewerRow line={line({ fields: { host: "db-1" } })} />);
    expect(screen.getByRole("button", { name: "Fields" })).toBeInTheDocument();
  });

  it("reports expansion state and reveals the fields", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <LogViewerRow
        line={line({ fields: { host: "db-1", attempt: 3 } })}
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Fields" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <LogViewerRow
        line={line({ fields: { host: "db-1", attempt: 3 } })}
        expanded
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole("button", { name: "Hide fields" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("host")).toBeInTheDocument();
    expect(screen.getByText("db-1")).toBeInTheDocument();
  });

  it("renders a non-string field value readably", () => {
    render(<LogViewerRow line={line({ fields: { attempt: 3, ok: false } })} expanded />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("handles a line with no level or timestamp", () => {
    const { container } = render(
      <LogViewerRow line={{ id: "x", message: "plain", matches: [] }} />,
    );
    expect(screen.getByText("plain")).toBeInTheDocument();
    expect(container.querySelector("time")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <LogViewerRow line={line({ fields: { host: "db-1" } })} expanded onToggle={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("LogViewerToolbar", () => {
  function Toolbar(over: Partial<React.ComponentProps<typeof LogViewerToolbar>> = {}) {
    return (
      <LogViewerToolbar
        query=""
        onQueryChange={vi.fn()}
        regex={false}
        onRegexChange={vi.fn()}
        levels={new Set()}
        onToggleLevel={vi.fn()}
        counts={new Map([["info", 2] as const, ["error", 1] as const])}
        showing={3}
        total={3}
        {...over}
      />
    );
  }

  it("reports how much of the log is showing", () => {
    render(Toolbar({ showing: 2, total: 40 }));
    expect(screen.getByText("2 of 40 lines")).toBeInTheDocument();
  });

  it("shows a facet per level present, with its count", () => {
    render(Toolbar());
    expect(screen.getByRole("button", { name: /info 2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /error 1/ })).toBeInTheDocument();
  });

  it("does not show a facet for a level with no lines", () => {
    render(Toolbar());
    expect(screen.queryByRole("button", { name: /trace/ })).not.toBeInTheDocument();
  });

  it("reports facet state through aria-pressed", () => {
    render(Toolbar({ levels: new Set(["info"] as const) }));
    expect(screen.getByRole("button", { name: /info 2/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /error 1/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("says an incomplete pattern is incomplete", () => {
    render(Toolbar({ regex: true, query: "(", invalidPattern: true }));

    expect(screen.getByText(/Incomplete pattern/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("points the field at the explanation", () => {
    render(Toolbar({ regex: true, query: "(", invalidPattern: true }));

    const field = screen.getByRole("searchbox");
    expect(field).toHaveAccessibleDescription(/Incomplete pattern/);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(Toolbar());
    await expectNoA11yViolations(container);
  });
});
