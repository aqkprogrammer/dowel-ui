import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[data-slot='skeleton']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("animates", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveClass("animate-pulse-soft");
  });

  it("takes its shape from the consumer className", () => {
    const { container } = render(<Skeleton className="h-4 w-32 rounded-full" />);
    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveClass("h-4", "w-32", "rounded-full");
    expect(skeleton).not.toHaveClass("rounded-md");
  });

  it("survives HTML parsing inside a paragraph", () => {
    // A skeleton stands in for content, so it lands inside paragraphs, labels
    // and headings — all of which accept phrasing content only. A `div` there
    // is invalid, and the parser closes the paragraph early to correct it, so
    // the server HTML and the client tree disagree and hydration fails.
    //
    // Rendering through the real parser is what makes this catchable: React
    // builds the DOM with appendChild and never applies parsing rules, so
    // `render` alone reproduces neither the correction nor the failure.
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(
      <p>
        <Skeleton className="h-7 w-24" />
      </p>,
    );

    const skeleton = host.querySelector("[data-slot='skeleton']");
    expect(skeleton?.parentElement?.tagName).toBe("P");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div aria-busy="true">
        <Skeleton className="h-4 w-32" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
