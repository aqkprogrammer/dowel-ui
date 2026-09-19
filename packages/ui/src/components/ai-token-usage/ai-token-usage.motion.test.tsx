import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  TokenCount,
  TokenUsage,
  TokenUsageBreakdown,
  formatTokensCompact,
  type TokenUsageBreakdownItem,
} from "./ai-token-usage";

const BREAKDOWN: TokenUsageBreakdownItem[] = [
  { label: "System prompt", tokens: 2400 },
  { label: "Conversation", tokens: 41000 },
  { label: "Files", tokens: 56600 },
];

afterEach(() => {
  vi.useRealTimers();
});

function arc(container: HTMLElement) {
  const circle = container.querySelector<SVGCircleElement>("[data-part='arc']");
  if (!circle) throw new Error("no arc");
  return circle;
}

describe("formatTokensCompact", () => {
  it.each([
    [950, "950"],
    [1800, "1.8K"],
    [48000, "48K"],
    [200000, "200K"],
    [1500000, "1.5M"],
  ])("formats %d as %s", (value, text) => {
    expect(formatTokensCompact(value, "en")).toBe(text);
  });

  it("reuses a formatter per locale and follows the locale", () => {
    expect(formatTokensCompact(1800, "en")).toBe(formatTokensCompact(1800, "en"));
    expect(formatTokensCompact(1500, "de")).not.toBe(formatTokensCompact(1500, "en"));
  });
});

describe("TokenUsage notation", () => {
  it("abbreviates the visible numbers with notation='compact'", () => {
    render(<TokenUsage used={48000} limit={200000} notation="compact" />);
    expect(
      screen.getByText(`${formatTokensCompact(48000)} / ${formatTokensCompact(200000)}`),
    ).toBeInTheDocument();
  });

  it("lets format win over notation", () => {
    render(<TokenUsage used={48000} limit={200000} notation="compact" format={() => "x"} />);
    expect(screen.getByText("x / x")).toBeInTheDocument();
  });

  it("applies to TokenCount too", () => {
    render(<TokenCount value={48000} notation="compact" />);
    expect(screen.getByText(`${formatTokensCompact(48000)} tokens`)).toBeInTheDocument();
  });
});

describe("TokenUsage dangerAt", () => {
  it("reads as critical past dangerAt, before the limit", () => {
    const { container } = render(<TokenUsage used={960} limit={1000} dangerAt={0.95} />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-danger", "true");
    expect(root).not.toHaveAttribute("data-over");
    expect(screen.getByText(/960/)).toHaveClass("text-destructive");
    expect(container.querySelector("[aria-hidden='true'] > div")).toHaveClass("bg-destructive");
  });

  it("only warns between warnAt and dangerAt", () => {
    const { container } = render(<TokenUsage used={900} limit={1000} dangerAt={0.95} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-danger");
    expect(screen.getByText(/900/)).toHaveClass("text-warning");
  });

  it("keeps today's behaviour without dangerAt", () => {
    const { container } = render(<TokenUsage used={960} limit={1000} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-danger");
    expect(screen.getByText(/960/)).toHaveClass("text-warning");
  });
});

describe("TokenUsage breakdown (bar)", () => {
  it("lists each item as a term and a count", () => {
    const { container } = render(
      <TokenUsage used={100000} limit={200000} breakdown={BREAKDOWN} />,
    );
    const list = container.querySelector("dl[data-slot='token-usage-breakdown']");
    expect(list?.querySelectorAll("dt")).toHaveLength(3);
    expect(list?.querySelectorAll("dd")).toHaveLength(3);
    expect(screen.getByText("Files").nextElementSibling).toHaveTextContent("56,600");
  });

  it("renders standalone with a formatter and a className", () => {
    render(
      <TokenUsageBreakdown
        items={BREAKDOWN}
        format={(value) => `${String(value)}t`}
        className="gap-3"
      />,
    );
    expect(screen.getByText("2400t")).toBeInTheDocument();
    expect(screen.getByText("2400t").closest("dl")).toHaveClass("gap-3");
  });
});

describe("TokenUsage variant='ring'", () => {
  it("draws two circles in a hidden svg, with the arc at the clamped fraction", () => {
    const { container, rerender } = render(<TokenUsage variant="ring" used={50} limit={200} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelectorAll("circle")).toHaveLength(2);
    expect(arc(container).style.strokeDasharray).toBe("0.25 0.75");

    rerender(<TokenUsage variant="ring" used={900} limit={200} />);
    expect(arc(container).style.strokeDasharray).toBe("1 0");
  });

  it("changes hue, never size", () => {
    const geometry = (used: number) => {
      const { container, unmount } = render(
        <TokenUsage variant="ring" used={used} limit={1000} dangerAt={0.95} />,
      );
      const circle = arc(container);
      const result = {
        r: circle.getAttribute("r"),
        width: circle.getAttribute("stroke-width"),
        svg: container.querySelector("svg")?.getAttribute("class"),
        tone: circle.getAttribute("class"),
      };
      unmount();
      return result;
    };
    const calm = geometry(100);
    const warning = geometry(900);
    const danger = geometry(960);
    const over = geometry(1200);
    for (const state of [warning, danger, over]) {
      expect(state.r).toBe(calm.r);
      expect(state.width).toBe(calm.width);
      expect(state.svg).toBe(calm.svg);
    }
    expect(calm.tone).toContain("stroke-primary");
    expect(warning.tone).toContain("stroke-warning");
    expect(danger.tone).toContain("stroke-destructive");
    expect(over.tone).toContain("stroke-destructive");
  });

  it("shows compact numbers visually and full numbers to assistive technology", () => {
    const { container } = render(<TokenUsage variant="ring" used={48000} limit={200000} />);
    expect(container).toHaveTextContent(
      `${formatTokensCompact(48000)}/${formatTokensCompact(200000)}`,
    );
    expect(screen.getByText("Context used: 48,000 of 200,000 tokens, 24%")).toHaveClass(
      "sr-only",
    );
  });

  it("words the critical states in the ring's sentence", () => {
    const { rerender } = render(
      <TokenUsage variant="ring" used={960} limit={1000} dangerAt={0.95} />,
    );
    expect(screen.getByText(/, nearly full$/)).toBeInTheDocument();
    rerender(<TokenUsage variant="ring" used={1200} limit={1000} />);
    expect(screen.getByText(/, over the limit$/)).toBeInTheDocument();
  });

  it("renders no button without a breakdown", () => {
    render(<TokenUsage variant="ring" used={1} limit={10} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is safe with a zero limit", () => {
    const { container } = render(<TokenUsage variant="ring" used={10} limit={0} />);
    expect(arc(container).style.strokeDasharray).toBe("0 1");
    expect(arc(container)).toHaveAttribute("stroke-linecap", "butt");
  });

  it("merges a className and has no accessibility violations", async () => {
    const { container } = render(
      <TokenUsage variant="ring" used={120000} limit={200000} className="text-sm" />,
    );
    expect(container.firstElementChild).toHaveClass("inline-flex", "text-sm");
    expect(container.firstElementChild).not.toHaveClass("text-xs");
    await expectNoA11yViolations(container);
  });
});

describe("TokenUsage ring breakdown popover", () => {
  function Ring() {
    return (
      <>
        <TokenUsage variant="ring" used={100000} limit={200000} breakdown={BREAKDOWN} />
        <button type="button">Elsewhere</button>
      </>
    );
  }

  it("is a real button named by the full sentence", () => {
    render(<Ring />);
    const trigger = screen.getByRole("button", {
      name: "Context used: 100,000 of 200,000 tokens, 50%",
    });
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute("data-slot", "token-usage-trigger");
  });

  it("opens with Enter and closes with Escape, returning focus", async () => {
    const user = userEvent.setup();
    render(<Ring />);
    const trigger = screen.getByRole("button", { name: /Context used/ });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "Context breakdown" });
    expect(dialog).toHaveTextContent("Conversation");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("does not open on focus alone", async () => {
    const user = userEvent.setup();
    render(<Ring />);
    await user.tab();
    expect(screen.getByRole("button", { name: /Context used/ })).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on mouse hover without moving focus, and closes after a grace", () => {
    vi.useFakeTimers();
    render(<Ring />);
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    const trigger = screen.getByRole("button", { name: /Context used/ });

    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    expect(screen.getByRole("dialog", { name: "Context breakdown" })).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();

    fireEvent.pointerOut(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Crossing into the card cancels the close.
    fireEvent.pointerOver(screen.getByRole("dialog"), { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerOut(screen.getByRole("dialog"), { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores touch hover", () => {
    render(<Ring />);
    fireEvent.pointerOver(screen.getByRole("button", { name: /Context used/ }), {
      pointerType: "touch",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pins a hover-opened breakdown on click instead of closing it", () => {
    vi.useFakeTimers();
    render(<Ring />);
    const trigger = screen.getByRole("button", { name: /Context used/ });
    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Pinned: leaving no longer closes it.
    fireEvent.pointerOut(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Ring />);
    await user.click(screen.getByRole("button", { name: /Context used/ }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
