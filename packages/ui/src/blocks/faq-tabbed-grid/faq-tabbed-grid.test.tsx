import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FaqTabbedGridBlock } from "./faq-tabbed-grid";

const CATEGORIES = [
  {
    id: "a",
    name: "Alpha",
    items: [{ question: "First?", answer: "One.", icon: <svg data-testid="custom-icon" /> }],
  },
  { id: "b", name: "Beta", items: [{ question: "Second?", answer: "Two." }] },
];

describe("FaqTabbedGridBlock", () => {
  it("is a section named by its heading, with a named tab list", () => {
    render(<FaqTabbedGridBlock />);
    expect(screen.getByRole("region", { name: "FAQs" })).toBeVisible();
    expect(screen.getByRole("tablist", { name: "Question categories" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("shows the first category's questions and answers as a description list", () => {
    render(<FaqTabbedGridBlock />);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("term")).toHaveLength(3);
    expect(within(panel).getByText("How do I install it?")).toBeVisible();
  });

  it("switches category with a click or the arrow keys", async () => {
    const user = userEvent.setup();
    render(<FaqTabbedGridBlock categories={CATEGORIES} />);
    expect(screen.getByText("One.")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByText("Two.")).toBeVisible();
    expect(screen.queryByText("One.")).not.toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
  });

  it("uses an item's own icon when it has one", () => {
    render(<FaqTabbedGridBlock categories={CATEGORIES} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FaqTabbedGridBlock categories={CATEGORIES} value="b" onValueChange={onValueChange} />,
    );
    expect(screen.getByText("Two.")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(onValueChange).toHaveBeenCalledWith("a");
    expect(screen.getByText("Two.")).toBeVisible();
  });

  it("starts from a default category", () => {
    render(<FaqTabbedGridBlock categories={CATEGORIES} defaultValue="b" description={null} />);
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
  });

  it("re-levels the section heading", () => {
    render(<FaqTabbedGridBlock headingLevel={3} categoriesLabel="Topics" />);
    expect(screen.getByRole("heading", { level: 3, name: "FAQs" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Topics" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FaqTabbedGridBlock ref={ref} className="bg-background" />);
    expect(ref.current).toHaveClass("bg-background");
    expect(ref.current).not.toHaveClass("bg-muted");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FaqTabbedGridBlock />);
    await expectNoA11yViolations(container);
  });
});
