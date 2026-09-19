import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function Sliding() {
  const [page, setPage] = useState(1);
  return (
    <Pagination>
      <PaginationContent indicator="slide">
        {[1, 2, 3].map((value) => (
          <PaginationItem key={value}>
            <PaginationLink asChild isActive={value === page}>
              <button
                type="button"
                onClick={() => {
                  setPage(value);
                }}
              >
                {value}
              </button>
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  );
}

function stubGeometry() {
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const page = Number(this.textContent);
    const left = this.tagName === "BUTTON" ? page * 40 : 0;
    return DOMRect.fromRect({ x: left, y: 0, width: 36, height: 36 });
  });
}

describe("Pagination sliding pill (SmoothUI Pagination)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders no pill by default", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("[data-slot='pagination-indicator']")).toBeNull();
  });

  it("places an aria-hidden pill under the current page when opted in", () => {
    stubGeometry();
    const { container } = render(<Sliding />);
    const pill = container.querySelector<HTMLElement>("[data-slot='pagination-indicator']");

    expect(pill?.tagName).toBe("LI");
    expect(pill).toHaveAttribute("aria-hidden", "true");
    expect(pill).toHaveAttribute("data-ready");
    expect(pill?.style.transform).toBe("translate(40px, 0px)");
    expect(pill?.style.width).toBe("36px");
  });

  it("slides to the page chosen by pointer or keyboard", async () => {
    stubGeometry();
    const user = userEvent.setup();
    const { container } = render(<Sliding />);
    const pill = () =>
      container.querySelector<HTMLElement>("[data-slot='pagination-indicator']")?.style
        .transform;

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(pill()).toBe("translate(120px, 0px)");

    screen.getByRole("button", { name: "2" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(pill()).toBe("translate(80px, 0px)");
  });

  it("uses offsets when the list is the link's offset parent", () => {
    vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.closest("ul");
    });
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(44);
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockReturnValue(0);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(36);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(36);

    const { container } = render(<Sliding />);
    const pill = container.querySelector<HTMLElement>("[data-slot='pagination-indicator']");
    expect(pill?.style.transform).toBe("translate(44px, 0px)");
  });

  it("stays unmeasured and hidden when no page is current", () => {
    const { container } = render(
      <Pagination>
        <PaginationContent indicator="slide">
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const pill = container.querySelector("[data-slot='pagination-indicator']");
    expect(pill).not.toHaveAttribute("data-ready");
    expect(pill).toHaveClass("hidden");
  });

  it("keeps the current page's own styling on the link for first paint", () => {
    render(<Sliding />);
    expect(screen.getByRole("button", { name: "1" })).toHaveClass("border-border-strong");
  });

  it("stops the slide under reduced motion", () => {
    const { container } = render(<Sliding />);
    expect(container.querySelector("[data-slot='pagination-indicator']")).toHaveClass(
      "motion-reduce:transition-none",
    );
  });

  it("does not count the pill as a list item for assistive technology", () => {
    render(<Sliding />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("lets a consumer className on the content win", () => {
    render(
      <Pagination>
        <PaginationContent indicator="slide" className="gap-4">
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const list = screen.getByRole("list");
    expect(list).toHaveClass("gap-4", "relative");
    expect(list).not.toHaveClass("gap-1");
  });

  it("has no accessibility violations with the pill", async () => {
    const { container } = render(<Sliding />);
    await expectNoA11yViolations(container);
  });
});
