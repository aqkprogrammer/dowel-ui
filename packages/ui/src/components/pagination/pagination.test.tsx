import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

function Example({ current = 2 }: { current?: number } = {}) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#1" />
        </PaginationItem>
        {[1, 2, 3].map((page) => (
          <PaginationItem key={page}>
            <PaginationLink href={`#${String(page)}`} isActive={page === current}>
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#12">12</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination", () => {
  it("is a named navigation landmark", () => {
    render(<Example />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current", () => {
    render(<Example current={2} />);

    const current = screen.getByRole("link", { name: "2" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1" })).not.toHaveAttribute("aria-current");
  });

  it("names the previous and next controls", () => {
    render(<Example />);
    expect(screen.getByRole("link", { name: "Go to previous page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to next page" })).toBeInTheDocument();
  });

  it("renders pages as links, so they can be shared and opened in a tab", () => {
    render(<Example />);
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("href", "#2");
  });

  it("hides the ellipsis but keeps a readable equivalent", () => {
    const { container } = render(<Example />);
    const ellipsis = container.querySelector("[data-slot='pagination-ellipsis']");

    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(ellipsis).toHaveTextContent("More pages");
  });

  it("renders as buttons via asChild when paging is client state", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink asChild isActive>
              <button type="button" onClick={onClick}>
                1
              </button>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    const button = screen.getByRole("button", { name: "1" });
    expect(button).toHaveAttribute("aria-current", "page");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveFocus();
  });

  it("styles the active page differently", () => {
    render(<Example current={3} />);
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("data-active", "true");
  });

  it("mirrors both arrows, which point along the reading direction", () => {
    const { container } = render(<Example />);

    const arrows = [...container.querySelectorAll("svg")].filter((svg) => {
      const drawn = svg.querySelector("path")?.getAttribute("d") ?? "";
      return drawn.includes("18 6-6-6-6") || drawn.includes("18-6-6 6-6");
    });

    expect(arrows.length).toBe(2);
    for (const arrow of arrows) expect(arrow).toHaveClass("rtl:-scale-x-100");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
