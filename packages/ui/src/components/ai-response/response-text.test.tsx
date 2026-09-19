import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Response, ThinkingIndicator } from "./ai-response";
import { ResponseText, type ResponseCitation } from "./response-text";

const CITATIONS: ResponseCitation[] = [
  { index: 1, title: "Compute pricing", href: "https://example.org/pricing" },
  { index: 2, title: "Internal memo" },
];

function words(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("[data-slot='response-word']")];
}

describe("ResponseText", () => {
  it("keeps the text content exactly, whitespace and punctuation included", () => {
    const text = "Hello,  world!\nIt's 3 o'clock — isn't it?  ";
    const { container } = render(<ResponseText text={text} />);
    expect(container.querySelector("[data-slot='response-text']")?.textContent).toBe(text);
  });

  it("keeps bare punctuation and whitespace as text, not word spans", () => {
    const { container } = render(<ResponseText text="Yes — really ." />);
    expect(words(container).map((word) => word.textContent)).toEqual(["Yes", "really"]);
  });

  it("turns a matched [n] into an InlineCitation followed by literal punctuation", () => {
    const { container } = render(
      <ResponseText text="compute [1], then" citations={CITATIONS} />,
    );
    const link = screen.getByRole("link", { name: "Source 1: Compute pricing" });
    expect(link).toHaveAttribute("href", "https://example.org/pricing");
    const wrapper = link.closest("[data-slot='response-citation']");
    expect(wrapper?.nextSibling?.textContent).toBe(",");
    expect(container.textContent).toMatch(/^compute .+, then$/);
  });

  it("leaves an unmatched marker as text", () => {
    const { container } = render(<ResponseText text="see [9]." citations={CITATIONS} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.textContent).toBe("see [9].");
  });

  it("renders a citation without an href as text, not a link", () => {
    render(<ResponseText text="per the memo [2]" citations={CITATIONS} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Source 2: Internal memo")).toBeInTheDocument();
  });

  it("animates only words that arrive after the first render", () => {
    const { container, rerender } = render(<ResponseText text="The quick" />);
    const initial = words(container);
    expect(initial.every((word) => !word.classList.contains("dowel-ai-response-word"))).toBe(
      true,
    );

    rerender(<ResponseText text="The quick brown fox" />);
    const after = words(container);
    // Existing words keep their nodes, so nothing replays.
    expect(after[0]).toBe(initial[0]);
    expect(after[1]).toBe(initial[1]);
    expect(after[2]).toHaveClass("dowel-ai-response-word");
    expect(after[3]).toHaveClass("dowel-ai-response-word");
  });

  it("extends a word in place without re-animating it", () => {
    const { container, rerender } = render(<ResponseText text="Hel" animateInitial />);
    const [first] = words(container);
    rerender(<ResponseText text="Hello" animateInitial />);
    expect(words(container)[0]).toBe(first);
    expect(words(container)[0]).toHaveTextContent("Hello");
  });

  it("animates the initial words with animateInitial", () => {
    const { container } = render(<ResponseText text="All of it" animateInitial />);
    expect(
      words(container).every((word) => word.classList.contains("dowel-ai-response-word")),
    ).toBe(true);
  });

  it("pops in citations that arrive, not ones already there", () => {
    const { container, rerender } = render(<ResponseText text="a [1]" citations={CITATIONS} />);
    const citation = () => container.querySelectorAll("[data-slot='response-citation']");
    expect(citation()[0]).not.toHaveClass("dowel-ai-response-pop");

    rerender(<ResponseText text="a [1] b [1]" citations={CITATIONS} />);
    expect(citation()[1]).toHaveClass("dowel-ai-response-pop");
  });

  it("adds no live region, log or busy state", () => {
    const { container } = render(
      <Response streaming>
        <ResponseText text="Streaming text [1]" citations={CITATIONS} />
      </Response>,
    );
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector("[role='log']")).toBeNull();
    expect(container.querySelector("[aria-busy]")).toBeNull();
    // The caret stays in Response.
    expect(container.querySelector("[data-slot='response-caret']")).not.toBeNull();
  });

  it("ships its keyframes scaled by --motion-scale, not the indicator scale", () => {
    render(<ResponseText text="Hi" />);
    const sheet = document.querySelector("style[data-href='dowel-ai-response']")?.textContent;
    expect(sheet).toContain("@keyframes dowel-ai-response-word");
    expect(sheet).toContain("calc(220ms * var(--motion-scale,1))");
    expect(sheet).not.toContain("indicator");
  });

  it("merges a className and passes props through", () => {
    render(<ResponseText text="Hi" className="font-mono" data-testid="t" />);
    expect(screen.getByTestId("t")).toHaveClass("font-mono");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Response>
        <ResponseText text="Compute costs vary [1] and so on [2]." citations={CITATIONS} />
      </Response>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("ThinkingIndicator as an indicator", () => {
  it("marks its dots as indicators, timed by the indicator scale", () => {
    const { container } = render(<ThinkingIndicator />);
    const dots = [...container.querySelectorAll<HTMLElement>("span[aria-hidden='true']")];
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot).toHaveAttribute("data-motion", "indicator");
      expect(dot.style.animationDuration).toContain("var(--motion-scale-indicator");
      expect(dot.style.animationDelay).toContain("var(--motion-scale-indicator");
    }
    expect(dots[2]?.style.animationDelay).toContain("320ms");
  });
});
