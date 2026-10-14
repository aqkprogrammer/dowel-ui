import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ColorPicker,
  contrastLevel,
  contrastRatio,
  formatColor,
  hsvaToRgba,
  oklchToRgba,
  parseColor,
  rgbaToHsva,
  rgbaToOklch,
} from "./color-picker";

const area = () => screen.getByRole("slider", { name: "Colour saturation and brightness" });
const field = () => screen.getByRole("textbox", { name: "Colour value" });

describe("ColorPicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is a named group of keyboard-operable controls", async () => {
    const { container } = render(<ColorPicker defaultValue="#ff0000" />);
    expect(screen.getByRole("group", { name: "Colour" })).toBeInTheDocument();
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%");
    expect(screen.getByRole("slider", { name: "Colour hue" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(field()).toHaveValue("#ff0000");
    await expectNoA11yViolations(container);
  });

  it("moves saturation and brightness with the arrow keys", () => {
    const onValueChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" onValueChange={onValueChange} />);
    fireEvent.keyDown(area(), { key: "ArrowDown", shiftKey: true });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 90%");
    expect(onValueChange).toHaveBeenLastCalledWith("#e60000");
    fireEvent.keyDown(area(), { key: "ArrowLeft" });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 99%, brightness 90%");
    fireEvent.keyDown(area(), { key: "Home" });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 0%, brightness 90%");
    expect(field()).toHaveValue("#e6e6e6");
    fireEvent.keyDown(area(), { key: "End" });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 90%");
  });

  it("keeps the hue when the colour goes grey and comes back", () => {
    render(<ColorPicker defaultValue="#00ff00" />);
    fireEvent.keyDown(area(), { key: "Home" });
    fireEvent.keyDown(area(), { key: "End" });
    expect(field()).toHaveValue("#00ff00");
  });

  it("sets the colour from a press on the square", () => {
    render(<ColorPicker defaultValue="#ff0000" />);
    const square = area();
    square.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
    square.setPointerCapture = vi.fn();
    fireEvent.pointerDown(square, { pointerId: 1, button: 0, clientX: 100, clientY: 50 });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 50%, brightness 50%");
    fireEvent.pointerMove(square, { pointerId: 1, clientX: 200, clientY: 0 });
    expect(field()).toHaveValue("#ff0000");
    fireEvent.pointerUp(square, { pointerId: 1 });
    fireEvent.pointerMove(square, { pointerId: 1, clientX: 0, clientY: 100 });
    expect(field()).toHaveValue("#ff0000");
  });

  it("commits a typed colour in any format, and flags one it cannot read", () => {
    const onValueChange = vi.fn();
    render(<ColorPicker onValueChange={onValueChange} />);
    fireEvent.change(field(), { target: { value: "rgb(0 128 255)" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("#0080ff");
    expect(field()).toHaveValue("#0080ff");

    fireEvent.change(field(), { target: { value: "bluish" } });
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Not a colour/)).toBeInTheDocument();
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("#0080ff");
    expect(field()).not.toHaveAttribute("aria-invalid");

    fireEvent.change(field(), { target: { value: "oklch(70% 0.1 150)" } });
    fireEvent.blur(field());
    expect(field().getAttribute("value")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("writes in the format asked for, with alpha only when offered", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ColorPicker defaultValue="#ff000080" format="rgb" onValueChange={onValueChange} />,
    );
    expect(field()).toHaveValue("rgb(255 0 0)");
    expect(screen.queryByRole("slider", { name: "Colour opacity" })).toBeNull();

    rerender(
      <ColorPicker defaultValue="#ff000080" format="rgb" alpha onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("slider", { name: "Colour opacity" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(field()).toHaveValue("rgb(255 0 0 / 0.502)");

    rerender(<ColorPicker defaultValue="#ffffff" format="oklch" />);
  });

  it("picks a swatch and marks the one in use", () => {
    render(
      <ColorPicker defaultValue="#0000ff" swatches={["#0000ff", "#ff0000", "nonsense"]} />,
    );
    const blue = screen.getByRole("button", { name: "#0000ff" });
    const red = screen.getByRole("button", { name: "#ff0000" });
    expect(blue).toHaveAttribute("aria-pressed", "true");
    expect(red).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "nonsense" })).toBeDisabled();
    fireEvent.click(red);
    expect(field()).toHaveValue("#ff0000");
    expect(red).toHaveAttribute("aria-pressed", "true");
  });

  it("follows a controlled value from outside", () => {
    const { rerender } = render(<ColorPicker value="#ff0000" />);
    expect(field()).toHaveValue("#ff0000");
    rerender(<ColorPicker value="#00ff00" />);
    expect(field()).toHaveValue("#00ff00");
    // A value it cannot read is ignored rather than resetting the picker.
    rerender(<ColorPicker value="not a colour" />);
    expect(field()).toHaveValue("#00ff00");
  });

  it("reads contrast against a colour in words, not colour alone", () => {
    render(<ColorPicker defaultValue="#767676" contrastWith="#ffffff" />);
    expect(screen.getByText("4.54:1")).toBeInTheDocument();
    expect(screen.getByText("Passes AA")).toBeInTheDocument();
  });

  it("says when contrast fails", () => {
    render(<ColorPicker defaultValue="#cccccc" contrastWith="#ffffff" />);
    expect(screen.getByText("Fails AA")).toBeInTheDocument();
  });

  it("offers the eyedropper only where the browser has one, and uses it", async () => {
    const { unmount } = render(<ColorPicker />);
    expect(screen.queryByRole("button", { name: "Pick a colour from the screen" })).toBeNull();
    unmount();

    vi.stubGlobal(
      "EyeDropper",
      class {
        open() {
          return Promise.resolve({ sRGBHex: "#123456" });
        }
      },
    );
    render(<ColorPicker />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pick a colour from the screen" }));
      await Promise.resolve();
    });
    expect(field()).toHaveValue("#123456");
  });

  it("does nothing while disabled", () => {
    const onValueChange = vi.fn();
    render(<ColorPicker disabled defaultValue="#ff0000" onValueChange={onValueChange} />);
    expect(area()).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(area(), { key: "ArrowDown" });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(field()).toBeDisabled();
  });

  it("lets className win, forwards its ref and names itself from label", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ColorPicker ref={ref} className="w-80" label="Brand" />);
    expect(ref.current).toBe(screen.getByRole("group", { name: "Brand" }));
    expect(ref.current).toHaveClass("w-80");
    expect(ref.current).not.toHaveClass("w-64");
    expect(screen.getByRole("slider", { name: "Brand hue" })).toBeInTheDocument();
  });
});

describe("colour maths", () => {
  it("parses hex, rgb, oklch and color(srgb), and nothing else", () => {
    expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("#ff000080")).toEqual({ r: 255, g: 0, b: 0, a: 0.502 });
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseColor("rgba(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor("rgb(100% 0% 0%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("color(srgb 1 0.5 0)")).toEqual({ r: 255, g: 128, b: 0, a: 1 });
    expect(parseColor("oklch(100% 0 0)")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("oklch(0 0 none / 0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    for (const bad of [
      "red",
      "#12",
      "rgb(1 2)",
      "rgb(a b c)",
      "oklch(1)",
      "color(display-p3 1 0 0)",
    ]) {
      expect(parseColor(bad), bad).toBeUndefined();
    }
  });

  it("allows space inside the parentheses, and stays fast on hostile input", () => {
    expect(parseColor("rgb(  10 ,  20 , 30  )")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseColor("oklch(  100%   0   0  )")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("color(  srgb   1 0.5 0 )")).toEqual({ r: 255, g: 128, b: 0, a: 1 });
    expect(parseColor("color(srgbx 1 0 0)")).toBeUndefined();
    // Long runs of spaces with no closing parenthesis once backtracked polynomially.
    const started = performance.now();
    for (const prefix of ["rgb(", "oklch(", "color(srgb "]) {
      expect(parseColor(`${prefix}${" ".repeat(200)}x`)).toBeUndefined();
      expect(parseColor(`${prefix}${" ".repeat(50_000)}`)).toBeUndefined();
    }
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("round-trips through HSV", () => {
    for (const hex of ["#5b5bd6", "#000000", "#ffffff", "#12ab34", "#808080"]) {
      const rgba = parseColor(hex);
      if (!rgba) throw new Error(hex);
      expect(formatColor(hsvaToRgba(rgbaToHsva(rgba)), "hex")).toBe(hex);
    }
  });

  it("round-trips through OKLCH within a channel step", () => {
    for (const hex of ["#5b5bd6", "#12ab34", "#ff8800", "#ffffff", "#000000"]) {
      const rgba = parseColor(hex);
      if (!rgba) throw new Error(hex);
      const { l, c, h } = rgbaToOklch(rgba);
      const back = oklchToRgba(l, c, h);
      expect(Math.abs(back.r - rgba.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgba.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgba.b)).toBeLessThanOrEqual(1);
    }
  });

  it("writes each format", () => {
    const color = { r: 255, g: 0, b: 0, a: 1 };
    expect(formatColor(color, "hex")).toBe("#ff0000");
    expect(formatColor(color, "rgb")).toBe("rgb(255 0 0)");
    expect(formatColor(color, "oklch")).toBe("oklch(62.8% 0.258 29.2)");
    expect(formatColor({ ...color, a: 0.5 }, "oklch")).toBe("oklch(62.8% 0.258 29.2 / 0.5)");
    expect(formatColor({ ...color, a: 0.5 }, "hex")).toBe("#ff000080");
  });

  it("measures WCAG contrast and names its level", () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrastRatio(white, black)).toBeCloseTo(21);
    expect(contrastRatio(black, white)).toBeCloseTo(21);
    expect(contrastRatio(white, white)).toBeCloseTo(1);
    expect(contrastLevel(7)).toBe("AAA");
    expect(contrastLevel(4.5)).toBe("AA");
    expect(contrastLevel(3.2)).toBe("AA large");
    expect(contrastLevel(2.9)).toBe("fail");
  });
});
