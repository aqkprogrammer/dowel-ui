import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "calendar",
  title: "Calendar",
  description: "A date grid for selecting a day, several days or a range.",
  category: "form",
  status: "stable",
  dependencies: ["react-day-picker"],
  registryDependencies: ["button"],
  files: ["calendar.tsx"],
  a11y:
    "A real grid with roving focus: arrows move by day, Page Up/Down by month, Home/End to the " +
    "ends of a week. Selection is announced through aria-selected, and the month caption is a " +
    "live region so moving between months is announced. Give the calendar an accessible name " +
    "when more than one is on the page.",
});
