import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { LogViewer, LogViewerToolbar } from "./log-viewer";
import { useLogStream, type LogLevel, type LogLine } from "./log-stream";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-3xl">
    <Story />
  </div>
);

const MESSAGES: { level: LogLevel; message: string; fields?: Record<string, unknown> }[] = [
  { level: "info", message: "Server listening on http://localhost:3000" },
  { level: "debug", message: "Resolved 782 modules in 412ms" },
  { level: "info", message: "GET /api/workspaces 200 in 34ms" },
  {
    level: "warn",
    message: "Slow query took 1240ms",
    fields: { query: "SELECT * FROM deals", ms: 1240 },
  },
  { level: "info", message: "GET /api/deals 200 in 61ms" },
  {
    level: "error",
    message: "Connection refused",
    fields: { host: "db-replica-1", attempt: 3, code: "ECONNREFUSED" },
  },
  { level: "info", message: "Retrying connection to db-replica-1" },
  { level: "debug", message: "Pool size 8, idle 2" },
  { level: "info", message: "POST /api/deals 201 in 89ms" },
  { level: "trace", message: "cache hit workspaces:acme" },
];

function makeLines(count: number, offset = 0): LogLine[] {
  return Array.from({ length: count }, (_, index) => {
    const source = MESSAGES[(index + offset) % MESSAGES.length];
    const seconds = (index + offset) % 60;
    return {
      id: `line-${String(index + offset)}`,
      level: source?.level,
      message: source?.message ?? "",
      fields: source?.fields,
      timestamp: `10:${String(Math.floor((index + offset) / 60) % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  });
}

const meta = {
  title: "Data/Log Viewer",
  component: LogViewer,
  decorators: [withWidth],
  args: { label: "Build output", lines: [] },
} satisfies Meta<typeof LogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole thing: facets, filtering with highlighted matches, expandable rows. */
export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: function Default() {
    const [lines] = useState(() => makeLines(400));
    const stream = useLogStream({ lines });

    return (
      <LogViewer label="Build output" lines={stream.visible} onDownload={() => undefined}>
        <LogViewerToolbar
          query={stream.query}
          onQueryChange={stream.setQuery}
          regex={stream.regex}
          onRegexChange={stream.setRegex}
          levels={stream.levels}
          onToggleLevel={stream.toggleLevel}
          counts={stream.counts}
          invalidPattern={stream.invalidPattern}
          showing={stream.visible.length}
          total={stream.total}
        />
      </LogViewer>
    );
  },
};

/**
 * Live. Scroll up and following detaches — because yanking you back to the tail
 * would lose whatever you stopped to read. Return to the bottom, or press Jump
 * to latest, and it re-attaches.
 */
export const Streaming: Story = {
  parameters: { controls: { disable: true } },
  render: function Streaming() {
    const [lines, setLines] = useState<LogLine[]>(() => makeLines(60));
    const stream = useLogStream({ lines });

    useEffect(() => {
      const timer = setInterval(() => {
        setLines((current) => [...current, ...makeLines(1, current.length)]);
      }, 450);
      return () => {
        clearInterval(timer);
      };
    }, []);

    return (
      <LogViewer label="Live output" lines={stream.visible} onDownload={() => undefined}>
        <LogViewerToolbar
          query={stream.query}
          onQueryChange={stream.setQuery}
          regex={stream.regex}
          onRegexChange={stream.setRegex}
          levels={stream.levels}
          onToggleLevel={stream.toggleLevel}
          counts={stream.counts}
          invalidPattern={stream.invalidPattern}
          showing={stream.visible.length}
          total={stream.total}
        />
      </LogViewer>
    );
  },
};

/**
 * Ten thousand lines. Only the visible rows are in the DOM, which is why the
 * download escape exists: assistive technology cannot reach what is not
 * rendered, and pretending the virtual window is the whole log would be a lie.
 */
export const ManyLines: Story = {
  parameters: { controls: { disable: true } },
  render: function ManyLines() {
    const [lines] = useState(() => makeLines(10_000));
    const stream = useLogStream({ lines });

    return (
      <LogViewer
        label="Full build log"
        lines={stream.visible}
        height={420}
        onDownload={() => undefined}
      >
        <LogViewerToolbar
          query={stream.query}
          onQueryChange={stream.setQuery}
          regex={stream.regex}
          onRegexChange={stream.setRegex}
          levels={stream.levels}
          onToggleLevel={stream.toggleLevel}
          counts={stream.counts}
          invalidPattern={stream.invalidPattern}
          showing={stream.visible.length}
          total={stream.total}
        />
      </LogViewer>
    );
  },
};

/**
 * Turn Regex on and type `(` — an incomplete pattern says so rather than
 * showing an empty log, which reads as "nothing matched" and sends you looking
 * for a problem that is not there.
 */
export const IncompletePattern: Story = {
  parameters: { controls: { disable: true } },
  render: function IncompletePattern() {
    const [lines] = useState(() => makeLines(120));
    const stream = useLogStream({ lines });

    useEffect(() => {
      stream.setRegex(true);
      stream.setQuery("conn(");
      // Set once, to land on the state worth showing.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <LogViewer label="Build output" lines={stream.visible}>
        <LogViewerToolbar
          query={stream.query}
          onQueryChange={stream.setQuery}
          regex={stream.regex}
          onRegexChange={stream.setRegex}
          levels={stream.levels}
          onToggleLevel={stream.toggleLevel}
          counts={stream.counts}
          invalidPattern={stream.invalidPattern}
          showing={stream.visible.length}
          total={stream.total}
        />
      </LogViewer>
    );
  },
};

/** Nothing matched. Said plainly, rather than an empty box. */
export const NoMatches: Story = {
  args: { lines: [], label: "Build output" },
};
