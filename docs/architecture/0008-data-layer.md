# 8. The data layer

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 5

## Context

Seven components: Table, Data Table, Pagination, Command, Empty State, Progress
and Activity Feed. Two of them needed a real decision.

## Command is built in-house, consistent with ADR 5 and 6

`cmdk` is still the obvious package and still has had no release since
2025-03-14. Command shares its whole navigation model with Combobox — input owns
`role="combobox"`, list owns `role="listbox"`, active item tracked with
`aria-activedescendant`, ordering read from the DOM rather than a registry — so
building it cost far less than adopting an unmaintained dependency would have.

It adds one thing Combobox does not have: **groups that hide their own heading
when everything inside them is filtered out.** The implementation detail worth
remembering is that a filtered-out group is `hidden`, not unmounted. Its items
are what report whether anything matched; unmounting them stops the reports and
the group can never come back.

## Data Table depends on `@tanstack/react-table`

Published four days before this decision and actively maintained. Sorting,
filtering, selection and pagination are a library's worth of work, and wrapping
them in props would re-expose an API that already exists, badly, while blocking
anything the wrapper did not anticipate.

So the consumer owns the instance and these components are presentation:

```tsx
const table = useTable({ features, columns, data });
<DataTable table={table} />;
```

### Typing against a feature-modular library

v9 is a redesign. Features are opt-in and the types follow: `getCanSort` exists
only when the sorting feature is enabled. Two approaches were tried.

**Generic over `TFeatures`** — `DataTableColumnHeader<TFeatures extends
Needs<"rowSortingFeature">, …>`. This does not work: with a generic `TFeatures`
the library's conditional types never resolve, so every feature method stays
behind a union and is unreachable.

**Structural interfaces** — each control declares the shape it needs:

```ts
export interface SortableColumn {
  getCanSort: () => boolean;
  getIsSorted: () => "asc" | "desc" | false;
  toggleSorting: (desc?: boolean) => void;
}
```

A column from a table without sorting does not have those methods, so passing
one is a compile error at the call site. That is the guarantee the generics were
reaching for, achieved more simply — and it decouples us from the library's
internal feature types, so a minor reshuffle upstream does not break us.

`DataTable` itself has to render _any_ table, so it uses the core API and
detects the optional extras with real type guards (`"getIsSorted" in column`),
not casts.

## Everything about v9 here was verified, not assumed

Four separate guesses at the v8 API were wrong, and each was caught by building
a real table in a probe rather than by reading and hoping:

- `table.getState()` does not exist; state is the `table.state` property.
- `createSortedRowModel()` takes no arguments.
- `getValue<T>()` is not generic; `row.original` is typed already.
- `row.getVisibleCells()` is not on the core row type.

That last one caused a real bug, described below.

## Accessibility decisions

- **Table is a real `<table>`.** Row and column position, header association and
  table dimensions are announced from the native elements, and none of it can be
  recovered with ARIA afterwards.
- **The scrolling wrapper is focusable**, with `role="region"` and a name. A
  table that overflows its container is otherwise unreachable by keyboard. This
  is the documented pattern for a scrollable region, so
  `jsx-a11y/no-noninteractive-tabindex` is configured to permit it there and
  nowhere else.
- **Sortable headers carry `aria-sort`** and visually hidden text stating the
  column and direction. An arrow icon is no signal at all for a screen reader.
- **A column that cannot be sorted renders as text**, not as a button that does
  nothing.
- **Pagination is a named nav landmark** whose current page carries
  `aria-current="page"`; styling the active page conveys nothing on its own.
  Pages are links by default, because a page of results is a place worth
  sharing — `asChild` covers the client-state case.
- **`ActivityTime` requires a machine-readable `dateTime`.** "2 hours ago" is
  meaningless in a page read a day later.
- **`Progress` distinguishes indeterminate from zero.** They are different
  states and are announced differently.

## The bug this phase's tests caught

**Hiding a column hid its header but not its cells.** During the rewrite for v9
I dropped the `getVisibleCells` capability check and fell back to
`getAllCells()`, so toggling a column off removed the header while every row
still rendered the cell — shifting every row out of alignment with the columns
above it.

Fixed by filtering `getAllCells()` on column visibility, which reuses the
properly typed core result instead of needing a parallel cell type. Caught by a
test that asserted the _cell contents_ after hiding a column, not just the
header's absence — the header-only assertion passed the whole time.
