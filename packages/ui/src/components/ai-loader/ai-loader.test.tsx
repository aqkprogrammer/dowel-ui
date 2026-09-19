import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AILoader, type AILoaderVariant } from "./ai-loader";

afterEach(() => {
  vi.useRealTimers();
});

const COMPOSED: [AILoaderVariant, string, string][] = [
  ["dots", "dots-loader", "thinking"],
  ["bar", "bar-loader", "indeterminate"],
  ["grid", "grid-loader", "thinking"],
];

describe("AILoader", () => {
  it.each(COMPOSED)("composes the %s variant from %s (%s)", (variant, slot, loaderVariant) => {
    const { container } = render(<AILoader variant={variant} />);
    const loader = container.querySelector(`[data-slot="${slot}"]`);
    expect(loader).toHaveAttribute("data-variant", loaderVariant);
    expect(loader).toHaveAttribute("aria-hidden", "true");
    // The composed loader is the indicator; the wrapper is not exempt itself.
    expect(loader).toHaveAttribute("data-motion", "indicator");
    expect(screen.getByRole("status")).not.toHaveAttribute("data-motion");
  });

  it("is a single status region named by a fallback when unlabelled", () => {
    render(<AILoader />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("shows and announces the visible label", () => {
    render(<AILoader label="Thinking" srLabel="unused" />);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    expect(screen.queryByText("unused")).not.toBeInTheDocument();
  });

  it("counts elapsed seconds, hidden from assistive technology", () => {
    vi.useFakeTimers();
    const { container } = render(<AILoader label="Churning" showElapsed />);
    const elapsed = container.querySelector('[data-slot="ai-loader-elapsed"]');
    expect(elapsed).toHaveTextContent("0.0s");
    expect(elapsed).toHaveAttribute("aria-hidden", "true");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(elapsed).toHaveTextContent("2.5s");
  });

  it("has no counter unless asked", () => {
    const { container } = render(<AILoader />);
    expect(container.querySelector('[data-slot="ai-loader-elapsed"]')).toBeNull();
  });

  it.each([
    ["sm", "text-xs"],
    ["md", "text-sm"],
    ["lg", "text-base"],
  ] as const)("applies the %s size to the text and the loader", (size, textClass) => {
    const { container } = render(<AILoader size={size} />);
    expect(screen.getByRole("status")).toHaveClass(textClass);
    expect(container.querySelector('[data-slot="dots-loader"]')).toHaveClass(
      { sm: "text-[0.25rem]", md: "text-[0.375rem]", lg: "text-[0.5rem]" }[size],
    );
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<AILoader ref={ref} className="text-foreground" data-testid="l" />);
    const status = screen.getByRole("status");
    expect(status).toHaveClass("text-foreground");
    expect(status).not.toHaveClass("text-muted-foreground");
    expect(ref.current).toBe(status);
    expect(screen.getByTestId("l")).toBe(status);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <AILoader label="Thinking" />
        <AILoader variant="grid" showElapsed />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
