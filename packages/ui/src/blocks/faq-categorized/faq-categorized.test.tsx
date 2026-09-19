import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FaqCategorizedBlock } from "./faq-categorized";

const CATEGORIES = [
  { id: "a", name: "Alpha", items: [{ question: "First?", answer: "One." }] },
  { name: "Beta test", items: [{ question: "Second?", answer: "Two." }] },
];

describe("FaqCategorizedBlock", () => {
  it("is a section named by its heading, with a named tab list", () => {
    render(<FaqCategorizedBlock />);
    expect(screen.getByRole("region", { name: "Frequently asked questions" })).toBeVisible();
    expect(screen.getByRole("tablist", { name: "Question topics" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("opens an answer, and closes it when the topic changes", async () => {
    const user = userEvent.setup();
    render(<FaqCategorizedBlock categories={CATEGORIES} />);
    await user.click(screen.getByRole("button", { name: "First?" }));
    expect(screen.getByText("One.")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Beta test" }));
    expect(screen.getByRole("button", { name: "Second?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await user.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(screen.getByRole("button", { name: "First?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("switches topic with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<FaqCategorizedBlock categories={CATEGORIES} />);
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Beta test" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Second?" })).toBeInTheDocument();
  });

  it("can be controlled, keyed by id or hyphenated name", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FaqCategorizedBlock
        categories={CATEGORIES}
        value="Beta-test"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Second?" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Alpha" }));
    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  it("starts from a default topic and handles no topics", () => {
    const { unmount } = render(
      <FaqCategorizedBlock
        categories={CATEGORIES}
        defaultValue="Beta-test"
        description={null}
      />,
    );
    expect(screen.getByRole("tab", { name: "Beta test" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    unmount();
    render(<FaqCategorizedBlock categories={[]} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("re-levels the section heading", () => {
    render(<FaqCategorizedBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Frequently asked questions",
    );
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<FaqCategorizedBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-4xl");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqCategorizedBlock />);
    await user.click(screen.getAllByRole("button")[0] as HTMLElement);
    await expectNoA11yViolations(container);
  });
});
