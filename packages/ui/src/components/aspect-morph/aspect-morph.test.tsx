import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AspectMorph, fitAspect } from "./aspect-morph";

function frameOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="aspect-morph-frame"]')!;
}

function thumbOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="aspect-morph-thumb"]')!;
}

describe("fitAspect", () => {
  it("matches areas inside the box and clamps to it", () => {
    expect(fitAspect(4 / 3, 276)).toEqual({ width: 276, height: 207 });
    expect(fitAspect(1, 276)).toEqual({ width: 239.02, height: 239.02 });
    expect(fitAspect(3 / 4, 276)).toEqual({ width: 207, height: 276 });
    expect(fitAspect(16 / 9, 100).width).toBe(100);
    // Nonsense ratios fall back to a square rather than NaN.
    expect(fitAspect(0, 100)).toEqual(fitAspect(1, 100));
  });
});

describe("AspectMorph", () => {
  it("renders a named radiogroup with the three default shapes, the first checked", () => {
    render(<AspectMorph />);
    expect(screen.getByRole("radiogroup", { name: "Aspect ratio" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "Landscape, 4 by 3",
      "Square, 1 by 1",
      "Portrait, 3 by 4",
    ]);
    expect(radios[0]).toBeChecked();
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  });

  it("reshapes the frame and slides the thumb on click", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AspectMorph onValueChange={onValueChange} />);
    expect(frameOf(container).style.width).toBe("276px");
    expect(frameOf(container).style.height).toBe("207px");

    await user.click(screen.getByRole("radio", { name: "Portrait, 3 by 4" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("3:4");
    expect(frameOf(container).style.width).toBe("207px");
    expect(frameOf(container).style.height).toBe("276px");
    expect(thumbOf(container).style.translate).toBe("calc(var(--aspect-morph-dir) * 200%) 0");
    expect(container.firstElementChild).toHaveAttribute("data-value", "3:4");

    // Re-choosing the checked shape is not a change.
    await user.click(screen.getByRole("radio", { name: "Portrait, 3 by 4" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("moves and selects with arrows, wrapping, and jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<AspectMorph defaultValue="1:1" />);
    await user.tab();
    const square = screen.getByRole("radio", { name: "Square, 1 by 1" });
    expect(square).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Portrait, 3 by 4" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Portrait, 3 by 4" })).toBeChecked();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Landscape, 4 by 3" })).toBeChecked();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Portrait, 3 by 4" })).toBeChecked();

    await user.keyboard("{ArrowUp}");
    expect(square).toBeChecked();

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Landscape, 4 by 3" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Portrait, 3 by 4" })).toBeChecked();

    await user.keyboard("x");
    expect(screen.getByRole("radio", { name: "Portrait, 3 by 4" })).toBeChecked();
  });

  it("follows the reading direction in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <AspectMorph defaultValue="1:1" />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Landscape, 4 by 3" })).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Square, 1 by 1" })).toBeChecked();
  });

  it("follows a controlled value and only requests changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender, container } = render(
      <AspectMorph value="4:3" onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("radio", { name: "Square, 1 by 1" }));
    expect(onValueChange).toHaveBeenCalledWith("1:1");
    expect(screen.getByRole("radio", { name: "Landscape, 4 by 3" })).toBeChecked();

    rerender(<AspectMorph value="1:1" onValueChange={onValueChange} />);
    expect(frameOf(container).style.width).toBe("239.02px");

    // An unknown value checks nothing, hides the thumb and leaves the first option tabbable.
    rerender(<AspectMorph value="21:9" onValueChange={onValueChange} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked();
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("tabindex", "0");
    expect(thumbOf(container)).toHaveClass("opacity-0");
  });

  it("maps morph onto the duration, and corner and size onto the frame", () => {
    const { container, rerender } = render(<AspectMorph morph={0} corner={4} size={200} />);
    const frame = frameOf(container);
    expect(frame.style.transitionDuration).toBe("calc(832ms * var(--motion-scale))");
    expect(thumbOf(container).style.transitionDuration).toBe(
      "calc(458ms * var(--motion-scale))",
    );
    expect(frame.style.borderRadius).toBe("4px");
    expect(frame.style.width).toBe("200px");

    rerender(<AspectMorph morph={100} />);
    expect(frameOf(container).style.transitionDuration).toBe(
      "calc(208ms * var(--motion-scale))",
    );
    rerender(<AspectMorph />);
    expect(frameOf(container).style.transitionDuration).toBe(
      "calc(520ms * var(--motion-scale))",
    );
  });

  it("names a src picture with alt, and hides it without", () => {
    const { rerender, container } = render(
      <AspectMorph src="/lake.jpg" alt="A lake at dusk" />,
    );
    const picture = screen.getByRole("img", { name: "A lake at dusk" });
    expect(picture.style.backgroundImage).toContain("/lake.jpg");

    rerender(<AspectMorph src="/lake.jpg" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(frameOf(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("renders custom children inside the frame", () => {
    render(
      <AspectMorph>
        <img src="/cat.jpg" alt="A cat" />
      </AspectMorph>,
    );
    expect(screen.getByRole("img", { name: "A cat" }).parentElement).toHaveAttribute(
      "data-slot",
      "aspect-morph-frame",
    );
  });

  it("accepts custom ratios, icons and group label, and can be disabled", () => {
    render(
      <AspectMorph
        label="Crop"
        disabled
        ratios={[
          { value: "16:9", label: "Wide", ratio: 16 / 9, icon: <span data-testid="wide" /> },
          { value: "9:16", label: "Tall", ratio: 9 / 16 },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Crop" });
    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(group.style.gridTemplateColumns).toBe("repeat(2, 2.5rem)");
    expect(screen.getByTestId("wide")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Wide" })).toBeDisabled();
  });

  it("copes with an empty ratio list", () => {
    const { container } = render(<AspectMorph ratios={[]} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(frameOf(container).style.width).toBe("239.02px");
  });

  it("merges className and forwards ref and props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <AspectMorph ref={ref} className="gap-8" data-testid="root" style={{ opacity: 0.5 }} />,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("gap-8", "inline-flex");
    expect(ref.current).toHaveAttribute("data-testid", "root");
    expect(ref.current?.style.opacity).toBe("0.5");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AspectMorph src="/lake.jpg" alt="A lake" defaultValue="1:1" />,
    );
    await expectNoA11yViolations(container);
  });
});
