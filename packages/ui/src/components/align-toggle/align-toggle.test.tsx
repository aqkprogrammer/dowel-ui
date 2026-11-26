import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AlignToggle, type Alignment } from "./align-toggle";

function isOn(element: HTMLElement) {
  return element.getAttribute("data-state") === "on";
}

describe("AlignToggle", () => {
  it("is a named radio group of three named choices", () => {
    render(<AlignToggle />);
    expect(screen.getByRole("radiogroup", { name: "Text alignment" })).toBeInTheDocument();
    const items = ["Align start", "Align center", "Align end"].map((name) =>
      screen.getByRole("radio", { name }),
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toBeChecked();
  });

  it("chooses on click and keeps one alignment chosen", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<AlignToggle onValueChange={onValueChange} />);
    const end = screen.getByRole("radio", { name: "Align end" });

    await user.click(end);
    expect(isOn(end)).toBe(true);
    expect(onValueChange).toHaveBeenLastCalledWith("end");

    // Pressing the chosen one again does not clear it.
    await user.click(end);
    expect(isOn(end)).toBe(true);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("moves with arrow keys and chooses with Space", async () => {
    const user = userEvent.setup();
    render(<AlignToggle />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Align start" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    const center = screen.getByRole("radio", { name: "Align center" });
    expect(center).toHaveFocus();
    await user.keyboard(" ");
    expect(isOn(center)).toBe(true);
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<Alignment>("center");
      return (
        <>
          <AlignToggle value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(isOn(screen.getByRole("radio", { name: "Align center" }))).toBe(true);
    await user.click(screen.getByRole("radio", { name: "Align end" }));
    expect(screen.getByText("end", { selector: "output" })).toBeInTheDocument();
  });

  it("slides the thumb and re-aligns the preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<AlignToggle />);
    const thumb = container.querySelector<HTMLElement>("[data-slot=align-toggle-thumb]");
    expect(thumb?.style.insetInlineStart).toBe("0%");
    await user.click(screen.getByRole("radio", { name: "Align end" }));
    expect(thumb?.style.insetInlineEnd).toBe("0%");
    expect(thumb?.style.transition).toContain("var(--motion-scale, 1)");
    const preview = container.querySelector("[data-slot=align-toggle-preview]");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    const line = preview?.firstElementChild as HTMLElement;
    expect(line.style.marginInlineStart).not.toBe("0%");
  });

  it("takes custom labels and can hide the preview", () => {
    const { container } = render(
      <AlignToggle preview={false} labels={{ start: "Align left", end: "Align right" }} />,
    );
    expect(screen.getByRole("radio", { name: "Align left" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Align right" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=align-toggle-preview]")).toBeNull();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AlignToggle ref={ref} className="mt-4" />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("mt-4", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<AlignToggle />);
    await expectNoA11yViolations(container);
  });
});
