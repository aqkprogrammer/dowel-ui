import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { InlineCompletion } from "./ai-inline-completion";

function Example({
  suggestion = " and the rest of the sentence",
  initial = "The beginning",
  onAccept,
  onDismiss,
}: {
  suggestion?: string;
  initial?: string;
  onAccept?: (value: string) => void;
  onDismiss?: () => void;
} = {}) {
  const [value, setValue] = useState(initial);
  return (
    <InlineCompletion
      aria-label="Message"
      value={value}
      onValueChange={setValue}
      suggestion={suggestion}
      onAccept={onAccept}
      onDismiss={onDismiss}
    />
  );
}

function field(): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Message" });
}

function ghost(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-slot='inline-completion-suggestion']");
}

/**
 * Focus with the caret at the end — the state the field is actually in after
 * the user has typed, which is when a completion arrives. Neither jsdom nor a
 * real browser puts the caret at the end on a bare focus() call, so the tests
 * establish it explicitly rather than relying on the optimistic initial state.
 */
function focusAtEnd(): HTMLTextAreaElement {
  const element = field();
  element.focus();
  element.setSelectionRange(element.value.length, element.value.length);
  fireEvent.select(element);
  return element;
}

describe("InlineCompletion", () => {
  it("shows the suggestion after the value", () => {
    const { container } = render(<Example />);
    expect(ghost(container)?.textContent).toBe(" and the rest of the sentence");
  });

  it("shows nothing when there is no suggestion", () => {
    const { container } = render(<Example suggestion="" />);
    expect(ghost(container)).not.toBeInTheDocument();
  });

  it("keeps the ghost out of the accessibility tree", () => {
    // It is grey text painted behind a field; the live description carries it.
    const { container } = render(<Example />);
    const mirror = container.querySelector("[data-slot='inline-completion-ghost']");
    expect(mirror).toHaveAttribute("aria-hidden", "true");
  });

  describe("accepting", () => {
    it("takes the whole suggestion on Tab", async () => {
      const onAccept = vi.fn();
      const user = userEvent.setup();
      render(<Example onAccept={onAccept} />);

      focusAtEnd();
      await user.keyboard("{Tab}");

      expect(field()).toHaveValue("The beginning and the rest of the sentence");
      expect(onAccept).toHaveBeenCalledWith("The beginning and the rest of the sentence");
    });

    it("takes one word at a time with a modifier", async () => {
      const user = userEvent.setup();
      render(<Example />);

      focusAtEnd();
      await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

      expect(field()).toHaveValue("The beginning and");
    });

    it("takes the remainder when a single word is left", async () => {
      const user = userEvent.setup();
      render(<Example suggestion=" end" />);

      focusAtEnd();
      await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

      expect(field()).toHaveValue("The beginning end");
    });

    it("leaves the field alone when there is nothing to accept", async () => {
      const user = userEvent.setup();
      render(<Example suggestion="" />);

      focusAtEnd();
      await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

      expect(field()).toHaveValue("The beginning");
    });
  });

  describe("the keyboard is never trapped", () => {
    it("dismisses on Escape", async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<Example onDismiss={onDismiss} />);

      focusAtEnd();
      await user.keyboard("{Escape}");

      expect(ghost(container)).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("restores plain Tab once dismissed, so focus can leave", async () => {
      // Without this a keyboard user facing a suggestion cannot leave the
      // field at all: Tab would accept forever.
      const user = userEvent.setup();
      render(
        <>
          <Example />
          <button type="button">After</button>
        </>,
      );

      focusAtEnd();
      await user.keyboard("{Escape}");
      await user.keyboard("{Tab}");

      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      expect(field()).toHaveValue("The beginning");
    });

    it("does not intercept Tab when nothing is suggested", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Example suggestion="" />
          <button type="button">After</button>
        </>,
      );

      focusAtEnd();
      await user.keyboard("{Tab}");

      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    });

    it("offers the suggestion again after the next edit", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example />);

      focusAtEnd();
      await user.keyboard("{Escape}");
      expect(ghost(container)).not.toBeInTheDocument();

      await user.type(field(), "!");
      expect(ghost(container)).toBeInTheDocument();
    });
  });

  describe("when the ghost would be wrong", () => {
    it("hides while the caret is not at the end", () => {
      const { container } = render(<Example />);

      const element = field();
      element.setSelectionRange(3, 3);
      fireEvent.select(element);

      expect(ghost(container)).not.toBeInTheDocument();
    });

    it("returns once the caret goes back to the end", () => {
      const { container } = render(<Example />);
      const element = field();

      element.setSelectionRange(3, 3);
      fireEvent.select(element);
      expect(ghost(container)).not.toBeInTheDocument();

      element.setSelectionRange(element.value.length, element.value.length);
      fireEvent.select(element);
      expect(ghost(container)).toBeInTheDocument();
    });

    it("hides during IME composition", () => {
      // Mid-composition the value is provisional, so a completion of it is
      // meaningless and visually collides with the candidate window.
      const { container } = render(<Example />);

      fireEvent.compositionStart(field());
      expect(ghost(container)).not.toBeInTheDocument();

      fireEvent.compositionEnd(field());
      expect(ghost(container)).toBeInTheDocument();
    });
  });

  describe("announcement", () => {
    it("describes the suggestion and how to take it", () => {
      const { container } = render(<Example />);

      // textContent, not getByText: the latter collapses whitespace and the
      // suggestion legitimately begins with a space.
      const live = container.querySelector(".sr-only");
      expect(live?.textContent).toBe(
        "Suggestion:  and the rest of the sentence. Press Tab to accept, Escape to dismiss.",
      );
    });

    it("points the field at the description only while suggesting", async () => {
      const user = userEvent.setup();
      render(<Example />);

      expect(field()).toHaveAttribute("aria-describedby");

      focusAtEnd();
      await user.keyboard("{Escape}");

      expect(field()).not.toHaveAttribute("aria-describedby");
    });

    it("announces politely rather than interrupting typing", () => {
      const { container } = render(<Example />);
      const live = container.querySelector(".sr-only");
      expect(live).toHaveAttribute("aria-live", "polite");
    });
  });

  it("still behaves as a normal field", async () => {
    const user = userEvent.setup();
    render(<Example initial="" suggestion="" />);

    await user.type(field(), "hello");
    expect(field()).toHaveValue("hello");
  });

  it("forwards a consumer's key handler and respects preventDefault", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });

    function Custom() {
      const [value, setValue] = useState("The beginning");
      return (
        <InlineCompletion
          aria-label="Message"
          value={value}
          onValueChange={setValue}
          suggestion=" more"
          onKeyDown={onKeyDown}
        />
      );
    }

    render(<Custom />);
    focusAtEnd();
    await user.keyboard("{Tab}");

    expect(onKeyDown).toHaveBeenCalled();
    // The consumer cancelled the event, so the suggestion was not taken.
    expect(field()).toHaveValue("The beginning");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
