import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BlastRadius, summariseBlastRadius, type BlastRadiusData } from "./blast-radius";

const MIXED: BlastRadiusData = {
  changes: [
    { id: "1", label: "Acme renewal", kind: "update", detail: "Stage: Open → Won" },
    { id: "2", label: "Bolt pilot", kind: "delete", reversibility: "irreversible" },
    { id: "3", label: "Cove upsell", kind: "update" },
    { id: "4", label: "Dune deal", kind: "create" },
  ],
};

describe("summariseBlastRadius", () => {
  it("says it all in one sentence", () => {
    expect(summariseBlastRadius(MIXED).sentence).toBe(
      "4 records will change: 1 deleted, 2 updated and 1 created. 1 cannot be undone.",
    );
  });

  it("says nothing will change when nothing will", () => {
    expect(summariseBlastRadius({ changes: [] }).sentence).toBe("Nothing will change.");
  });

  it("says 'at least' when the list is a sample", () => {
    const summary = summariseBlastRadius({ changes: MIXED.changes, total: 43 });
    expect(summary.sampled).toBe(true);
    expect(summary.sentence).toBe(
      "43 records will change: at least 1 deleted, at least 2 updated and at least 1 created. At least 1 cannot be undone.",
    );
  });

  it("says none of it can be undone when the action is permanent", () => {
    const sample = { changes: MIXED.changes.slice(0, 2), total: 40 };
    expect(summariseBlastRadius(sample, "irreversible").sentence).toMatch(
      /None of it can be undone\.$/,
    );
    expect(
      summariseBlastRadius({ changes: [MIXED.changes[1]!] }, "irreversible").sentence,
    ).toBe("1 record will change: 1 deleted. It cannot be undone.");
  });

  it("does not claim all is permanent when a change says otherwise", () => {
    const data: BlastRadiusData = {
      changes: [
        { id: "a", label: "A", kind: "update" },
        { id: "b", label: "B", kind: "update", reversibility: "revertible" },
      ],
    };
    // A inherits the action's permanence; B says it can be undone.
    expect(summariseBlastRadius(data, "irreversible").sentence).toBe(
      "2 records will change: 2 updated. 1 cannot be undone.",
    );
  });

  it("uses the noun it is given", () => {
    const noun = { one: "deal", other: "deals" };
    expect(
      summariseBlastRadius({ changes: [MIXED.changes[0]!] }, "revertible", noun).sentence,
    ).toBe("1 deal will change: 1 updated.");
  });

  it("never counts fewer than the changes it lists", () => {
    expect(summariseBlastRadius({ changes: MIXED.changes, total: 2 }).total).toBe(4);
  });
});

describe("BlastRadius", () => {
  it("is a named section whose summary is a live region", () => {
    render(<BlastRadius data={MIXED} />);
    const section = screen.getByRole("region", { name: "What this will change" });
    const summary = section.querySelector("[data-slot='blast-radius-summary']");
    expect(summary).toHaveAttribute("aria-live", "polite");
    expect(summary).toHaveTextContent(
      "4 records will change: 1 deleted, 2 updated and 1 created. 1 cannot be undone.",
    );
  });

  it("lists permanent changes first, then deletions, and says so in words", () => {
    render(<BlastRadius data={MIXED} />);
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items[0]).toBe("Bolt pilot will be deleted · cannot be undone");
    expect(items).toContain("Acme renewal will be updatedStage: Open → Won");
    expect(items.at(-1)).toBe("Dune deal will be created");
  });

  it("lists up to a limit and counts the rest", () => {
    render(
      <BlastRadius
        data={{ ...MIXED, total: 43 }}
        limit={2}
        noun={{ one: "deal", other: "deals" }}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("and 41 deals more")).toBeInTheDocument();
  });

  it("shows a note the list cannot", () => {
    render(<BlastRadius data={{ ...MIXED, note: "Also emails each owner." }} />);
    expect(screen.getByText("Also emails each owner.")).toBeInTheDocument();
  });

  it("is busy while the dry run works, and lists nothing yet", () => {
    render(<BlastRadius loading />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(section).toHaveTextContent("Working out what this will change…");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says why when the dry run failed", () => {
    render(<BlastRadius error="The database is read-only." data={MIXED} />);
    expect(screen.getByRole("region")).toHaveTextContent(
      "Could not work out what this will change: The database is read-only.",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("takes a heading", () => {
    render(<BlastRadius data={MIXED} heading="If you approve" />);
    expect(screen.getByRole("region", { name: "If you approve" })).toBeInTheDocument();
  });

  it("lets className override its own utilities", () => {
    render(<BlastRadius data={MIXED} className="p-6" />);
    expect(screen.getByRole("region")).toHaveClass("p-6");
    expect(screen.getByRole("region")).not.toHaveClass("p-3");
  });

  it("forwards ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<BlastRadius ref={ref} data={MIXED} data-testid="radius" />);
    expect(ref.current).toBe(screen.getByTestId("radius"));
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<BlastRadius data={{ ...MIXED, total: 12, note: "Note." }} />);
    await expectNoA11yViolations(container);
  });
});
