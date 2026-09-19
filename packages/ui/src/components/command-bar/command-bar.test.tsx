import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CommandBar } from "./command-bar";

describe("CommandBar", () => {
  it("renders a named field and a disabled send while empty", () => {
    render(<CommandBar />);
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveAttribute(
      "placeholder",
      "Ask anything…",
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Dictate" })).not.toBeInTheDocument();
  });

  it("sends the trimmed text with Enter and clears itself", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<CommandBar onSend={onSend} />);
    const field = screen.getByRole("textbox");
    await user.type(field, "  hello{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello");
    expect(field).toHaveValue("");
  });

  it("adds a newline with Shift+Enter and sends from the button", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<CommandBar onSend={onSend} />);
    const field = screen.getByRole("textbox");
    await user.type(field, "one{Shift>}{Enter}{/Shift}two");
    expect(field).toHaveValue("one\ntwo");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("one\ntwo");
  });

  it("does not send whitespace", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<CommandBar onSend={onSend} />);
    await user.type(screen.getByRole("textbox"), "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("becomes Stop while sending and blocks sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onStop = vi.fn();
    render(<CommandBar sending onSend={onSend} onStop={onStop} defaultValue="draft" />);
    await user.type(screen.getByRole("textbox"), "{Enter}");
    expect(onSend).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("toggles dictation, uncontrolled and controlled", async () => {
    const user = userEvent.setup();
    const onDictatingChange = vi.fn();
    const { rerender } = render(<CommandBar onDictatingChange={onDictatingChange} />);
    const mic = screen.getByRole("button", { name: "Dictate" });
    expect(mic).toHaveAttribute("aria-pressed", "false");
    await user.click(mic);
    expect(mic).toHaveAttribute("aria-pressed", "true");
    expect(onDictatingChange).toHaveBeenCalledWith(true);

    rerender(<CommandBar dictating={false} onDictatingChange={onDictatingChange} />);
    await user.click(mic);
    expect(onDictatingChange).toHaveBeenLastCalledWith(true);
    expect(mic).toHaveAttribute("aria-pressed", "false");
  });

  it("follows a controlled value and keeps it after sending", async () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return <CommandBar value={value} onValueChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.type(screen.getByRole("textbox"), "hi{Enter}");
    expect(screen.getByRole("textbox")).toHaveValue("hi");
  });

  it("disables everything when disabled", () => {
    render(<CommandBar disabled defaultValue="x" dictating={false} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dictate" })).toBeDisabled();
  });

  it("renders a leading slot and custom labels", () => {
    render(
      <CommandBar
        leading={<button type="button">Attach</button>}
        label="Command"
        sendLabel="Run"
        dictateLabel="Voice"
        dictating
      />,
    );
    expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Command" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLFormElement>();
    const { container } = render(
      <CommandBar ref={ref} className="rounded-none p-3" data-testid="bar" shape="rounded" />,
    );
    const bar = container.querySelector("form")!;
    expect(ref.current).toBe(bar);
    expect(bar).toHaveAttribute("data-testid", "bar");
    expect(bar).toHaveClass("rounded-none", "p-3");
    expect(bar).not.toHaveClass("rounded-xl", "p-1.5");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<CommandBar onDictatingChange={() => {}} defaultValue="hi" />);
    await expectNoA11yViolations(container);
  });
});
