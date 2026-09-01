import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CodeBlock } from "./code-block";

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
  vi.restoreAllMocks();
});

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

    it("can be hidden", () => {
      render(
        <CodeBlock language="ts" hideCopy>
          {SAMPLE}
        </CodeBlock>,
      );
      expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
    });
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
