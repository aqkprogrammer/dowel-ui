import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "date-picker",
  title: "Date Picker",
  description: "A button that opens a calendar to pick a date or a date range.",
  category: "form",
  status: "stable",
  dependencies: ["react-day-picker"],
  registryDependencies: ["button", "calendar", "popover"],
  files: ["date-picker.tsx"],
  a11y:
    "The trigger states the selected date, formatted for the locale, so its accessible name " +
    'changes with the value. The popover is named because it carries role="dialog". Selecting a ' +
    "single date closes the popover and returns focus to the trigger; a range stays open, since " +
    "one click is only half an answer. Offer a typed input alongside it for dates the user " +
    "already knows.",
});
