import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CopyButton } from "./copy-button";

/**
 * Replaces the clipboard.
 *
 * Must be called *after* `userEvent.setup()`, which installs a clipboard stub
 * of its own — applying ours first means testing theirs.
 */
function mockClipboard(impl: (text: string) => Promise<void>) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

function setup() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

function button() {
  return document.querySelector<HTMLButtonElement>('[data-slot="copy-button"]');
}

beforeEach(() => {
  // Real time still advances so userEvent's own scheduling resolves; the
  // assertions leave a margin either side of each boundary.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("renders an icon-only button named Copy by default", () => {
    render(<CopyButton value="abc" />);
    const element = screen.getByRole("button", { name: "Copy" });
    expect(element).toHaveAttribute("data-state", "idle");
    expect(element).toHaveClass("size-9");
  });

  it("uses a visible label as its name when given one", () => {
    render(<CopyButton value="abc">Copy hash</CopyButton>);
    expect(screen.getByRole("button", { name: "Copy hash" })).toHaveClass("h-9");
  });

  it("copies the value, confirms, announces and reverts after the timeout", async () => {
    const user = setup();
    const writeText = mockClipboard(() => Promise.resolve());
    const onCopied = vi.fn();
    render(
      <CopyButton value="0xabc" onCopied={onCopied}>
        Copy hash
      </CopyButton>,
    );

    await user.click(screen.getByRole("button"));

    expect(writeText).toHaveBeenCalledWith("0xabc");
    expect(onCopied).toHaveBeenCalledWith("0xabc");
    expect(button()).toHaveAttribute("data-state", "copied");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(button()).toHaveAttribute("data-state", "copied");

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(button()).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Copy hash" })).toBeInTheDocument();
  });

  it("reads a function value at the moment of the click", async () => {
    const user = setup();
    const writeText = mockClipboard(() => Promise.resolve());
    let current = "first";
    render(<CopyButton value={() => current} />);

    current = "second";
    await user.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith("second");
  });

  it("reports a refused write and never shows the success state", async () => {
    const user = setup();
    const error = new Error("denied");
    mockClipboard(() => Promise.reject(error));
    const onCopied = vi.fn();
    const onCopyError = vi.fn();
    render(<CopyButton value="abc" onCopied={onCopied} onCopyError={onCopyError} />);

    await user.click(screen.getByRole("button"));

    expect(onCopyError).toHaveBeenCalledWith(error);
    expect(onCopied).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute("data-state", "error");
    expect(screen.getByRole("status")).toHaveTextContent("Copy failed");
    expect(screen.getByRole("status")).not.toHaveTextContent("Copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button()).toHaveAttribute("data-state", "idle");
  });

  it("treats a missing clipboard API as a failure", async () => {
    const user = setup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const onCopyError = vi.fn();
    render(<CopyButton value="abc" onCopyError={onCopyError} />);

    await user.click(screen.getByRole("button"));
    expect(onCopyError).toHaveBeenCalledTimes(1);
    expect(button()).toHaveAttribute("data-state", "error");
  });

  it("restarts the timer on a second copy", async () => {
    const user = setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="abc" timeout={2000} />);

    await user.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    await user.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(button()).toHaveAttribute("data-state", "copied");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(button()).toHaveAttribute("data-state", "idle");
  });

  it("copies from the keyboard with Enter and Space", async () => {
    const user = setup();
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyButton value="abc" />);

    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(button()).toHaveFocus();
    expect(button()).not.toBeDisabled();
  });

  it("skips the copy when the consumer's onClick prevents default", async () => {
    const user = setup();
    const writeText = mockClipboard(() => Promise.resolve());
    render(
      <CopyButton
        value="abc"
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(writeText).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute("data-state", "idle");
  });

  it("hides the inactive icon and label from assistive technology", async () => {
    const user = setup();
    mockClipboard(() => Promise.resolve());
    render(
      <CopyButton value="abc" copiedLabel="Done">
        Copy
      </CopyButton>,
    );
    expect(screen.getByText("Done")).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Copy")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Done")).not.toHaveAttribute("aria-hidden");
  });

  it("accepts custom icons", async () => {
    const user = setup();
    mockClipboard(() => Promise.resolve());
    render(
      <CopyButton
        value="abc"
        icon={<span data-testid="idle-icon" />}
        copiedIcon={<span data-testid="done-icon" />}
      />,
    );
    expect(screen.getByTestId("idle-icon")).toBeInTheDocument();
    expect(screen.getByTestId("done-icon").parentElement).toHaveClass("opacity-0");

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("done-icon").parentElement).toHaveClass("opacity-100");
    expect(screen.getByTestId("idle-icon").parentElement).toHaveClass("opacity-0");
  });

  it.each([
    ["primary", "text-primary"],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
    ["info", "text-info"],
  ] as const)("colours the confirmation icon with the %s tone", (tone, expected) => {
    render(<CopyButton value="abc" tone={tone} copiedIcon={<span data-testid="done" />} />);
    expect(screen.getByTestId("done").parentElement).toHaveClass(expected);
  });

  it("defaults to the outline variant and accepts another", () => {
    const { rerender } = render(<CopyButton value="abc" />);
    expect(button()).toHaveClass("border-input");
    rerender(<CopyButton value="abc" variant="ghost" />);
    expect(button()).not.toHaveClass("border-input");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<CopyButton value="abc" className="size-12 rounded-full" />);
    expect(button()).toHaveClass("size-12", "rounded-full");
    expect(button()).not.toHaveClass("size-9");
  });

  it("forwards a ref and native props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<CopyButton ref={ref} value="abc" aria-label="Copy address" title="Copy" />);
    expect(ref.current).toBe(button());
    expect(screen.getByRole("button", { name: "Copy address" })).toHaveAttribute(
      "title",
      "Copy",
    );
  });

  it("does not copy while disabled", async () => {
    const user = setup();
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyButton value="abc" disabled />);
    await user.click(screen.getByRole("button"));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("clears its timer on unmount", async () => {
    const user = setup();
    mockClipboard(() => Promise.resolve());
    const { unmount } = render(<CopyButton value="abc" />);
    await user.click(screen.getByRole("button"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe("deprecated Code Block aliases", () => {
    it("copies from getText when no value is given", async () => {
      const user = setup();
      const writeText = mockClipboard(() => Promise.resolve());
      render(<CopyButton getText={() => "from getText"} />);

      await user.click(screen.getByRole("button"));
      expect(writeText).toHaveBeenCalledWith("from getText");
    });

    it("prefers value over getText", async () => {
      const user = setup();
      const writeText = mockClipboard(() => Promise.resolve());
      render(<CopyButton value="from value" getText={() => "from getText"} />);

      await user.click(screen.getByRole("button"));
      expect(writeText).toHaveBeenCalledWith("from value");
    });

    it("uses resetAfter as the timeout, and timeout wins when both are given", async () => {
      const user = setup();
      mockClipboard(() => Promise.resolve());
      const { unmount } = render(<CopyButton value="abc" resetAfter={500} />);

      await user.click(screen.getByRole("button"));
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(button()).toHaveAttribute("data-state", "idle");
      unmount();

      render(<CopyButton value="abc" resetAfter={500} timeout={3000} />);
      await user.click(screen.getByRole("button"));
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(button()).toHaveAttribute("data-state", "copied");
    });

    it("names an icon-only button with label, and aria-label wins over it", () => {
      const { rerender } = render(<CopyButton value="abc" label="Copy code" />);
      expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();

      rerender(<CopyButton value="abc" label="Copy code" aria-label="Copy snippet" />);
      expect(screen.getByRole("button", { name: "Copy snippet" })).toBeInTheDocument();
    });

    it("does not let label replace a visible label", () => {
      render(
        <CopyButton value="abc" label="Copy code">
          Copy hash
        </CopyButton>,
      );
      expect(screen.getByRole("button", { name: "Copy hash" })).toBeInTheDocument();
    });

    it("announces a string copiedLabel on an icon-only button, as the old API did", async () => {
      const user = setup();
      mockClipboard(() => Promise.resolve());
      render(<CopyButton getText={() => "abc"} copiedLabel="Code copied" />);

      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("status")).toHaveTextContent("Code copied");
    });

    it("warns and reports a failure when there is nothing to copy", async () => {
      const user = setup();
      const writeText = mockClipboard(() => Promise.resolve());
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const onCopyError = vi.fn();
      // Untyped callers can omit both; the type cannot.
      const props = { onCopyError } as unknown as Parameters<typeof CopyButton>[0];
      render(<CopyButton {...props} />);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("pass `value`"));
      await user.click(screen.getByRole("button"));
      expect(writeText).not.toHaveBeenCalled();
      expect(onCopyError).toHaveBeenCalledTimes(1);
      expect(button()).toHaveAttribute("data-state", "error");
    });
  });

  it("has no accessibility violations, idle or confirming", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    const { container } = render(
      <div>
        <CopyButton value="abc" />
        <CopyButton value="abc">Copy hash</CopyButton>
      </div>,
    );
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole("button", { name: "Copy hash" }));
    await expectNoA11yViolations(container);
  });
});
