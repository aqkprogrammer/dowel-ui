import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MorphBlob } from "./morph-blob";

function blob(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="morph-blob"]');
}

describe("MorphBlob", () => {
  it("is decorative and hidden from assistive technology", () => {
    const { container } = render(<MorphBlob />);
    expect(blob(container)).toHaveAttribute("aria-hidden", "true");
    expect(blob(container)).not.toHaveAttribute("role");
    expect(blob(container)).not.toHaveAttribute("tabindex");
  });

  it("is not an indicator, so reduced motion stops it", () => {
    const { container } = render(<MorphBlob />);
    expect(blob(container)).not.toHaveAttribute("data-motion");
    const css = container.ownerDocument.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(
      /prefers-reduced-motion:reduce\)\{[^}]*animation:none;border-radius:50%/,
    );
    expect(css).toContain("var(--motion-scale, 1)");
  });

  it("takes a duration and a paused state", () => {
    const { container, rerender } = render(<MorphBlob duration={3} />);
    expect(blob(container)?.style.getPropertyValue("--morph-blob-duration")).toBe("3s");
    expect(blob(container)).not.toHaveAttribute("data-paused");
    rerender(<MorphBlob paused />);
    expect(blob(container)).toHaveAttribute("data-paused");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<MorphBlob ref={ref} className="bg-primary" size="lg" />);
    expect(ref.current).toBe(blob(container));
    expect(ref.current).toHaveClass("bg-primary", "size-20");
    expect(ref.current).not.toHaveClass("bg-foreground");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<MorphBlob />);
    await expectNoA11yViolations(container);
  });
});
