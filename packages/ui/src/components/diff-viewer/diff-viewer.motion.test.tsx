import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { buildDiff } from "./diff-model";
import { DiffViewer, type DiffViewerProps, type HunkDecision } from "./diff-viewer";

const BEFORE = ["one", "two", "three", "four", "five"].join("\n");
const AFTER = ["one", "two", "THREE", "3.5", "four", "five"].join("\n");
const HUNKS = buildDiff(BEFORE, AFTER);
const HUNK = HUNKS[0]!.id;

function contentCells(container: HTMLElement, kind: string) {
  return [...container.querySelectorAll<HTMLElement>(`tr[data-kind='${kind}'] td:last-child`)];
}

function Decide(props: Partial<DiffViewerProps> & { initial?: Record<string, HunkDecision> }) {
  const { initial, ...rest } = props;
  const [decisions, setDecisions] = useState<Record<string, HunkDecision>>(initial ?? {});
  return (
    <DiffViewer
      label="src/app.ts"
      hunks={HUNKS}
      decisions={decisions}
      onDecision={(id, decision) => {
        setDecisions((current) => ({ ...current, [id]: decision }));
      }}
      {...rest}
    />
  );
}

describe("DiffViewer entrance='wipe'", () => {
  it("wipes only added lines' content cells, never numbers, context or removals", () => {
    const { container } = render(<DiffViewer label="f" hunks={HUNKS} entrance="wipe" />);
    const added = contentCells(container, "added");
    expect(added.length).toBeGreaterThan(0);
    for (const cell of added) expect(cell).toHaveClass("dowel-diff-viewer-wipe");
    for (const cell of [
      ...contentCells(container, "context"),
      ...contentCells(container, "removed"),
    ])
      expect(cell).not.toHaveClass("dowel-diff-viewer-wipe");
    expect(
      container.querySelectorAll("td[aria-hidden='true'].dowel-diff-viewer-wipe"),
    ).toHaveLength(0);
  });

  it("staggers by the line's index in its hunk", () => {
    const { container } = render(<DiffViewer label="f" hunks={HUNKS} entrance="wipe" />);
    const rows = [...container.querySelectorAll<HTMLElement>("tr[data-slot='diff-row']")];
    rows.forEach((row, index) => {
      if (row.dataset.kind !== "added") return;
      expect(
        row.querySelector<HTMLElement>("td:last-child")?.style.getPropertyValue("--dowel-i"),
      ).toBe(String(index));
    });
  });

  it("caps the stagger index at 20", () => {
    const long = buildDiff(
      "",
      Array.from({ length: 30 }, (_, index) => `line ${String(index)}`).join("\n"),
    );
    const { container } = render(<DiffViewer label="f" hunks={long} entrance="wipe" />);
    const values = contentCells(container, "added").map((cell) =>
      Number(cell.style.getPropertyValue("--dowel-i")),
    );
    expect(Math.max(...values)).toBe(20);
  });

  it("wipes the after side of a split view", () => {
    const { container } = render(
      <DiffViewer label="f" hunks={HUNKS} view="split" entrance="wipe" />,
    );
    const wiped = container.querySelectorAll(".dowel-diff-viewer-wipe");
    expect(wiped.length).toBeGreaterThan(0);
    for (const cell of wiped) expect(cell).toHaveTextContent(/^Added:/);
  });

  it("does nothing by default, and keeps the kind text inside the clipped cell", () => {
    const { container, rerender } = render(<DiffViewer label="f" hunks={HUNKS} />);
    expect(container.querySelector(".dowel-diff-viewer-wipe")).toBeNull();
    rerender(<DiffViewer label="f" hunks={HUNKS} entrance="wipe" />);
    expect(contentCells(container, "added")[0]).toHaveTextContent(/^Added:/);
    const sheet = document.querySelector("style[data-href='dowel-diff-viewer']")?.textContent;
    expect(sheet).toContain(
      ".dowel-diff-viewer-wipe:dir(rtl){animation-name:dowel-diff-viewer-wipe-rtl}",
    );
    expect(sheet).toContain("var(--motion-scale");
  });
});

describe("DiffViewer decision flash", () => {
  it("flashes once when a decision changes, and clears on animationend", async () => {
    const user = userEvent.setup();
    const { container } = render(<Decide />);
    const hunk = container.querySelector<HTMLElement>("[data-slot='diff-hunk']")!;
    expect(hunk).not.toHaveAttribute("data-decision-changed");

    await user.click(within(hunk).getByRole("button", { name: "Accept" }));
    expect(hunk).toHaveAttribute("data-decision-changed", "accepted");

    // An animation ending inside the hunk (a wiped line) is not the flash.
    fireEvent.animationEnd(hunk.querySelector("td")!);
    expect(hunk).toHaveAttribute("data-decision-changed", "accepted");

    fireEvent.animationEnd(hunk);
    expect(hunk).not.toHaveAttribute("data-decision-changed");

    await user.click(within(hunk).getByRole("button", { name: "Reject" }));
    expect(hunk).toHaveAttribute("data-decision-changed", "rejected");
  });

  it("does not flash a decision present on first render", () => {
    const { container } = render(<Decide initial={{ [HUNK]: "accepted" }} />);
    expect(container.querySelector("[data-slot='diff-hunk']")).not.toHaveAttribute(
      "data-decision-changed",
    );
  });
});

describe("DiffViewer collapseRejected", () => {
  it("collapses and inerts a rejected hunk's lines, says so, and stays reversible", async () => {
    const user = userEvent.setup();
    const { container } = render(<Decide collapseRejected />);
    const hunk = container.querySelector<HTMLElement>("[data-slot='diff-hunk']")!;
    const lines = () => hunk.querySelector<HTMLElement>("[data-slot='diff-hunk-lines']")!;
    expect(lines()).toHaveClass("grid-rows-[1fr]");
    expect(lines().firstElementChild).not.toHaveAttribute("inert");

    await user.click(within(hunk).getByRole("button", { name: "Reject" }));
    expect(lines()).toHaveAttribute("data-collapsed", "true");
    expect(lines()).toHaveClass("grid-rows-[0fr]", "opacity-0");
    expect(lines().firstElementChild).toHaveAttribute("inert");
    expect(hunk).toHaveTextContent("Rejected — lines hidden");

    const accept = within(hunk).getByRole("button", { name: "Accept" });
    expect(accept).toBeEnabled();
    await user.click(accept);
    expect(lines().firstElementChild).not.toHaveAttribute("inert");
    expect(hunk).not.toHaveTextContent("lines hidden");
  });

  it("says the lines are hidden even without decision controls", () => {
    render(
      <DiffViewer
        label="f"
        hunks={HUNKS}
        decisions={{ [HUNK]: "rejected" }}
        collapseRejected
      />,
    );
    expect(screen.getByText("— lines hidden", { exact: false })).toHaveClass("sr-only");
  });

  it("keeps today's dimmed, uncollapsed rejection by default", () => {
    const { container } = render(<Decide initial={{ [HUNK]: "rejected" }} />);
    expect(container.querySelector("[data-slot='diff-hunk-lines']")).toBeNull();
    expect(container.querySelector("[data-slot='diff-hunk']")).toHaveClass("opacity-55");
  });

  it.each(["unified", "split"] as const)(
    "has no accessibility violations in the %s view with a collapsed hunk",
    async (view) => {
      const { container } = render(
        <Decide
          view={view}
          collapseRejected
          entrance="wipe"
          initial={{ [HUNK]: "rejected" }}
        />,
      );
      await expectNoA11yViolations(container);
    },
  );
});
