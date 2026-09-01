---
"@dowel/ui": minor
---

Add the data layer: Table, Data Table, Pagination, Command, Empty State,
Progress and Activity Feed.

Command implements the ⌘K palette on the same ARIA combobox model as Combobox
rather than depending on `cmdk`, and adds groups that hide their heading when
their items are filtered out.

Data Table is presentation for a TanStack Table instance you own. Its controls
declare the shape they need — a column from a table without sorting will not
typecheck as a `SortableColumn` — so a missing feature is a compile error rather
than a runtime crash.
