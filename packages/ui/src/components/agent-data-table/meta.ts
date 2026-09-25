import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-data-table",
  title: "Agent Data Table",
  description:
    "Offers a TanStack table's own controls to an agent — read, sort, search, filter, select, page — through the same API the table's controls call.",
  category: "ai",
  status: "experimental",
  dependencies: ["@tanstack/react-table"],
  registryDependencies: ["agent-surface"],
  files: ["agent-data-table.tsx"],
  a11y:
    "Adds no interface of its own. Every tool calls the table's own API, so an agent's sort is announced by " +
    "the column header's aria-sort, its page change by the pagination's live region, and its selection by " +
    "the rows' selected state, exactly as a person's would be. Tools exist only for features the table has, " +
    "so an agent is never offered an action whose result the table cannot show.",
});
