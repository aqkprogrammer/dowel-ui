import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MagneticOrb } from "./magnetic-orb";

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: reduce, addEventListener() {}, removeEventListener() {} }),
  );
}

describe("MagneticOrb", () => {
  it("is a button with a default name", () => {
    render(<MagneticOrb />);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "button");
  });

  it("takes an aria-label and keeps the arrow hidden", () => {
    render(<MagneticOrb aria-label="Next step" />);
    const button = screen.getByRole("button", { name: "Next step" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("activates by click and keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MagneticOrb onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    await user.tab();
    await user.tab({ shift: true });
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("is pulled toward a mouse and springs home on leave", () => {
    stubReducedMotion(false);
    const { container } = render(<MagneticOrb strength={0.5} />);
    const field = container.querySelector<HTMLElement>("[data-slot=magnetic-orb-field]")!;
    const button = screen.getByRole("button");
    field.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;

    fireEvent.pointerMove(field, { clientX: 90, clientY: 50, pointerType: "mouse" });
    expect(button).toHaveAttribute("data-tracking");
    expect(button.style.getPropertyValue("--dowel-magnetic-orb-x")).toBe("20px");

    fireEvent.pointerLeave(field);
    expect(button).not.toHaveAttribute("data-tracking");
    expect(button.style.getPropertyValue("--dowel-magnetic-orb-x")).toBe("0px");
    vi.unstubAllGlobals();
  });

  it("does not move for touch or under reduced motion", () => {
    stubReducedMotion(true);
    const { container } = render(<MagneticOrb />);
    const field = container.querySelector<HTMLElement>("[data-slot=magnetic-orb-field]")!;
    fireEvent.pointerMove(field, { clientX: 90, clientY: 50, pointerType: "mouse" });
    fireEvent.pointerMove(field, { clientX: 90, clientY: 50, pointerType: "touch" });
    expect(screen.getByRole("button")).not.toHaveAttribute("data-tracking");
    vi.unstubAllGlobals();
  });

  it("does not respond when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MagneticOrb disabled onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards its ref to the button and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<MagneticOrb ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("button"));
    expect(ref.current).toHaveClass("custom", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<MagneticOrb aria-label="Next" />);
    await expectNoA11yViolations(container);
  });
});
