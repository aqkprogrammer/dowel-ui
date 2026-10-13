import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CareersBlock, type CareersRole } from "./careers";

const roles: CareersRole[] = [
  {
    id: "a",
    title: "Backend Engineer",
    team: "Engineering",
    location: "Paris",
    type: "Full-time",
    href: "/jobs/a",
  },
  {
    id: "b",
    title: "Data Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Contract",
    remote: true,
    href: "/jobs/b",
  },
  {
    id: "c",
    title: "Illustrator",
    team: "Design",
    location: "Lisbon",
    type: "Part-time",
    href: "/jobs/c",
  },
];

describe("CareersBlock", () => {
  it("groups roles under team headings, each role one link named by its title", async () => {
    const { container } = render(<CareersBlock roles={roles} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Engineering",
      "Design",
    ]);
    const engineering = screen.getByRole("list", { name: "Engineering" });
    expect(within(engineering).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /^Backend Engineer/ })).toHaveAttribute(
      "href",
      "/jobs/a",
    );
    expect(screen.getByRole("status")).toHaveTextContent("3 open roles");
    await expectNoA11yViolations(container);
  });

  it("searches across title, team and location", () => {
    render(<CareersBlock roles={roles} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search roles" }), {
      target: { value: "lisbon" },
    });
    expect(screen.getAllByRole("link", { name: /Illustrator/ })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Engineer/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 open role");
  });

  it("filters by team", () => {
    render(<CareersBlock roles={roles} />);
    fireEvent.click(screen.getByRole("button", { name: "Design" }));
    expect(screen.getByRole("button", { name: "Design" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("heading", { name: "Engineering" })).not.toBeInTheDocument();
  });

  it("offers to clear the filters when nothing matches", () => {
    render(<CareersBlock roles={roles} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "astronaut" } });
    expect(screen.getByText("No roles match")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send a general application" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("status")).toHaveTextContent("3 open roles");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("says there are no openings, without a filter to clear, when there are none", () => {
    render(<CareersBlock roles={[]} />);
    expect(screen.getByText("No open roles right now")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });
});
