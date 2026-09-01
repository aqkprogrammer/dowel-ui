import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  PromptInput,
  PromptInputCounter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "./ai-prompt-input";

function Example({
  onSubmit,
  onStop,
  busy = false,
  disabled = false,
  submitOnEnter = true,
}: {
  onSubmit?: () => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  submitOnEnter?: boolean;
} = {}) {
  return (
    <PromptInput
      busy={busy}
      disabled={disabled}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <PromptInputTextarea
        aria-label="Message"
        placeholder="Ask anything…"
        submitOnEnter={submitOnEnter}
      />
      <PromptInputToolbar>
        <PromptInputSubmit onStop={onStop} />
      </PromptInputToolbar>
    </PromptInput>
  );
}

describe("PromptInput", () => {
  it("submits on Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example onSubmit={onSubmit} />);

    await user.click(screen.getByRole("textbox"));
    await user.keyboard("Hello{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("inserts a newline on Shift+Enter instead of submitting", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example onSubmit={onSubmit} />);

    const textarea = screen.getByRole<HTMLTextAreaElement>("textbox");
    await user.click(textarea);
    await user.keyboard("Hello{Shift>}{Enter}{/Shift}world");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.value).toBe("Hello\nworld");
  });

  it("does not submit mid-IME-composition", () => {
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox");
    // Enter while an IME composition is active confirms the candidate — for
    // Japanese, Chinese and Korean input it is part of typing a word. Sending
    // there truncates the sentence, and it is the most common way a chat
    // composer breaks for those users.
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter", isComposing: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("can leave Enter as a newline entirely", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example onSubmit={onSubmit} submitOnEnter={false} />);

    await user.click(screen.getByRole("textbox"));
    await user.keyboard("Hello{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits from the send button", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  describe("while busy", () => {
    it("renames the control to say what it now does", () => {
      render(<Example busy />);
      expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
    });

    it("stops instead of submitting", async () => {
      const onSubmit = vi.fn();
      const onStop = vi.fn();
      const user = userEvent.setup();
      render(<Example busy onSubmit={onSubmit} onStop={onStop} />);

      await user.click(screen.getByRole("button", { name: "Stop generating" }));
      expect(onStop).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("ignores Enter", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<Example busy onSubmit={onSubmit} />);

      await user.click(screen.getByRole("textbox"));
      await user.keyboard("Hi{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("does not submit while disabled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Example disabled onSubmit={onSubmit} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("auto-growing", () => {
    /**
     * jsdom performs no layout, so scrollHeight is always 0. Stubbing the
     * prototype getter before render is what lets the sizing logic run at all;
     * without it this would assert against a stub of nothing.
     */
    function withScrollHeight(height: number, run: () => void) {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        get: () => height,
      });

      try {
        run();
      } finally {
        if (original) Object.defineProperty(HTMLElement.prototype, "scrollHeight", original);
      }
    }

    it("sizes itself to its content", () => {
      withScrollHeight(120, () => {
        render(<Example />);
        expect(screen.getByRole<HTMLTextAreaElement>("textbox").style.height).toBe("120px");
      });
    });

    it("stops growing at maxRows and scrolls instead", () => {
      withScrollHeight(4000, () => {
        render(
          <PromptInput>
            <PromptInputTextarea aria-label="Message" maxRows={4} />
          </PromptInput>,
        );

        const textarea = screen.getByRole<HTMLTextAreaElement>("textbox");
        // jsdom reports no line-height, so the component falls back to 20px.
        expect(textarea.style.height).toBe("80px");
        expect(textarea.style.overflowY).toBe("auto");
      });
    });

    it("does not scroll while it still fits", () => {
      withScrollHeight(40, () => {
        render(<Example />);
        expect(screen.getByRole<HTMLTextAreaElement>("textbox").style.overflowY).toBe("hidden");
      });
    });
  });

  it("throws a useful error if a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<PromptInputSubmit />)).toThrow(
      /must be rendered inside <PromptInput>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});

describe("PromptInputCounter", () => {
  function Counter({ value, max = 100 }: { value: number; max?: number }) {
    return <PromptInputCounter value={value} max={max} />;
  }

  it("shows the count", () => {
    render(<Counter value={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("stays silent during ordinary typing", () => {
    render(<Counter value={12} />);
    // The region exists and is live from the start, but has nothing in it —
    // announcing every keystroke would be unusable.
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("announces once the limit is close", () => {
    render(<Counter value={95} />);
    expect(screen.getByRole("status")).toHaveTextContent("5 characters remaining");
  });

  it("announces going over the limit", () => {
    render(<Counter value={110} />);
    expect(screen.getByRole("status")).toHaveTextContent("Over the limit by 10 characters");
  });

  it("is live from the start, so the first warning is not missed", () => {
    // A region that only becomes live when it matters misses the very change
    // that made it matter.
    render(<Counter value={1} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("shows the limit visually once warning", () => {
    render(<Counter value={95} />);
    expect(screen.getByText("95 / 100")).toBeInTheDocument();
  });

  it("updates as the value changes", async () => {
    const user = userEvent.setup();

    function Live() {
      const [value, setValue] = useState("");
      return (
        <>
          <textarea
            aria-label="Message"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
          <PromptInputCounter value={value.length} max={10} />
        </>
      );
    }

    render(<Live />);
    await user.type(screen.getByRole("textbox"), "abcdefghij");
    expect(screen.getByRole("status")).toHaveTextContent("0 characters remaining");
  });
});
