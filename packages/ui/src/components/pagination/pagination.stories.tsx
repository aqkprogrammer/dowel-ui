import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const meta = {
  title: "Navigation/Pagination",
  component: Pagination,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#3">3</PaginationLink>
        </PaginationItem>
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
  ),
};

export const Compact: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * When paging only changes client state there is no URL to link to, so the
 * pages render as buttons instead — same styling, correct semantics.
 */
export const AsButtons: Story = {
  render: function AsButtons() {
    const [page, setPage] = useState(2);
    const pages = [1, 2, 3, 4, 5];

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink asChild size="sm" className="gap-1 px-2.5">
              <button
                type="button"
                aria-label="Go to previous page"
                disabled={page === 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                }}
              >
                Previous
              </button>
            </PaginationLink>
          </PaginationItem>
          {pages.map((value) => (
            <PaginationItem key={value}>
              <PaginationLink asChild isActive={value === page}>
                <button
                  type="button"
                  aria-label={`Go to page ${String(value)}`}
                  onClick={() => {
                    setPage(value);
                  }}
                >
                  {value}
                </button>
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationLink asChild size="sm" className="gap-1 px-2.5">
              <button
                type="button"
                aria-label="Go to next page"
                disabled={page === pages.length}
                onClick={() => {
                  setPage((current) => Math.min(pages.length, current + 1));
                }}
              >
                Next
              </button>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  },
};

/** SmoothUI's page range: first, last, the current page's siblings, and gaps. */
function pageRange(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(page - 1, 2);
  const end = Math.min(page + 1, total - 1);
  const items: (number | "gap")[] = [1];
  if (start > 2) items.push("gap");
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < total - 1) items.push("gap");
  items.push(total);
  return items;
}

/**
 * SmoothUI's Pagination: one active-page pill that slides between pages with
 * a spring-like overshoot. Opt in with `indicator="slide"` on the content;
 * it earns its keep when paging changes client state, as here.
 */
export const SmoothPagination: Story = {
  render: function SmoothPagination() {
    const [page, setPage] = useState(1);
    const total = 10;

    return (
      <Pagination>
        <PaginationContent indicator="slide">
          <PaginationItem>
            <PaginationLink asChild size="sm" className="gap-1 px-2.5">
              <button
                type="button"
                aria-label="Go to previous page"
                disabled={page === 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                }}
              >
                Previous
              </button>
            </PaginationLink>
          </PaginationItem>
          {pageRange(page, total).map((value, index) =>
            value === "gap" ? (
              <PaginationItem key={`gap-${String(index)}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={value}>
                <PaginationLink asChild isActive={value === page}>
                  <button
                    type="button"
                    aria-label={`Go to page ${String(value)}`}
                    onClick={() => {
                      setPage(value);
                    }}
                  >
                    {value}
                  </button>
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationLink asChild size="sm" className="gap-1 px-2.5">
              <button
                type="button"
                aria-label="Go to next page"
                disabled={page === total}
                onClick={() => {
                  setPage((current) => Math.min(total, current + 1));
                }}
              >
                Next
              </button>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  },
};
