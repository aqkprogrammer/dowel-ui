import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  NlFilter,
  applyFilters,
  createFilterParser,
  describeFilter,
  normaliseFilter,
  operatorLabel,
  operatorsFor,
  parseFilterText,
  type FilterChip,
  type FilterField,
  type NlFilterProps,
  type ParsedFilter,
} from "./nl-filter";

const FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "succeeded", label: "Succeeded" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
      { value: "in_progress", label: "In progress" },
    ],
  },
  { key: "branch", label: "Branch", type: "text", synonyms: ["on", "ref"] },
  { key: "author", label: "Author", type: "text", synonyms: ["by"] },
  { key: "duration", label: "Duration", type: "number", synonyms: ["took"] },
  { key: "createdAt", label: "Created", type: "date", synonyms: ["created at", "deployed"] },
  { key: "message", label: "Message", type: "text" },
];

const parse = (text: string) => parseFilterText(text, FIELDS);

describe("parseFilterText", () => {
  it("reads field:value, with the field named by label, key or synonym in any case", () => {
    expect(parse("status:failed").chips).toEqual([
      { field: "status", operator: "is", value: "failed" },
    ]);
    expect(parse("Status: FAILED").chips).toEqual([
      { field: "status", operator: "is", value: "failed" },
    ]);
    expect(parse("ref:main createdAt:2025-01-02").chips).toEqual([
      { field: "branch", operator: "is", value: "main" },
      { field: "createdAt", operator: "is", value: "2025-01-02" },
    ]);
  });

  it("reads comparison and negation symbols", () => {
    expect(parse("duration>3 duration<=10 branch!=main message~login").chips).toEqual([
      { field: "duration", operator: ">", value: 3 },
      { field: "duration", operator: "<=", value: 10 },
      { field: "branch", operator: "is not", value: "main" },
      { field: "message", operator: "contains", value: "login" },
    ]);
    expect(parse("duration >= 1,200").chips).toEqual([
      { field: "duration", operator: ">=", value: 1200 },
    ]);
  });

  it("reads quoted values, straight or curly", () => {
    expect(parse('branch:"feature x"').chips).toEqual([
      { field: "branch", operator: "is", value: "feature x" },
    ]);
    expect(parse("status:“In progress”").chips).toEqual([
      { field: "status", operator: "is", value: "in_progress" },
    ]);
  });

  it("reads operators written as words", () => {
    expect(parse("status is not failed").chips).toEqual([
      { field: "status", operator: "is not", value: "failed" },
    ]);
    expect(parse("took over 5").chips).toEqual([
      { field: "duration", operator: ">", value: 5 },
    ]);
    expect(parse("duration at least 2").chips).toEqual([
      { field: "duration", operator: ">=", value: 2 },
    ]);
    expect(parse("message contains login").chips).toEqual([
      { field: "message", operator: "contains", value: "login" },
    ]);
  });

  it("turns > and < on a date into after and before", () => {
    expect(parse("created>2025-01-01 created before 2025/2/1").chips).toEqual([
      { field: "createdAt", operator: "after", value: "2025-01-01" },
      { field: "createdAt", operator: "before", value: "2025-02-01" },
    ]);
    expect(parse("created:>=2025-01-05").chips).toEqual([
      { field: "createdAt", operator: ">=", value: "2025-01-05" },
    ]);
  });

  it("reads an enum option on its own, and 'not' in front of one", () => {
    expect(parse("failed").chips).toEqual([
      { field: "status", operator: "is", value: "failed" },
    ]);
    expect(parse("not cancelled").chips).toEqual([
      { field: "status", operator: "is not", value: "cancelled" },
    ]);
    expect(parse("in progress").chips).toEqual([
      { field: "status", operator: "is", value: "in_progress" },
    ]);
  });

  it("lets a synonym stand in front of a value, but not a text field's own name", () => {
    expect(parse("failed on main by dana")).toEqual({
      chips: [
        { field: "status", operator: "is", value: "failed" },
        { field: "branch", operator: "is", value: "main" },
        { field: "author", operator: "is", value: "dana" },
      ],
    });
    expect(parse("branch main")).toEqual({ chips: [], unparsed: "branch main" });
  });

  it("takes a number or date with no operator only when the value is one", () => {
    expect(parse("duration 3").chips).toEqual([
      { field: "duration", operator: "is", value: 3 },
    ]);
    expect(parse("duration of the build")).toEqual({
      chips: [],
      unparsed: "duration of the build",
    });
  });

  it("does not take the next field's name as a synonym's value", () => {
    expect(parse("filter by status failed")).toEqual({
      chips: [{ field: "status", operator: "is", value: "failed" }],
    });
  });

  it("returns what it cannot read, less the connecting words around it", () => {
    expect(parse("failed deploys on main this week")).toEqual({
      chips: [
        { field: "status", operator: "is", value: "failed" },
        { field: "branch", operator: "is", value: "main" },
      ],
      unparsed: "deploys this week",
    });
    expect(parse("show me all failed or cancelled")).toEqual({
      chips: [
        { field: "status", operator: "is", value: "failed" },
        { field: "status", operator: "is", value: "cancelled" },
      ],
    });
    expect(parse("asdf")).toEqual({ chips: [], unparsed: "asdf" });
  });

  it("refuses a filter whole when its value does not fit the field", () => {
    expect(parse("status:unknown")).toEqual({ chips: [], unparsed: "status:unknown" });
    expect(parse("status>3")).toEqual({ chips: [], unparsed: "status>3" });
    expect(parse("created on 2025-02-30")).toEqual({
      chips: [],
      unparsed: "created on 2025-02-30",
    });
    expect(parse("status:")).toEqual({ chips: [], unparsed: "status:" });
  });

  it("separates on commas and drops sentence punctuation from a value", () => {
    expect(parse("status:failed,branch:main.").chips).toEqual([
      { field: "status", operator: "is", value: "failed" },
      { field: "branch", operator: "is", value: "main" },
    ]);
  });

  it("drops the words it is told to ignore, with or without a plural s", () => {
    const parser = createFilterParser({ ignore: ["deploy"] });
    expect(
      parser("failed deploys on main this week", FIELDS, new AbortController().signal),
    ).toEqual({
      chips: [
        { field: "status", operator: "is", value: "failed" },
        { field: "branch", operator: "is", value: "main" },
      ],
      unparsed: "this week",
    });
  });
});

describe("normaliseFilter", () => {
  it("puts a model's loose output in canonical form", () => {
    expect(normaliseFilter({ field: "Duration", operator: ">", value: "12" }, FIELDS)).toEqual({
      field: "duration",
      operator: ">",
      value: 12,
    });
    expect(
      normaliseFilter({ field: "status", operator: "is", value: "Failed" }, FIELDS),
    ).toEqual({ field: "status", operator: "is", value: "failed" });
    expect(
      normaliseFilter(
        { field: "createdAt", operator: "<", value: "2025-03-04T10:00Z" },
        FIELDS,
      ),
    ).toEqual({ field: "createdAt", operator: "before", value: "2025-03-04" });
  });

  it("refuses what cannot be a filter on these fields", () => {
    expect(
      normaliseFilter({ field: "region", operator: "is", value: "eu" }, FIELDS),
    ).toBeNull();
    expect(
      normaliseFilter({ field: "status", operator: "contains", value: "fail" }, FIELDS),
    ).toBeNull();
    expect(
      normaliseFilter({ field: "duration", operator: "is", value: "soon" }, FIELDS),
    ).toBeNull();
    expect(
      normaliseFilter({ field: "message", operator: "is", value: "  " }, FIELDS),
    ).toBeNull();
    expect(normaliseFilter(null as unknown as FilterChip, FIELDS)).toBeNull();
  });
});

describe("describing filters", () => {
  it("says a filter as a sentence, in words", () => {
    expect(describeFilter({ field: "status", operator: "is", value: "failed" }, FIELDS)).toBe(
      "Status is Failed",
    );
    expect(describeFilter({ field: "duration", operator: ">", value: 3 }, FIELDS)).toBe(
      "Duration greater than 3",
    );
    expect(
      describeFilter({ field: "createdAt", operator: ">=", value: "2025-01-01" }, FIELDS),
    ).toBe("Created on or after 2025-01-01");
    expect(describeFilter({ field: "region", operator: "is", value: "eu" }, FIELDS)).toBe(
      "region is eu",
    );
  });

  it("offers the operators each type takes", () => {
    expect(operatorsFor("enum")).toEqual(["is", "is not"]);
    expect(operatorsFor("text")).toEqual(["is", "is not", "contains"]);
    expect(operatorsFor("number")).toContain(">=");
    expect(operatorLabel("<=", "number")).toBe("at most");
    expect(operatorLabel("<=", "date")).toBe("on or before");
  });
});

describe("applyFilters", () => {
  const ROWS = [
    {
      id: 1,
      status: "failed",
      branch: "main",
      duration: 12,
      createdAt: "2025-01-10T09:00:00Z",
      tags: ["api"],
    },
    {
      id: 2,
      status: "cancelled",
      branch: "Main",
      duration: 3,
      createdAt: "2025-01-05",
      tags: ["web"],
    },
    {
      id: 3,
      status: "succeeded",
      branch: "feature/login",
      duration: 4,
      createdAt: "2025-02-01",
      tags: [],
    },
    {
      id: 4,
      status: "failed",
      branch: "release",
      duration: null,
      createdAt: "2025-01-20",
      tags: ["api", "web"],
    },
  ];
  const ids = (chips: Parameters<typeof applyFilters>[1], fields = FIELDS) =>
    applyFilters(ROWS, chips, fields).map((row) => row.id);

  it("returns every row when there are no filters", () => {
    expect(ids([])).toEqual([1, 2, 3, 4]);
  });

  it("matches any of several 'is' filters on one field, and all of the rest", () => {
    expect(
      ids([
        { field: "status", operator: "is", value: "failed" },
        { field: "status", operator: "is", value: "cancelled" },
        { field: "branch", operator: "is", value: "main" },
      ]),
    ).toEqual([1, 2]);
    expect(
      ids([
        { field: "duration", operator: ">", value: 2 },
        { field: "duration", operator: "<", value: 5 },
      ]),
    ).toEqual([2, 3]);
  });

  it("compares text without case, and 'contains' as a substring", () => {
    expect(ids([{ field: "branch", operator: "contains", value: "LOG" }])).toEqual([3]);
    expect(ids([{ field: "branch", operator: "is not", value: "main" }])).toEqual([3, 4]);
  });

  it("compares dates by the calendar day written", () => {
    expect(ids([{ field: "createdAt", operator: "is", value: "2025-01-10" }])).toEqual([1]);
    expect(ids([{ field: "createdAt", operator: "after", value: "2025-01-10" }])).toEqual([
      3, 4,
    ]);
    expect(ids([{ field: "createdAt", operator: "<=", value: "2025-01-10" }])).toEqual([1, 2]);
  });

  it("reads a missing value as matching only 'is not'", () => {
    expect(ids([{ field: "duration", operator: ">=", value: 0 }])).toEqual([1, 2, 3]);
    expect(ids([{ field: "duration", operator: "is not", value: 12 }])).toEqual([2, 3, 4]);
  });

  it("matches a list when any item does, and 'is not' when none does", () => {
    const tags: FilterField[] = [{ key: "tags", label: "Tags", type: "text" }];
    expect(ids([{ field: "tags", operator: "is", value: "web" }], tags)).toEqual([2, 4]);
    expect(ids([{ field: "tags", operator: "is not", value: "api" }], tags)).toEqual([2, 3]);
  });

  it("reads values through a getter", () => {
    const rows = [{ meta: { owner: "dana" } }, { meta: { owner: "sam" } }];
    const result = applyFilters(
      rows,
      [{ field: "author", operator: "is", value: "Sam" }],
      FIELDS,
      (row) => row.meta.owner,
    );
    expect(result).toEqual([{ meta: { owner: "sam" } }]);
  });
});

/* The component ----------------------------------------------------------- */

function Uncontrolled(props: Partial<NlFilterProps>) {
  return <NlFilter fields={FIELDS} {...props} />;
}

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Filter" });
const chipTexts = () => screen.queryAllByRole("listitem").map((item) => item.textContent);
const status = () => screen.getByRole("status");
const notice = () => document.querySelector("[data-slot='nl-filter-notice']");

function deferred() {
  let resolve: (value: ParsedFilter) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<ParsedFilter>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("NlFilter", () => {
  it("turns text into chips on Enter and announces them", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);

    await user.type(input(), "failed on main{Enter}");

    expect(screen.getByRole("list", { name: "Applied filters" })).toBeInTheDocument();
    expect(chipTexts()).toEqual(["Status is Failed", "Branch is main"]);
    expect(input()).toHaveValue("");
    expect(status()).toHaveTextContent("Added 2 filters: Status is Failed, Branch is main.");
  });

  it("names each chip's buttons by the filter they act on", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    await user.type(input(), "duration>3{Enter}");

    expect(
      screen.getByRole("button", { name: "Edit filter: Duration greater than 3" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
    expect(
      screen.getByRole("button", { name: "Remove filter: Duration greater than 3" }),
    ).toBeInTheDocument();
  });

  it("removes a chip, says so, and returns focus to the field", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    await user.type(input(), "failed on main{Enter}");

    await user.click(screen.getByRole("button", { name: "Remove filter: Status is Failed" }));

    expect(chipTexts()).toEqual(["Branch is main"]);
    expect(status()).toHaveTextContent("Removed filter: Status is Failed.");
    expect(input()).toHaveFocus();
  });

  it("removes the last chip on Backspace in an empty field", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    await user.type(input(), "failed on main{Enter}");

    await user.keyboard("{Backspace}");
    expect(chipTexts()).toEqual(["Status is Failed"]);

    await user.type(input(), "x{Backspace}");
    expect(chipTexts()).toEqual(["Status is Failed"]);
  });

  it("does nothing on Enter with an empty field", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Uncontrolled onValueChange={onValueChange} />);
    await user.type(input(), "   {Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(status()).toBeEmptyDOMElement();
  });

  it("leaves what it did not understand in the field, and names it", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);

    await user.type(input(), "failed this week{Enter}");

    expect(chipTexts()).toEqual(["Status is Failed"]);
    expect(input()).toHaveValue("this week");
    expect(input()).toHaveAccessibleDescription(/Not understood: “this week”/);
    expect(status()).toHaveTextContent(
      "Added 1 filter: Status is Failed. Not understood: this week.",
    );

    // Clearing the text clears the notice about it.
    await user.clear(input());
    expect(notice()).not.toBeInTheDocument();
  });

  it("offers text it did not understand as a search on searchField", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled searchField="message" />);
    await user.type(input(), "flaky login{Enter}");

    await user.click(
      screen.getByRole("button", { name: "Add filter: Message contains flaky login" }),
    );

    expect(chipTexts()).toEqual(["Message contains flaky login"]);
    expect(input()).toHaveValue("");
    expect(input()).toHaveFocus();
    expect(notice()).not.toBeInTheDocument();
  });

  it("does not offer a search on a field that is not text", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled searchField="duration" />);
    await user.type(input(), "flaky{Enter}");
    expect(screen.queryByRole("button", { name: /Add filter/ })).not.toBeInTheDocument();
  });

  it("says a filter is already there rather than adding it twice", async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    await user.type(input(), "failed{Enter}");
    await user.type(input(), "status:failed{Enter}");

    expect(chipTexts()).toEqual(["Status is Failed"]);
    expect(status()).toHaveTextContent("Already there: Status is Failed.");
  });

  it("is busy while an async parser works, and applies its answer", async () => {
    const pending = deferred();
    const parser = vi.fn(() => pending.promise);
    const user = userEvent.setup();
    render(<Uncontrolled parse={parser} />);

    await user.type(input(), "slow ones{Enter}");

    const group = screen.getByRole("group", { name: "Filter" });
    expect(group).toHaveAttribute("aria-busy", "true");
    expect(input()).toHaveAccessibleDescription("Reading the filter… Press Escape to stop.");
    expect(status()).toHaveTextContent("Reading the filter…");
    expect(parser).toHaveBeenCalledWith("slow ones", FIELDS, expect.any(AbortSignal));

    await act(async () => {
      pending.resolve({ chips: [{ field: "duration", operator: ">", value: 10 }] });
      await pending.promise;
    });

    expect(group).not.toHaveAttribute("aria-busy");
    expect(chipTexts()).toEqual(["Duration greater than 10"]);
  });

  it("aborts the previous parse when the text is submitted again", async () => {
    const first = deferred();
    const second = deferred();
    const signals: AbortSignal[] = [];
    const parser = vi.fn((_text: string, _fields: FilterField[], signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : second.promise;
    });
    const user = userEvent.setup();
    render(<Uncontrolled parse={parser} />);

    await user.type(input(), "failed{Enter}");
    await user.type(input(), "{Enter}");
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => {
      second.resolve({ chips: [{ field: "status", operator: "is", value: "cancelled" }] });
      first.resolve({ chips: [{ field: "status", operator: "is", value: "failed" }] });
      await Promise.all([first.promise, second.promise]);
    });

    expect(chipTexts()).toEqual(["Status is Cancelled"]);
  });

  it("stops a parse on Escape", async () => {
    const pending = deferred();
    let signal: AbortSignal | undefined;
    const user = userEvent.setup();
    render(
      <Uncontrolled
        parse={(_text, _fields, abort) => {
          signal = abort;
          return pending.promise;
        }}
      />,
    );

    await user.type(input(), "failed{Enter}");
    await user.keyboard("{Escape}");

    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole("group", { name: "Filter" })).not.toHaveAttribute("aria-busy");
    expect(status()).toHaveTextContent("Stopped reading the filter.");
    expect(input()).toHaveValue("failed");
  });

  it("keeps new typing when an async answer arrives", async () => {
    const pending = deferred();
    const user = userEvent.setup();
    render(<Uncontrolled parse={() => pending.promise} />);

    await user.type(input(), "failed{Enter}");
    await user.type(input(), " on main");
    await act(async () => {
      pending.resolve({ chips: [{ field: "status", operator: "is", value: "failed" }] });
      await pending.promise;
    });

    expect(chipTexts()).toEqual(["Status is Failed"]);
    expect(input()).toHaveValue("failed on main");
  });

  it("says why when the parser fails", async () => {
    const user = userEvent.setup();
    render(
      <Uncontrolled
        parse={() => {
          throw new Error("the model is offline");
        }}
      />,
    );

    await user.type(input(), "failed{Enter}");

    expect(input()).toHaveValue("failed");
    expect(input()).toHaveAccessibleDescription(
      expect.stringContaining("Could not read the filter: the model is offline."),
    );
    expect(status()).toHaveTextContent("Could not read the filter: the model is offline.");
  });

  it("refuses a parser's filters that do not fit the fields, in words", async () => {
    const user = userEvent.setup();
    render(
      <Uncontrolled
        parse={() => ({
          chips: [
            { field: "status", operator: "is", value: "failed" },
            { field: "region", operator: "is", value: "eu" },
          ],
        })}
      />,
    );

    await user.type(input(), "failed in europe{Enter}");

    expect(chipTexts()).toEqual(["Status is Failed"]);
    expect(input()).toHaveValue("region is eu");
    expect(notice()).toHaveTextContent("Not understood: “region is eu”.");
  });

  it("does not submit a surrounding form", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Uncontrolled />
      </form>,
    );
    await user.type(input(), "failed{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("editing a chip", () => {
    const DURATION: FilterChip[] = [{ id: "d", field: "duration", operator: ">", value: 3 }];

    it("opens a named editor from pointer and keyboard", async () => {
      const user = userEvent.setup();
      render(<Uncontrolled defaultValue={DURATION} />);
      const edit = screen.getByRole("button", { name: "Edit filter: Duration greater than 3" });

      await user.click(edit);
      expect(
        screen.getByRole("dialog", { name: "Edit filter: Duration greater than 3" }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(edit).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("applies a new value on Enter and returns focus to the chip", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Uncontrolled defaultValue={DURATION} onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button", { name: /^Edit filter/ }));
      const value = screen.getByRole("spinbutton", { name: "Value" });
      await user.clear(value);
      await user.type(value, "10{Enter}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(chipTexts()).toEqual(["Duration greater than 10"]);
      expect(onValueChange).toHaveBeenLastCalledWith([
        { id: "d", field: "duration", operator: ">", value: 10 },
      ]);
      expect(status()).toHaveTextContent("Changed filter to Duration greater than 10.");
      expect(screen.getByRole("button", { name: /^Edit filter/ })).toHaveFocus();
    });

    it("changes the condition and an enum's value from their selects", async () => {
      const user = userEvent.setup();
      render(
        <Uncontrolled
          defaultValue={[{ id: "s", field: "status", operator: "is", value: "failed" }]}
        />,
      );

      await user.click(screen.getByRole("button", { name: /^Edit filter/ }));
      await user.click(screen.getByRole("combobox", { name: "Condition" }));
      await user.click(await screen.findByRole("option", { name: "is not" }));
      await user.click(screen.getByRole("combobox", { name: "Value" }));
      await user.click(await screen.findByRole("option", { name: "Cancelled" }));
      await user.click(screen.getByRole("button", { name: "Apply" }));

      expect(chipTexts()).toEqual(["Status is not Cancelled"]);
    });

    it("says what is wrong with a value and keeps the chip as it was", async () => {
      const user = userEvent.setup();
      render(<Uncontrolled defaultValue={DURATION} />);

      await user.click(screen.getByRole("button", { name: /^Edit filter/ }));
      const value = screen.getByRole("spinbutton", { name: "Value" });
      await user.clear(value);
      await user.click(screen.getByRole("button", { name: "Apply" }));

      expect(value).toHaveAttribute("aria-invalid", "true");
      expect(value).toHaveAccessibleDescription("Enter a number.");
      expect(value).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(chipTexts()).toEqual(["Duration greater than 3"]);
    });

    it("has no detectable accessibility violations while open", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<Uncontrolled defaultValue={DURATION} />);
      await user.click(screen.getByRole("button", { name: /^Edit filter/ }));
      await expectNoA11yViolations(baseElement);
    });
  });

  it("can be controlled", async () => {
    function Controlled() {
      const [chips, setChips] = useState<FilterChip[]>([
        { id: "a", field: "branch", operator: "is", value: "main" },
      ]);
      return (
        <>
          <NlFilter fields={FIELDS} value={chips} onValueChange={setChips} />
          <output data-testid="count">{chips.length}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "failed{Enter}");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(chipTexts()).toEqual(["Branch is main", "Status is Failed"]);
  });

  it("shows only what the parent passes when controlled", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<NlFilter fields={FIELDS} value={[]} onValueChange={onValueChange} />);

    await user.type(input(), "failed{Enter}");

    expect(onValueChange).toHaveBeenCalledWith([
      expect.objectContaining({ field: "status", operator: "is", value: "failed" }),
    ]);
    expect(chipTexts()).toEqual([]);
  });

  it("reads, but does not edit, a chip for a field it does not know", () => {
    render(
      <Uncontrolled
        defaultValue={[{ id: "r", field: "region", operator: "is", value: "eu" }]}
      />,
    );
    expect(chipTexts()).toEqual(["region is eu"]);
    expect(screen.queryByRole("button", { name: /^Edit filter/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove filter: region is eu" }),
    ).toBeInTheDocument();
  });

  it("builds its hint from the fields, or takes one", () => {
    const { rerender } = render(<Uncontrolled />);
    expect(input()).toHaveAccessibleDescription(
      "Press Enter to add filters. Try “succeeded” or “status:succeeded”.",
    );
    rerender(<Uncontrolled hint="Ask for anything." />);
    expect(input()).toHaveAccessibleDescription("Ask for anything.");
  });

  it("disables the field and every chip button", () => {
    render(
      <Uncontrolled
        disabled
        defaultValue={[{ id: "s", field: "status", operator: "is", value: "failed" }]}
      />,
    );
    expect(input()).toBeDisabled();
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("takes a label, and passes input props through", async () => {
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(<Uncontrolled label="Filter deploys" inputProps={{ onKeyDown, name: "q" }} />);
    const field = screen.getByRole("textbox", { name: "Filter deploys" });
    expect(field).toHaveAttribute("name", "q");
    await user.type(field, "a");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("lets className override its own utilities", () => {
    const { container } = render(<Uncontrolled className="gap-4" />);
    const root = container.querySelector("[data-slot='nl-filter']");
    expect(root).toHaveClass("gap-4");
    expect(root).not.toHaveClass("gap-1.5");
  });

  it("forwards ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Uncontrolled ref={ref} data-testid="filter" />);
    expect(ref.current).toBe(screen.getByTestId("filter"));
  });

  it("has no detectable accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<Uncontrolled searchField="message" />);
    await user.type(input(), "failed on main next tuesday{Enter}");
    expect(notice()).toBeInTheDocument();
    expect(within(container).getAllByRole("listitem")).toHaveLength(2);
    await expectNoA11yViolations(container);
  });
});
