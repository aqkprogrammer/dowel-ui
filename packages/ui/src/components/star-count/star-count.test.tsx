import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StarCount } from "./star-count";

const STARGAZERS = [
  { name: "octocat", href: "https://example.com/octocat" },
  { name: "hubot", href: "https://example.com/hubot" },
  { name: "monalisa" },
];

function digits(container: HTMLElement) {
  return container.querySelector('[data-slot="number-flow"]');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("StarCount", () => {
  it("counts up from zero to the given count", async () => {
    const { container } = render(<StarCount count={1234} locales="en-US" />);
    expect(digits(container)).toHaveTextContent("0");
    await waitFor(() => {
      expect(digits(container)).toHaveTextContent("1,234");
    });
  });

  it("starts settled when animateOnMount is false", () => {
    const { container } = render(<StarCount count={42} animateOnMount={false} />);
    expect(digits(container)).toHaveTextContent("42");
  });

  it("names the settled count for assistive technology and hides the animation", () => {
    const { container } = render(<StarCount count={1234} locales="en-US" />);
    expect(screen.getByText("1,234")).toHaveClass("sr-only");
    expect(digits(container)).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector('[data-slot="star-count-icon"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("stars")).toBeInTheDocument();
  });

  it("uses the singular unit for one, or a custom unit", () => {
    const { rerender } = render(<StarCount count={1} />);
    expect(screen.getByText("star")).toBeInTheDocument();
    rerender(<StarCount count={3} unit={() => "estrellas"} />);
    expect(screen.getByText("estrellas")).toBeInTheDocument();
  });

  it("formats with Intl options, e.g. compact notation", () => {
    render(<StarCount count={12_300} locales="en-US" format={{ notation: "compact" }} />);
    expect(screen.getByText("12K")).toHaveClass("sr-only");
  });

  it("makes no network calls", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<StarCount count={5} stargazers={STARGAZERS} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the counter as a focusable link with href", async () => {
    const user = userEvent.setup();
    render(<StarCount count={7} href="https://example.com/repo" variant="pill" />);
    const link = screen.getByRole("link", { name: "7 stars" });
    expect(link).toHaveAttribute("href", "https://example.com/repo");
    expect(link).toHaveClass("rounded-full", "hover:bg-accent");
    await user.tab();
    expect(link).toHaveFocus();
  });

  it("is plain text without href", () => {
    const { container } = render(<StarCount count={7} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector('[data-slot="star-count-counter"]')?.tagName).toBe("SPAN");
  });

  it("underlines a plain link on hover", () => {
    render(<StarCount count={7} href="#repo" />);
    expect(screen.getByRole("link")).toHaveClass("hover:underline");
  });

  it("shows stargazers as a named avatar group capped at maxAvatars", () => {
    render(<StarCount count={9} stargazers={STARGAZERS} maxAvatars={2} />);
    expect(screen.getByRole("list", { name: "Stargazers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "octocat" })).toHaveAttribute(
      "href",
      "https://example.com/octocat",
    );
    expect(screen.getByText("and 1 more")).toBeInTheDocument();
  });

  it("omits the avatar group for an empty list", () => {
    render(<StarCount count={9} stargazers={[]} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("re-pops the star when the count changes and rolls to the new value", async () => {
    const { container, rerender } = render(<StarCount count={10} animateOnMount={false} />);
    const first = container.querySelector('[data-slot="star-count-icon"]');
    rerender(<StarCount count={11} animateOnMount={false} />);
    expect(container.querySelector('[data-slot="star-count-icon"]')).not.toBe(first);
    await waitFor(() => {
      expect(digits(container)).toHaveTextContent("11");
    });
    const stylesheet = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(stylesheet).toContain("@keyframes dowel-star-count-pop");
    expect(stylesheet).toContain("var(--motion-scale, 1)");
  });

  it("accepts a custom icon", () => {
    render(<StarCount count={1} icon={<svg data-testid="custom" />} />);
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });

  it("cancels the pending frame on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<StarCount count={3} />);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("lets a consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StarCount ref={ref} count={1} className="gap-1" data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId("root"));
    expect(ref.current).toHaveClass("gap-1");
    expect(ref.current).not.toHaveClass("gap-3");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StarCount count={1234} stargazers={STARGAZERS} href="#repo" variant="pill" />,
    );
    await expectNoA11yViolations(container);
  });
});
