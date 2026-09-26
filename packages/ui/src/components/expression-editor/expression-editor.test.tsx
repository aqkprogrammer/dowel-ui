import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExpressionEditor, type ExpressionEditorProps } from "./expression-editor";

const VARIABLES = { price: 12, qty: 3, discount: 0.1, user: { age: 36, name: "Ada" } };

function renderEditor(props: Partial<ExpressionEditorProps> = {}) {
  const user = userEvent.setup();
  const view = render(
    <ExpressionEditor
      label="Line total"
      variables={VARIABLES}
      resultDelay={0}
      locale="en-US"
      {...props}
    />,
  );
  return { user, ...view };
}

const field = () => screen.getByRole("combobox", { name: "Line total" });
const feedback = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot='expression-editor-feedback']");
const highlight = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot='expression-editor-highlight']");

afterEach(() => {
  vi.useRealTimers();
});

describe("ExpressionEditor", () => {
  it("is a named field with its result underneath", () => {
    const { container } = renderEditor({ defaultValue: "price * qty" });
    expect(field()).toHaveValue("price * qty");
    expect(field()).toHaveAttribute("aria-autocomplete", "list");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).not.toHaveAttribute("aria-controls");
    expect(feedback(container)).toHaveTextContent("= 36");
    expect(field()).toHaveAccessibleDescription("= 36");
  });

  it("paints the text behind the field, hidden from assistive technology", () => {
    const { container } = renderEditor({ defaultValue: "concat(price, 2) = 'a'" });
    const layer = highlight(container);
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer?.textContent).toBe("concat(price, 2) = 'a'");
    const kinds = [...(layer?.querySelectorAll("[data-token]") ?? [])].map((node) =>
      node.getAttribute("data-token"),
    );
    expect(kinds).toEqual([
      "function",
      "paren",
      "identifier",
      "comma",
      "number",
      "paren",
      "operator",
      "string",
    ]);
    expect(field()).toHaveClass("text-transparent", "caret-foreground");
  });

  it("marks an error by aria-invalid, a wavy underline and a message", () => {
    const { container } = renderEditor({ defaultValue: "prise * qty" });
    const message = "Unknown variable prise. Did you mean price?";
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(message);
    expect(feedback(container)).toHaveAttribute("data-state", "error");
    const underlined = highlight(container)?.querySelectorAll("[data-invalid]");
    expect([...(underlined ?? [])].map((node) => node.textContent).join("")).toBe("prise");
    expect(underlined?.[0]).toHaveClass("decoration-wavy");
    expect(container.firstChild).toHaveAttribute("data-invalid", "true");
  });

  it("underlines only part of a token when the error is part of one", () => {
    const { container } = renderEditor({ defaultValue: "user.agee" });
    const underlined = highlight(container)?.querySelector("[data-invalid]");
    expect(underlined).toHaveTextContent(/^agee$/);
  });

  it("says nothing about an empty field", () => {
    const { container } = renderEditor();
    expect(feedback(container)).toBeEmptyDOMElement();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).not.toHaveAttribute("aria-describedby");
  });

  it("updates the result after a pause, not on every keystroke", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const { container } = render(
      <ExpressionEditor label="Line total" variables={VARIABLES} defaultValue="price" />,
    );
    expect(feedback(container)).toHaveTextContent("= 12");
    await user.type(field(), " * 2");
    await user.keyboard("{Escape}");
    expect(feedback(container)).toHaveTextContent("= 12");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(feedback(container)).toHaveTextContent("= 24");
  });

  it("shows a value set from outside at once", () => {
    function Resettable() {
      const [value, setValue] = useState("price");
      return (
        <>
          <ExpressionEditor label="Line total" variables={VARIABLES} value={value} />
          <button type="button" onClick={() => setValue("qty")}>
            Reset
          </button>
        </>
      );
    }
    const { container } = render(<Resettable />);
    act(() => {
      screen.getByRole("button", { name: "Reset" }).click();
    });
    expect(feedback(container)).toHaveTextContent("= 3");
  });

  it("works controlled and uncontrolled", async () => {
    const onValueChange = vi.fn();
    const { user } = renderEditor({ defaultValue: "1", onValueChange });
    await user.type(field(), "+1");
    expect(field()).toHaveValue("1+1");
    expect(onValueChange).toHaveBeenLastCalledWith("1+1");

    function Controlled() {
      const [value, setValue] = useState("2");
      return (
        <ExpressionEditor
          aria-label="Controlled"
          value={value}
          onValueChange={(next) => setValue(next.toUpperCase())}
          resultDelay={0}
        />
      );
    }
    render(<Controlled />);
    const controlled = screen.getByRole("combobox", { name: "Controlled" });
    await user.type(controlled, " = true");
    expect(controlled).toHaveValue("2 = TRUE");
  });

  it("reports each settled result", () => {
    const onResultChange = vi.fn();
    renderEditor({ defaultValue: "qty * 2", onResultChange });
    expect(onResultChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: true, value: 6 }),
    );
  });

  it("formats the result as asked, and hides it when asked", () => {
    const { container, rerender } = renderEditor({
      defaultValue: "price",
      formatResult: (value) => `$${String(value)}.00`,
    });
    expect(feedback(container)).toHaveTextContent("= $12.00");
    rerender(
      <ExpressionEditor
        label="Line total"
        variables={VARIABLES}
        defaultValue="price"
        showResult={false}
      />,
    );
    expect(feedback(container)).toBeEmptyDOMElement();
  });

  it("still shows an error when the result is hidden", () => {
    const { container } = renderEditor({ defaultValue: "1 /", showResult: false });
    expect(feedback(container)).toHaveTextContent("Expected a value after /.");
  });

  it("speaks the result only while the field has focus", async () => {
    const { user, container } = renderEditor({ defaultValue: "price" });
    expect(feedback(container)).toHaveAttribute("aria-live", "off");
    await user.click(field());
    expect(feedback(container)).toHaveAttribute("aria-live", "polite");
  });

  describe("suggestions", () => {
    it("opens a listbox while a name is typed, with the first option active", async () => {
      const { user } = renderEditor();
      await user.type(field(), "pr");
      const list = screen.getByRole("listbox", { name: "Suggestions" });
      const option = within(list).getByRole("option", { name: "price, 12" });
      expect(field()).toHaveAttribute("aria-expanded", "true");
      expect(field()).toHaveAttribute("aria-controls", list.id);
      expect(field()).toHaveAttribute("aria-activedescendant", option.id);
      expect(option).toHaveAttribute("aria-selected", "true");
      expect(field()).toHaveFocus();
    });

    it("moves with the arrow keys, wrapping at either end", async () => {
      const { user } = renderEditor({ variables: { alpha: 1, apple: 2 } });
      await user.type(field(), "a");
      const options = screen.getAllByRole("option");
      expect(options.map((option) => option.getAttribute("aria-label"))).toEqual([
        "alpha, 1",
        "apple, 2",
        "abs, function: The number without its sign",
      ]);
      await user.keyboard("{ArrowDown}");
      expect(field()).toHaveAttribute("aria-activedescendant", options[1]?.id);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(field()).toHaveAttribute("aria-activedescendant", options[0]?.id);
      await user.keyboard("{ArrowUp}");
      expect(field()).toHaveAttribute("aria-activedescendant", options[2]?.id);
    });

    it("inserts a variable with Enter", async () => {
      const { user } = renderEditor();
      await user.type(field(), "2 * pr");
      await user.keyboard("{Enter}");
      expect(field()).toHaveValue("2 * price");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect((field() as HTMLInputElement).selectionStart).toBe(9);
    });

    it("inserts a function with Tab and puts the caret inside its parentheses", async () => {
      const { user } = renderEditor();
      await user.type(field(), "rou");
      await user.keyboard("{Tab}");
      expect(field()).toHaveValue("round(");
      expect(field()).toHaveFocus();
      expect((field() as HTMLInputElement).selectionStart).toBe(6);
    });

    it("does not double the parenthesis a function already has", async () => {
      const { user } = renderEditor({ defaultValue: "ro(price)" });
      await user.click(field());
      (field() as HTMLInputElement).setSelectionRange(2, 2);
      await user.keyboard("{Control>} {/Control}");
      await user.keyboard("{Enter}");
      expect(field()).toHaveValue("round(price)");
      expect((field() as HTMLInputElement).selectionStart).toBe(6);
    });

    it("goes on to a group's fields", async () => {
      const { user } = renderEditor();
      await user.type(field(), "us");
      await user.keyboard("{Enter}");
      expect(field()).toHaveValue("user.");
      expect(screen.getByRole("option", { name: "user.age, 36" })).toBeInTheDocument();
      await user.click(screen.getByRole("option", { name: 'user.name, "Ada"' }));
      expect(field()).toHaveValue("user.name");
      expect(field()).toHaveFocus();
    });

    it("closes on Escape without changing anything, and on Shift+Tab", async () => {
      const { user } = renderEditor();
      await user.type(field(), "pr");
      await user.keyboard("{Escape}");
      expect(field()).toHaveAttribute("aria-expanded", "false");
      expect(field()).toHaveValue("pr");
      await user.type(field(), "i");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(field()).toHaveValue("pri");
    });

    it("opens on request with Ctrl+Space or Alt+ArrowDown", async () => {
      const { user } = renderEditor({ defaultValue: "price * " });
      await user.click(field());
      await user.keyboard("{Control>} {/Control}");
      expect(screen.getAllByRole("option").length).toBeGreaterThan(4);
      await user.keyboard("{Escape}{Alt>}{ArrowDown}{/Alt}");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("stays shut when the caret leaves the name or text is selected", async () => {
      const { user } = renderEditor();
      await user.type(field(), "price + pr");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      await user.keyboard("{ArrowLeft>3/}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      await user.keyboard("{ArrowLeft>3/}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      await user.keyboard("{End}i");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      // React reads a changed selection on keyup; user-event does not extend
      // selections with Shift+Arrow, so the range is set directly.
      (field() as HTMLInputElement).setSelectionRange(8, 11);
      fireEvent.keyUp(field(), { key: "Shift" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("does not open when read-only", async () => {
      const { user } = renderEditor({ readOnly: true, defaultValue: "pr" });
      await user.click(field());
      await user.keyboard("{Control>} {/Control}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("has no detectable accessibility violations while open", async () => {
      const { user, baseElement } = renderEditor();
      await user.type(field(), "p");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      await expectNoA11yViolations(baseElement);
    });
  });

  describe("multiline", () => {
    it("is a textarea where Enter starts a new line", async () => {
      const { user } = renderEditor({ multiline: true, defaultValue: "price" });
      const textarea = screen.getByRole("textbox", { name: "Line total" });
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea).not.toHaveAttribute("role");
      await user.click(textarea);
      await user.keyboard("{End}{Enter}* qty");
      expect(textarea).toHaveValue("price\n* qty");
    });

    it("says how many suggestions there are, since a textarea cannot be expanded", async () => {
      const { user } = renderEditor({ multiline: true });
      const textarea = screen.getByRole("textbox", { name: "Line total" });
      await user.type(textarea, "q");
      expect(screen.getByRole("status")).toHaveTextContent("1 suggestion");
      expect(textarea).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
      await user.keyboard("{Enter}");
      expect(textarea).toHaveValue("qty");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("keeps line breaks out of a single-line field", () => {
      renderEditor({ value: "price\n* qty" });
      expect(field()).toHaveValue("price * qty");
    });
  });

  it("takes a description, and a label from outside", () => {
    render(
      <>
        <span id="outside">Discount rule</span>
        <ExpressionEditor
          aria-labelledby="outside"
          aria-describedby="extra"
          description="Use price and qty."
          defaultValue="1"
          fieldId="rule"
        />
        <span id="extra">Saved nightly.</span>
      </>,
    );
    const input = screen.getByRole("combobox", { name: "Discount rule" });
    expect(input).toHaveAttribute("id", "rule");
    expect(input).toHaveAccessibleDescription("Saved nightly. Use price and qty. = 1");
  });

  it("warns in development when it has no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<ExpressionEditor />);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Missing accessible name/));
    warn.mockRestore();
  });

  it("can be disabled, and invalid from outside", () => {
    const { container } = renderEditor({
      disabled: true,
      "aria-invalid": true,
      defaultValue: "1",
    });
    expect(field()).toBeDisabled();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelector("[data-slot='expression-editor-control']")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("sizes both layers together", () => {
    const { container } = renderEditor({ editorSize: "lg" });
    expect(field()).toHaveClass("text-base");
    expect(highlight(container)).toHaveClass("text-base");
  });

  it("lets className override its own utilities", () => {
    const { container } = renderEditor({ className: "gap-4" });
    expect(container.firstChild).toHaveClass("gap-4");
    expect(container.firstChild).not.toHaveClass("gap-1.5");
  });

  it("forwards ref, fieldRef and native props", () => {
    const ref = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLInputElement | HTMLTextAreaElement>();
    renderEditor({
      ref,
      fieldRef,
      "data-testid": "editor",
      name: "rule",
    } as Partial<ExpressionEditorProps>);
    expect(ref.current).toBe(screen.getByTestId("editor"));
    expect(fieldRef.current).toBe(field());
    expect(field()).toHaveAttribute("name", "rule");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderEditor({ defaultValue: "price * qty", description: "A hint." });
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations with an error", async () => {
    const { container } = renderEditor({ defaultValue: "prise * qty" });
    await expectNoA11yViolations(container);
  });
});
