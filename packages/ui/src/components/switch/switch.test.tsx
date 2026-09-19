import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Label } from "../label";
import { Switch } from "./switch";

describe("Switch", () => {
  it("is exposed as a switch, not a checkbox", () => {
    render(<Switch aria-label="Airplane mode" />);
    expect(screen.getByRole("switch", { name: "Airplane mode" })).toBeInTheDocument();
  });

  it("starts off", () => {
    render(<Switch aria-label="Airplane mode" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" />);

    const control = screen.getByRole("switch");
    await user.click(control);
    expect(control).toBeChecked();
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" />);

    await user.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("reports changes", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [on, setOn] = useState(false);
      return <Switch aria-label="Airplane mode" checked={on} onCheckedChange={setOn} />;
    }

    render(<Controlled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("does not toggle while disabled", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Airplane mode" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("moves its thumb to reflect state, not colour alone", async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="Airplane mode" />);

    const thumb = container.querySelector("[data-slot='switch-thumb']");
    expect(thumb).toHaveAttribute("data-state", "unchecked");

    await user.click(screen.getByRole("switch"));
    expect(thumb).toHaveAttribute("data-state", "checked");
  });

  it("takes its name from an associated label", () => {
    render(
      <>
        <Switch id="wifi" />
        <Label htmlFor="wifi">Wi-Fi</Label>
      </>,
    );
    expect(screen.getByRole("switch", { name: "Wi-Fi" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Switch id="a11y-wifi" />
        <Label htmlFor="a11y-wifi">Wi-Fi</Label>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("Switch motion (SmoothUI AnimatedToggle)", () => {
  const icons = {
    checked: <svg data-testid="sun" viewBox="0 0 24 24" />,
    unchecked: <svg data-testid="moon" viewBox="0 0 24 24" />,
  };

  it("keeps the plain slide by default", () => {
    const { container } = render(<Switch aria-label="Wi-Fi" />);
    const thumb = container.querySelector("[data-slot='switch-thumb']");
    expect(screen.getByRole("switch")).not.toHaveAttribute("data-variant");
    expect(thumb).toHaveClass("rounded-full");
    expect(thumb?.className).not.toContain("scale-x");
    expect(container.querySelector("[data-slot='switch-icon']")).toBeNull();
  });

  it("stretches the thumb while pressed with the squash variant, only without reduced motion", () => {
    const { container } = render(<Switch aria-label="Wi-Fi" variant="squash" />);
    const thumb = container.querySelector("[data-slot='switch-thumb']");
    expect(screen.getByRole("switch")).toHaveAttribute("data-variant", "squash");
    expect(thumb).toHaveClass("motion-safe:group-active/switch:scale-x-125", "origin-left");
    expect(thumb).toHaveClass("rounded-full");
  });

  it("morphs from a rounded square to a circle with the morph variant", async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="Wi-Fi" variant="morph" />);
    const thumb = container.querySelector("[data-slot='switch-thumb']");
    expect(thumb).toHaveClass("rounded-[30%]", "data-[state=checked]:rounded-[50%]");
    expect(thumb).not.toHaveClass("rounded-full");
    expect(thumb).toHaveClass("motion-safe:group-active/switch:scale-x-125");

    await user.click(screen.getByRole("switch"));
    expect(thumb).toHaveAttribute("data-state", "checked");
  });

  it("draws one decorative icon per state inside the thumb", async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="Dark mode" icons={icons} />);

    const layers = container.querySelectorAll("[data-slot='switch-icon']");
    expect(layers).toHaveLength(2);
    for (const layer of layers) expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("sun")).toBeInTheDocument();
    expect(screen.getByTestId("moon")).toBeInTheDocument();

    // The name is still the switch's own, not the icons'.
    expect(screen.getByRole("switch", { name: "Dark mode" })).toBeInTheDocument();

    await user.click(screen.getByRole("switch"));
    expect(container.querySelector("[data-slot='switch-thumb']")).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("toggles from the keyboard with every variant", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Switch
        aria-label="Wi-Fi"
        variant="morph"
        icons={icons}
        onCheckedChange={onCheckedChange}
      />,
    );

    await user.tab();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("forwards a ref and lets a consumer className win", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Switch aria-label="Wi-Fi" variant="squash" ref={ref} className="h-6" />);
    expect(ref.current).toBe(screen.getByRole("switch"));
    expect(ref.current).toHaveClass("h-6");
    expect(ref.current).not.toHaveClass("h-5");
  });

  it("has no accessibility violations with icons", async () => {
    const { container } = render(
      <Switch aria-label="Dark mode" variant="morph" icons={icons} />,
    );
    await expectNoA11yViolations(container);
  });
});
