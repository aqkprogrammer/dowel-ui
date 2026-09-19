import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FaqSearchableBlock, filterFaqs } from "./faq-searchable";

const ITEMS = [
  { question: "Is it free?", answer: "Yes, entirely." },
  { question: "Does it support RTL?", answer: "Every component mirrors." },
  { id: "dark", question: "Is there a dark theme?", answer: "Yes, and it is free too." },
];

describe("filterFaqs", () => {
  it("matches the question or the answer, ignoring case and outer spaces", () => {
    expect(filterFaqs(ITEMS, "  FREE ")).toHaveLength(2);
    expect(filterFaqs(ITEMS, "mirrors")).toHaveLength(1);
    expect(filterFaqs(ITEMS, "")).toBe(ITEMS);
  });
});

describe("FaqSearchableBlock", () => {
  it("is a section named by its heading, with a labelled search field", () => {
    render(<FaqSearchableBlock />);
    expect(screen.getByRole("region", { name: "Frequently asked questions" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Search frequently asked questions" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("filters as you type and announces the count", async () => {
    const user = userEvent.setup();
    render(<FaqSearchableBlock items={ITEMS} />);
    expect(screen.getByText("3 questions.")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "free");
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("2 of 3 questions match.")).toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<FaqSearchableBlock items={ITEMS} />);
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // Once visibly and once in the live region.
    expect(screen.getAllByText(/No matching questions found/)).toHaveLength(2);
  });

  it("opens an answer, and closes it when the search changes", async () => {
    const user = userEvent.setup();
    render(<FaqSearchableBlock items={ITEMS} />);
    const trigger = screen.getByRole("button", { name: "Is it free?" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Yes, entirely.")).toBeVisible();

    await user.type(screen.getByRole("searchbox"), "is");
    expect(screen.getByRole("button", { name: "Is it free?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <FaqSearchableBlock items={ITEMS} query="theme" onQueryChange={onQueryChange} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);

    await user.type(screen.getByRole("searchbox"), "s");
    expect(onQueryChange).toHaveBeenCalledWith("themes");
    // Still the controlled value until the parent changes it.
    expect(screen.getByRole("searchbox")).toHaveValue("theme");

    rerender(<FaqSearchableBlock items={ITEMS} query="" onQueryChange={onQueryChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("starts from a default query and takes localised labels", () => {
    render(
      <FaqSearchableBlock
        items={ITEMS}
        defaultQuery="rtl"
        description={null}
        labels={{ search: "Buscar", results: (count) => `${String(count)} resultados` }}
      />,
    );
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("rtl");
    expect(screen.getByText("1 resultados")).toBeInTheDocument();
  });

  it("re-levels the section heading", () => {
    render(<FaqSearchableBlock headingLevel={3} heading="Help" />);
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Help");
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FaqSearchableBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-4xl");
  });

  it("has no accessibility violations, with results or without", async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqSearchableBlock />);
    await expectNoA11yViolations(container);
    await user.type(screen.getByRole("searchbox"), "zzz");
    await expectNoA11yViolations(container);
  });
});
