import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  describeShortcut,
  detectPlatform,
  formatShortcut,
  needsModifier,
  parseShortcut,
  serializeShortcut,
  shortcutFromKey,
} from "./shortcut-model";
import { ShortcutRecorder, type ShortcutRecorderProps } from "./shortcut-recorder";

function Example(props: Partial<ShortcutRecorderProps> = {}) {
  return <ShortcutRecorder label="Open search" platform="mac" onChange={vi.fn()} {...props} />;
}

const recorder = () => screen.getByRole("button", { name: "Open search" });
const status = () => screen.getByRole("status");

/** A keydown on the recorder, the way a browser sends it. */
function press(key: string, options: Partial<KeyboardEventInit> & { code?: string } = {}) {
  fireEvent.keyDown(recorder(), { key, code: options.code ?? "", ...options });
}

describe("shortcut model", () => {
  describe("parseShortcut", () => {
    it("reads the stored form and the spellings people use", () => {
      expect(parseShortcut("Mod+Shift+K")).toEqual({
        key: "K",
        mod: true,
        ctrl: false,
        alt: false,
        shift: true,
      });
      expect(parseShortcut("cmd+k")).toMatchObject({ key: "K", mod: true });
      expect(parseShortcut("Option+Up")).toMatchObject({ key: "ArrowUp", alt: true });
      expect(parseShortcut("Ctrl+Space")).toMatchObject({ key: "Space", ctrl: true });
    });

    it("refuses nothing, only modifiers, and two keys", () => {
      expect(() => parseShortcut("")).toThrow("Enter a shortcut.");
      expect(() => parseShortcut("Mod+Shift")).toThrow(/only modifiers/);
      expect(() => parseShortcut("Mod+K+J")).toThrow(/two keys/);
    });

    it("round-trips through the stored form, modifiers in a fixed order", () => {
      expect(serializeShortcut(parseShortcut("Shift+Alt+Mod+K"))).toBe("Mod+Alt+Shift+K");
    });
  });

  describe("shortcutFromKey", () => {
    it("is null while only modifiers are held", () => {
      expect(
        shortcutFromKey(
          {
            key: "Meta",
            code: "MetaLeft",
            metaKey: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
          },
          "mac",
        ),
      ).toBeNull();
    });

    it("reads letters from the code, so Option-K is K and not ˚", () => {
      const chord = shortcutFromKey(
        {
          key: "˚",
          code: "KeyK",
          metaKey: false,
          ctrlKey: false,
          altKey: true,
          shiftKey: false,
        },
        "mac",
      );
      expect(chord).toMatchObject({ key: "K", alt: true });
    });

    it("makes Mod from Meta on a Mac and from Control elsewhere", () => {
      const meta = {
        key: "k",
        code: "KeyK",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      };
      const ctrl = {
        key: "k",
        code: "KeyK",
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      };

      expect(shortcutFromKey(meta, "mac")).toMatchObject({ mod: true, ctrl: false });
      expect(shortcutFromKey(ctrl, "mac")).toMatchObject({ mod: false, ctrl: true });
      expect(shortcutFromKey(ctrl, "other")).toMatchObject({ mod: true, ctrl: false });
    });

    it("reads digits from the code and names other keys canonically", () => {
      expect(
        shortcutFromKey(
          {
            key: "!",
            code: "Digit1",
            metaKey: false,
            ctrlKey: false,
            altKey: false,
            shiftKey: true,
          },
          "mac",
        ),
      ).toMatchObject({ key: "1", shift: true });
      expect(
        shortcutFromKey(
          {
            key: " ",
            code: "Space",
            metaKey: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
          },
          "mac",
        ),
      ).toMatchObject({ key: "Space" });
    });
  });

  it("formats symbols for a Mac and words for everyone else", () => {
    const chord = parseShortcut("Mod+Shift+K");
    expect(formatShortcut(chord, "mac")).toBe("⌘⇧K");
    expect(formatShortcut(chord, "other")).toBe("Control+Shift+K");
    expect(formatShortcut(parseShortcut("Alt+ArrowUp"), "mac")).toBe("⌥↑");
  });

  it("describes for the ear, in the platform's own words", () => {
    expect(describeShortcut(parseShortcut("Mod+Alt+K"), "mac")).toBe("Command Option K");
    expect(describeShortcut(parseShortcut("Mod+Alt+K"), "other")).toBe("Control Alt K");
    expect(describeShortcut(parseShortcut("Shift+ArrowUp"), "other")).toBe("Shift Arrow Up");
  });

  it("says a bare printable key needs a modifier, and a function key does not", () => {
    expect(needsModifier(parseShortcut("K"))).toBe(true);
    expect(needsModifier(parseShortcut("Shift+K"))).toBe(true);
    expect(needsModifier(parseShortcut("Mod+K"))).toBe(false);
    expect(needsModifier(parseShortcut("F5"))).toBe(false);
  });

  it("detects a Mac, and assumes otherwise", () => {
    expect(detectPlatform()).toBe("other");
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    expect(detectPlatform()).toBe("mac");
    Object.defineProperty(navigator, "platform", { value: "", configurable: true });
  });
});

describe("ShortcutRecorder", () => {
  it("is a button named for what the shortcut does, described by its value", () => {
    render(<Example value="Mod+K" />);

    expect(recorder()).toHaveAccessibleDescription("Command K. Press to change.");
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("says when nothing is set", () => {
    render(<Example />);
    expect(recorder()).toHaveAccessibleDescription("Not set. Press to record.");
    expect(screen.queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument();
  });

  it("shows words instead of symbols off a Mac", () => {
    render(<Example value="Mod+Shift+K" platform="other" />);
    expect(recorder()).toHaveAccessibleDescription("Control Shift K. Press to change.");
    expect(screen.getByText("Control")).toBeInTheDocument();
  });

  describe("recording", () => {
    it("starts on press, says what to do, and records a chord", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(recorder());
      expect(recorder()).toHaveAttribute("aria-pressed", "true");
      expect(recorder()).toHaveAccessibleDescription(/Press the keys you want/);

      press("k", { code: "KeyK", metaKey: true, shiftKey: true });

      expect(onChange).toHaveBeenCalledWith("Mod+Shift+K");
      expect(status()).toHaveTextContent("Recorded Command Shift K.");
      expect(recorder()).toHaveAttribute("aria-pressed", "false");
    });

    it("shows the modifiers as they are held", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(recorder());
      press("Meta", { code: "MetaLeft", metaKey: true });
      expect(screen.getByText("⌘")).toBeInTheDocument();

      fireEvent.keyUp(recorder(), { key: "Meta", metaKey: false });
      expect(screen.queryByText("⌘")).not.toBeInTheDocument();
    });

    it("cancels on Escape, and on losing focus", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} value="Mod+K" />);

      await user.click(recorder());
      press("Escape");
      expect(status()).toHaveTextContent("Cancelled.");
      expect(recorder()).toHaveAttribute("aria-pressed", "false");

      await user.click(recorder());
      fireEvent.blur(recorder());
      expect(recorder()).toHaveAttribute("aria-pressed", "false");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("lets Tab leave, so it is not a keyboard trap", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <>
          <Example onChange={onChange} />
          <button type="button">After</button>
        </>,
      );

      await user.click(recorder());
      await user.tab();

      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
      expect(recorder()).toHaveAttribute("aria-pressed", "false");
    });

    it("clears on Backspace while recording", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} value="Mod+K" />);

      await user.click(recorder());
      press("Backspace");

      expect(onChange).toHaveBeenCalledWith(null);
      expect(status()).toHaveTextContent("Cleared.");
    });

    it("refuses a bare printable key, says why, and keeps listening", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} />);

      await user.click(recorder());
      press("k", { code: "KeyK" });

      expect(onChange).not.toHaveBeenCalled();
      expect(status()).toHaveTextContent(/K needs a modifier — it would fire while typing/);
      expect(recorder()).toHaveAttribute("aria-pressed", "true");

      press("F5", { code: "F5" });
      expect(onChange).toHaveBeenCalledWith("F5");
    });

    it("allows a bare key when told to", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} requireModifier={false} />);

      await user.click(recorder());
      press("?", { code: "Slash", shiftKey: true });

      expect(onChange).toHaveBeenCalledWith("Shift+?");
    });

    it("stores Mod whichever platform recorded it", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} platform="other" />);

      await user.click(recorder());
      press("k", { code: "KeyK", ctrlKey: true });

      expect(onChange).toHaveBeenCalledWith("Mod+K");
    });
  });

  describe("conflicts", () => {
    const taken = [{ shortcut: "Mod+K", label: "Search" }];

    it("says who has the chord, and does not apply it", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} taken={taken} />);

      await user.click(recorder());
      press("k", { code: "KeyK", metaKey: true });

      expect(onChange).not.toHaveBeenCalled();
      expect(status()).toHaveTextContent("Command K is already used by Search.");
      expect(screen.getByRole("button", { name: "Use anyway" })).toBeInTheDocument();
    });

    it("applies it on request, and says what that costs", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} taken={taken} />);

      await user.click(recorder());
      press("k", { code: "KeyK", metaKey: true });
      await user.click(screen.getByRole("button", { name: "Use anyway" }));

      expect(onChange).toHaveBeenCalledWith("Mod+K");
      expect(status()).toHaveTextContent(/Search no longer has a shortcut/);
      expect(screen.queryByRole("button", { name: "Use anyway" })).not.toBeInTheDocument();
    });

    it("can be declined", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} taken={taken} value="Mod+J" />);

      await user.click(recorder());
      press("k", { code: "KeyK", metaKey: true });
      await user.click(screen.getByRole("button", { name: "Keep the old one" }));

      expect(onChange).not.toHaveBeenCalled();
      expect(recorder()).toHaveAccessibleDescription("Command J. Press to change.");
    });

    it("does not call re-recording the current value a conflict", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onChange={onChange} taken={taken} value="Mod+K" />);

      await user.click(recorder());
      press("k", { code: "KeyK", metaKey: true });

      expect(onChange).toHaveBeenCalledWith("Mod+K");
      expect(screen.queryByRole("button", { name: "Use anyway" })).not.toBeInTheDocument();
    });
  });

  it("clears from the button", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onChange={onChange} value="Mod+K" />);

    await user.click(screen.getByRole("button", { name: "Clear — Open search" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("works uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Example onChange={undefined} defaultValue="Mod+J" />);

    expect(recorder()).toHaveAccessibleDescription("Command J. Press to change.");
    await user.click(recorder());
    press("k", { code: "KeyK", metaKey: true });
    expect(recorder()).toHaveAccessibleDescription("Command K. Press to change.");
  });

  it("has its announcement region in place from the start", () => {
    render(<Example />);
    expect(status()).toBeEmptyDOMElement();
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="gap-4" />);
    const root = container.querySelector("[data-slot='shortcut-recorder']");
    expect(root).toHaveClass("gap-4");
    expect(root).not.toHaveClass("gap-1.5");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} data-testid="recorder" />);
    expect(ref.current).toBe(screen.getByTestId("recorder"));
  });

  it("has no accessibility violations set, recording and in conflict", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Example value="Mod+K" taken={[{ shortcut: "Mod+J", label: "Jump" }]} />,
    );
    await expectNoA11yViolations(container);

    await user.click(recorder());
    await expectNoA11yViolations(container);

    press("j", { code: "KeyJ", metaKey: true });
    await expectNoA11yViolations(container);
  });
});
