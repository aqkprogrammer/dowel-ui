import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  PromptInput,
  PromptInputCounter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "./ai-prompt-input";

function Composer({ busy = false, onStop }: { busy?: boolean; onStop?: () => void }) {
  return (
    <PromptInput busy={busy}>
      <PromptInputTextarea aria-label="Message" />
      <PromptInputToolbar>
        <PromptInputSubmit onStop={onStop} className="size-10" />
      </PromptInputToolbar>
    </PromptInput>
  );
}

function glyphs(button: HTMLElement) {
  const send = button.querySelector("[data-glyph='send']");
  const stop = button.querySelector("[data-glyph='stop']");
  if (!send || !stop) throw new Error("missing glyph");
  return { send, stop };
}

describe("PromptInputSubmit send/stop cross-fade", () => {
  it("flips data-state and its name with busy", () => {
    const { rerender } = render(<Composer />);
    const button = screen.getByRole("button", { name: "Send message" });
    expect(button).toHaveAttribute("data-state", "send");

    rerender(<Composer busy />);
    expect(button).toHaveAttribute("data-state", "stop");
    expect(button).toHaveAccessibleName("Stop generating");
  });

  it("keeps both glyphs mounted and hidden from assistive technology", () => {
    const { rerender } = render(<Composer />);
    const button = screen.getByRole("button");
    const before = glyphs(button);
    expect(before.send).toHaveAttribute("aria-hidden", "true");
    expect(before.stop).toHaveAttribute("aria-hidden", "true");
    expect(before.send).toHaveClass("opacity-100");
    expect(before.stop).toHaveClass("opacity-0", "scale-60");

    rerender(<Composer busy />);
    const after = glyphs(button);
    // Same nodes: the swap is a transition, not a remount.
    expect(after.send).toBe(before.send);
    expect(after.stop).toBe(before.stop);
    expect(after.send).toHaveClass("opacity-0", "scale-60");
    expect(after.stop).toHaveClass("opacity-100");
  });

  it("stops rather than submitting after the visual change", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(<Composer busy onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("presses with a scale, but not when disabled, and a className still wins", () => {
    render(<Composer />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("active:scale-95", "hover:scale-105", "disabled:scale-100");
    expect(button).toHaveClass("size-10");
    expect(button).not.toHaveClass("size-8");
  });

  it("has no accessibility violations in either state", async () => {
    const { container, rerender } = render(<Composer />);
    await expectNoA11yViolations(container);
    rerender(<Composer busy />);
    await expectNoA11yViolations(container);
  });
});

describe("PromptInputCounter limit reveal", () => {
  it("keeps the same live region node across the warning threshold", () => {
    const { rerender } = render(<PromptInputCounter value={10} max={100} />);
    const status = screen.getByRole("status");

    rerender(<PromptInputCounter value={95} max={100} />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("5 characters remaining");

    rerender(<PromptInputCounter value={20} max={100} />);
    expect(screen.getByRole("status")).toBe(status);
  });

  it("remounts the visible reading when the limit first matters", () => {
    const { container, rerender } = render(<PromptInputCounter value={10} max={100} />);
    const reading = () =>
      container.querySelector<HTMLElement>("[data-slot='prompt-input-counter-value']");
    const quiet = reading();
    expect(quiet).not.toHaveAttribute("data-warning");

    rerender(<PromptInputCounter value={11} max={100} />);
    expect(reading()).toBe(quiet);

    rerender(<PromptInputCounter value={95} max={100} />);
    const warned = reading();
    expect(warned).not.toBe(quiet);
    expect(warned).toHaveAttribute("data-warning", "true");
    expect(warned).toHaveAttribute("aria-hidden", "true");
    expect(warned).toHaveTextContent("95 / 100");
  });

  it("ships its entrance keyframe scaled by --motion-scale", () => {
    render(<PromptInputCounter value={95} max={100} />);
    const sheet = document.querySelector("style[data-href='dowel-ai-prompt-input']");
    expect(sheet?.textContent).toContain("@keyframes dowel-ai-prompt-input-counter-in");
    expect(sheet?.textContent).toContain("var(--motion-scale");
  });
});
