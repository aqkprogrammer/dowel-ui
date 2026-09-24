import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CodeBlock, codeBlockVariants } from "./code-block";

const SAMPLE = 'const answer = "Paris";';

/**
 * Replaces the clipboard.
 *
 * Must be called *after* `userEvent.setup()`, which installs a clipboard stub
 * of its own — applying ours first means testing theirs.
 */
function mockClipboard(impl: () => Promise<void>) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const THREE_LINES = "const a = 1;\nconst b = 2;\nconst c = 3;\n";

function root(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('[data-slot="code-block"]');
  if (!element) throw new Error("no code-block root");
  return element;
}

function gutterLines(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>('[data-slot="code-block-gutter"] [data-line]'),
  ];
}

function bands(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="code-block-highlight"]')];
}

describe("CodeBlock", () => {
  it("renders the code", () => {
    render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);
    expect(screen.getByText(SAMPLE)).toBeInTheDocument();
  });

  it("shows the language in the header", () => {
    render(<CodeBlock language="typescript">{SAMPLE}</CodeBlock>);
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("prefers a title over the language", () => {
    render(
      <CodeBlock language="ts" title="button.tsx">
        {SAMPLE}
      </CodeBlock>,
    );
    expect(screen.getByText("button.tsx")).toBeInTheDocument();
    expect(screen.queryByText("ts")).not.toBeInTheDocument();
  });

  it("is a focusable named region, since code scrolls sideways", () => {
    render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);

    const region = screen.getByRole("region", { name: "ts code" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("names the region after the title when there is one", () => {
    render(<CodeBlock title="button.tsx">{SAMPLE}</CodeBlock>);
    expect(screen.getByRole("region", { name: "button.tsx" })).toBeInTheDocument();
  });

  it("renders markup a highlighter has already produced", () => {
    render(
      <CodeBlock language="ts" code={SAMPLE}>
        <span className="token">const</span>
        <span> answer</span>
      </CodeBlock>,
    );
    expect(screen.getByText("const")).toBeInTheDocument();
  });

  describe("copying", () => {
    it("copies the text content", async () => {
      const user = userEvent.setup();
      const writeText = mockClipboard(() => Promise.resolve());
      render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);

      await user.click(screen.getByRole("button", { name: "Copy code" }));
      expect(writeText).toHaveBeenCalledWith(SAMPLE);
    });

    it("prefers the explicit code prop over reading the DOM", async () => {
      const user = userEvent.setup();
      const writeText = mockClipboard(() => Promise.resolve());
      render(
        <CodeBlock language="ts" code={SAMPLE}>
          <span>const</span>
          <span> answer</span>
        </CodeBlock>,
      );

      // Reading highlighted DOM back loses whitespace in ways that break pasted
      // code, which is why `code` exists.
      await user.click(screen.getByRole("button", { name: "Copy code" }));
      expect(writeText).toHaveBeenCalledWith(SAMPLE);
    });

    it("announces success, not just draws a tick", async () => {
      const user = userEvent.setup();
      mockClipboard(() => Promise.resolve());
      render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);

      await user.click(screen.getByRole("button", { name: "Copy code" }));
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("Copied");
      });
    });

    it("reports a refused clipboard rather than looking like success", async () => {
      const user = userEvent.setup();
      mockClipboard(() => Promise.reject(new Error("denied")));
      render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);

      await user.click(screen.getByRole("button", { name: "Copy code" }));
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("Copy failed");
      });
    });

    it("renders the shared Copy Button, sized for the header", () => {
      render(<CodeBlock language="ts">{SAMPLE}</CodeBlock>);
      const button = screen.getByRole("button", { name: "Copy code" });
      expect(button).toHaveAttribute("data-slot", "copy-button");
      expect(button).toHaveClass("ms-auto", "size-6", "text-muted-foreground");
      expect(button).not.toHaveClass("size-9", "border-input");
    });

    it("can be hidden", () => {
      render(
        <CodeBlock language="ts" hideCopy>
          {SAMPLE}
        </CodeBlock>,
      );
      expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
    });
  });

  it("renders the code prop when there are no children", () => {
    render(<CodeBlock language="ts" code={SAMPLE} />);
    expect(screen.getByText(SAMPLE)).toBeInTheDocument();
  });

  it("lets a consumer className win, and forwards its ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <CodeBlock ref={ref} id="snippet" className="rounded-none bg-card" code={SAMPLE} />,
    );
    expect(ref.current).toBe(root(container));
    expect(root(container)).toHaveAttribute("id", "snippet");
    expect(root(container)).toHaveClass("rounded-none", "bg-card");
    expect(root(container)).not.toHaveClass("rounded-lg", "bg-muted/40");
  });

  describe("accent", () => {
    it("is off by default, keeping the neutral frame", () => {
      const { container } = render(<CodeBlock code={SAMPLE} />);
      expect(root(container)).not.toHaveAttribute("data-accent");
      expect(root(container)).toHaveClass("border-border", "bg-muted/40");
      expect(root(container).style.getPropertyValue("--code-block-accent")).toBe("");
    });

    it("re-shades the surface, header, text and copy control from one colour", () => {
      const { container } = render(
        <CodeBlock accent="tomato" title="a.ts" style={{ maxHeight: 200 }} code={SAMPLE} />,
      );
      const block = root(container);
      expect(block).toHaveAttribute("data-accent");
      expect(block.style.getPropertyValue("--code-block-accent")).toBe("tomato");
      expect(block.style.maxHeight).toBe("200px");
      expect(block).toHaveClass(
        "bg-[var(--code-block-surface)]",
        "border-[var(--code-block-border)]",
        "text-[color:var(--code-block-text)]",
      );
      expect(block).not.toHaveClass("bg-muted/40", "border-border");
      expect(container.querySelector('[data-slot="code-block-header"]')).toHaveClass(
        "bg-[var(--code-block-header)]",
      );
      expect(screen.getByText("a.ts")).toHaveClass("text-[color:var(--code-block-muted)]");
      expect(screen.getByRole("button", { name: "Copy code" })).toHaveClass(
        "text-[color:var(--code-block-muted)]",
      );
    });

    it("mixes the ramp into the theme's own tokens, per mode", () => {
      render(<CodeBlock accent="#0af" code={SAMPLE} />);
      const sheet = document.head.querySelector('style[data-href="dowel-code-block"]');
      expect(sheet?.textContent).toContain(
        "--code-block-surface:color-mix(in oklab,var(--code-block-accent) 5%,var(--color-background))",
      );
      expect(sheet?.textContent).toContain(".dark [data-slot=code-block][data-accent]{");
    });
  });

  describe("line numbers", () => {
    it("numbers every line in a gutter hidden from assistive technology", () => {
      const { container } = render(<CodeBlock showLineNumbers code={THREE_LINES} />);
      const gutter = container.querySelector('[data-slot="code-block-gutter"]');
      expect(gutter).toHaveAttribute("aria-hidden", "true");
      expect(gutter).toHaveClass("select-none");
      // The trailing newline does not make a fourth line.
      expect(gutterLines(container).map((line) => line.dataset.line)).toEqual(["1", "2", "3"]);
      // Drawn by a pseudo-element, so no number is ever part of the text.
      expect(gutterLines(container)[0]).toBeEmptyDOMElement();
      expect(gutterLines(container)[0]).toHaveClass("before:content-[attr(data-line)]");
      expect(screen.getByRole("region")).toHaveTextContent(/^const a = 1;/);
    });

    it("leaves the numbers out of what is copied", async () => {
      const user = userEvent.setup();
      const writeText = mockClipboard(() => Promise.resolve());
      render(<CodeBlock showLineNumbers>{THREE_LINES}</CodeBlock>);
      await user.click(screen.getByRole("button", { name: "Copy code" }));
      expect(writeText).toHaveBeenCalledWith(THREE_LINES);
    });

    it("counts the lines of highlighted markup once it is rendered", () => {
      const { container } = render(
        <CodeBlock showLineNumbers>
          <span className="token">const</span>
          {" a = 1;\n"}
          <span className="token">const</span>
          {" b = 2;"}
        </CodeBlock>,
      );
      expect(gutterLines(container)).toHaveLength(2);
    });

    it("renders no gutter by default", () => {
      const { container } = render(<CodeBlock code={THREE_LINES} />);
      expect(container.querySelector('[data-slot="code-block-gutter"]')).toBeNull();
      expect(container.querySelector('[data-slot="code-block-lines"]')).toBeNull();
    });
  });

  describe("highlighted lines", () => {
    it("washes the given lines, one line tall at their offset", () => {
      const { container } = render(
        <CodeBlock showLineNumbers highlightLines={[2, 0, 9, 1.5]} code={THREE_LINES} />,
      );
      const [band] = bands(container);
      // Out of range and fractional lines are ignored.
      expect(bands(container)).toHaveLength(1);
      expect(band).toHaveAttribute("aria-hidden", "true");
      expect(band?.style.getPropertyValue("--code-block-line")).toBe("2");
      expect(band).toHaveClass("h-[1lh]", "top-[calc((var(--code-block-line)-1)*1lh)]");
      expect(
        gutterLines(container).map((line) => line.hasAttribute("data-highlighted")),
      ).toEqual([false, true, false]);
    });

    it("works without line numbers, and on highlighted markup", () => {
      const { container } = render(
        <CodeBlock highlightLines={[1]}>
          <span>one</span>
          {"\n"}
          <span>two</span>
        </CodeBlock>,
      );
      expect(container.querySelector('[data-slot="code-block-gutter"]')).toBeNull();
      expect(bands(container)).toHaveLength(1);
    });
  });

  describe("header and frame", () => {
    it("can hide the header, floating the copy control over the corner", () => {
      const { container } = render(<CodeBlock title="a.ts" showHeader={false} code={SAMPLE} />);
      expect(container.querySelector('[data-slot="code-block-header"]')).toBeNull();
      expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
      const button = screen.getByRole("button", { name: "Copy code" });
      expect(button).toHaveClass("absolute", "end-2", "top-2");
      expect(button).not.toHaveClass("ms-auto");
      // The region keeps its name.
      expect(screen.getByRole("region", { name: "a.ts" })).toBeInTheDocument();
    });

    it("can force the header on when it would have nothing in it", () => {
      const { container } = render(<CodeBlock hideCopy showHeader code={SAMPLE} />);
      expect(container.querySelector('[data-slot="code-block-header"]')).toBeInTheDocument();
    });

    it("renders bare code without a frame", () => {
      const { container } = render(
        <CodeBlock frame={false} title="a.ts" accent="tomato" code={SAMPLE} />,
      );
      const block = root(container);
      expect(block).not.toHaveClass("border", "rounded-lg", "bg-muted/40");
      expect(block).not.toHaveClass("bg-[var(--code-block-surface)]");
      expect(container.querySelector('[data-slot="code-block-header"]')).toBeNull();
      expect(screen.getByRole("button", { name: "Copy code" })).toHaveClass(
        "absolute",
        "bg-[var(--code-block-header)]",
      );
    });

    it("exports its frame variants", () => {
      expect(codeBlockVariants({ frame: false })).not.toContain("border");
      expect(codeBlockVariants()).toContain("rounded-lg");
    });
  });

  it("springs the copy control into a turning check that reverts after 1.5s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    mockClipboard(() => Promise.resolve());
    const { container } = render(<CodeBlock code={SAMPLE} />);
    const button = screen.getByRole("button", { name: "Copy code" });
    const check = container.querySelector('[data-slot="code-block-check"]');
    expect(button).toHaveClass("group/copy");
    expect(check).toHaveClass("-rotate-90", "group-data-[state=copied]/copy:rotate-0");
    expect(check).toHaveClass("ease-[var(--ease-overshoot)]");

    await user.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute("data-state", "copied");
    });
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(button).toHaveAttribute("data-state", "copied");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("has no accessibility violations with every feature on", async () => {
    mockClipboard(() => Promise.resolve());
    const { container } = render(
      <CodeBlock
        language="ts"
        title="answer.ts"
        accent="tomato"
        showLineNumbers
        highlightLines={[2]}
        code={THREE_LINES}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations", async () => {
    mockClipboard(() => Promise.resolve());
    const { container } = render(
      <CodeBlock language="ts" title="answer.ts">
        {SAMPLE}
      </CodeBlock>,
    );
    await expectNoA11yViolations(container);
  });
});
