import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ChangelogBlock, type ChangelogRelease } from "./changelog";

const releases: ChangelogRelease[] = [
  {
    version: "1.1.0",
    date: "2026-02-03",
    title: "Exports",
    href: "/notes/1.1.0",
    changes: [
      { kind: "new", text: "CSV export." },
      { kind: "fixed", text: "Totals rounding." },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-01-20",
    title: "Patch",
    changes: [{ kind: "fixed", text: "Login loop." }],
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    title: "Launch",
    changes: [{ kind: "new", text: "Everything." }],
  },
];

describe("ChangelogBlock", () => {
  it("lists releases as articles named by their headlines, with real dates", async () => {
    const { container } = render(<ChangelogBlock releases={releases} locale="en-GB" />);
    expect(screen.getByRole("region", { name: "Changelog" })).toBeInTheDocument();
    const articles = screen.getAllByRole("article");
    expect(articles.map((article) => within(article).getByRole("heading").textContent)).toEqual(
      ["Exports", "Patch", "Launch"],
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-02-03");
    expect(time).toHaveTextContent("3 Feb 2026");
    await expectNoA11yViolations(container);
  });

  it("says the kind of each change in words", () => {
    render(<ChangelogBlock releases={releases} />);
    const first = screen.getAllByRole("article")[0] as HTMLElement;
    expect(within(first).getByText("New")).toBeInTheDocument();
    expect(within(first).getByText("Fixed")).toBeInTheDocument();
  });

  it("filters to one kind, dropping releases left empty, and says how many remain", () => {
    render(<ChangelogBlock releases={releases} />);
    expect(screen.getByRole("status")).toHaveTextContent("3 releases");
    fireEvent.click(screen.getByRole("button", { name: "Fixed" }));
    expect(screen.getByRole("button", { name: "Fixed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByText("CSV export.")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 releases");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("gives each notes link a distinct name", () => {
    render(<ChangelogBlock releases={releases} />);
    expect(
      screen.getByRole("link", { name: "Read the full notes for version 1.1.0" }),
    ).toHaveAttribute("href", "/notes/1.1.0");
  });

  it("drops the filters when asked or when there is one kind", () => {
    const { rerender } = render(<ChangelogBlock releases={releases} filterable={false} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    rerender(<ChangelogBlock releases={[releases[1] as ChangelogRelease]} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
