import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Suggestions, type SuggestionItem } from "./ai-suggestions";

const SUGGESTIONS: SuggestionItem[] = [
  { id: "a", label: "First" },
  { id: "b", label: "Second" },
  { id: "c", label: "Third" },
  { id: "d", label: "Fourth" },
  { id: "e", label: "Fifth" },
];

function stagger(name: string) {
  return screen
    .getByRole("button", { name })
    .closest("li")
    ?.style.getPropertyValue("--stagger");
}

describe("Suggestions", () => {
  it("renders one button per suggestion inside a named list", () => {
    render(<Suggestions suggestions={SUGGESTIONS} />);
    expect(screen.getByRole("list", { name: "Suggestions" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("names the list by its visible heading", () => {
    render(<Suggestions label="Follow-ups" suggestions={SUGGESTIONS} />);
    expect(screen.getByRole("list", { name: "Follow-ups" })).toBeInTheDocument();
  });

  it("hands the whole suggestion back on click and from the keyboard", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Suggestions onSelect={onSelect} suggestions={SUGGESTIONS} />);
    await user.click(screen.getByRole("button", { name: "Second" }));
    expect(onSelect).toHaveBeenLastCalledWith(SUGGESTIONS[1]);
    await user.tab();
    expect(screen.getByRole("button", { name: "Third" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(SUGGESTIONS[2]);
  });

  it("staggers from the centre outwards, scaled by the motion scale", () => {
    render(<Suggestions suggestions={SUGGESTIONS} />);
    expect(stagger("Third")).toBe("0ms");
    expect(stagger("Second")).toBe("45ms");
    expect(stagger("Fourth")).toBe("45ms");
    expect(stagger("First")).toBe("90ms");
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-ai-suggestions-in{");
    expect(css).toContain("var(--stagger) * var(--motion-scale");
  });

  it("replays the entrance when the set changes", () => {
    const { rerender } = render(<Suggestions suggestions={SUGGESTIONS} />);
    const before = screen.getByRole("list");
    rerender(<Suggestions suggestions={SUGGESTIONS.slice(0, 2)} />);
    expect(screen.getByRole("list")).not.toBe(before);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("can be disabled while a response streams", () => {
    render(<Suggestions disabled suggestions={SUGGESTIONS} />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("renders an empty list when there are none", () => {
    render(<Suggestions suggestions={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("applies the soft variant", () => {
    render(<Suggestions variant="soft" suggestions={SUGGESTIONS} />);
    expect(screen.getByRole("button", { name: "First" })).toHaveClass(
      "bg-muted",
      "rounded-full",
    );
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Suggestions ref={ref} className="gap-4" suggestions={SUGGESTIONS} data-testid="s" />,
    );
    const root = container.querySelector('[data-slot="suggestions"]');
    expect(root).toHaveClass("gap-4");
    expect(root).not.toHaveClass("gap-2");
    expect(ref.current).toBe(root);
    expect(screen.getByTestId("s")).toBe(root);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Suggestions label="Start with" suggestions={SUGGESTIONS} />);
    await expectNoA11yViolations(container);
  });
});
