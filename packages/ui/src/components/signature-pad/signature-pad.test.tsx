import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SignaturePad } from "./signature-pad";

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
  };
}

let ctx: ReturnType<typeof fakeContext>;

beforeEach(() => {
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,SIG",
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 300, 160),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function canvas() {
  return screen.getByRole("img", { name: "Signature" });
}

function drawStroke(target: HTMLElement) {
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 10, clientY: 50 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: 40, clientY: 60 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: 80, clientY: 40 });
  fireEvent.pointerUp(target, { pointerId: 1 });
}

describe("SignaturePad", () => {
  it("is a named canvas with instructions", () => {
    render(<SignaturePad />);
    expect(canvas()).toHaveAccessibleDescription(/Draw with a mouse, finger or pen/);
  });

  it("starts empty, with Undo and Clear disabled and nothing reported", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("draws a stroke and reports a PNG data URL", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    drawStroke(canvas());

    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("data:image/png;base64,SIG");
    expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
  });

  it("undoes the last stroke and clears to null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    drawStroke(canvas());
    drawStroke(canvas());

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenLastCalledWith("data:image/png;base64,SIG");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("submits the signature through a hidden input", () => {
    const { container } = render(<SignaturePad name="signature" />);
    drawStroke(canvas());
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(hidden).toHaveAttribute("name", "signature");
    expect(hidden).toHaveValue("data:image/png;base64,SIG");
  });

  it("can be signed from the keyboard by typing a name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Type instead" }));
    expect(screen.getByRole("button", { name: "Draw instead" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.type(screen.getByRole("textbox", { name: "Signature, typed" }), "Ada Lovelace");

    expect(ctx.fillText).toHaveBeenLastCalledWith(
      "Ada Lovelace",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expect(onChange).toHaveBeenLastCalledWith("data:image/png;base64,SIG");
  });

  it("ignores the pointer when disabled", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} disabled />);
    drawStroke(canvas());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Type instead" })).toBeDisabled();
  });

  it("hides the typed alternative when asked", () => {
    render(<SignaturePad allowTyped={false} />);
    expect(screen.queryByRole("button", { name: "Type instead" })).toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SignaturePad />);
    await expectNoA11yViolations(container);
  });
});
