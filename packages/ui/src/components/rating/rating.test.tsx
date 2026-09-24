import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Rating } from "./rating";

const radio = (name: string) => screen.getByRole("radio", { name });
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="rating-item"]')];
const states = () => items().map((item) => item.dataset.state);
const glyph = (index: number) =>
  items()[index]!.querySelector<HTMLElement>('[data-slot="rating-glyph"]')!;
const clip = (index: number) =>
  items()
    [index]!.querySelector<HTMLElement>('[data-slot="rating-fill"]')!
    .style.getPropertyValue("--rating-clip");

describe("Rating", () => {
  it("is a named radio group with one radio per star", () => {
    render(<Rating />);
    const group = screen.getByRole("radiogroup", { name: "Rating" });
    expect(group).toHaveAttribute("data-slot", "rating");
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "1 star",
      "2 stars",
      "3 stars",
      "4 stars",
      "5 stars",
    ]);
    for (const r of radios) expect(r).toHaveAttribute("aria-checked", "false");
    expect(states()).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });

  it("draws decorative glyphs with no burst on first paint", () => {
    render(<Rating defaultValue={3} />);
    expect(glyph(0)).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector('[data-slot="rating-burst"]')).toBeNull();
    expect(document.querySelector("[data-burst]")).toBeNull();
    expect(states()).toEqual(["full", "full", "full", "empty", "empty"]);
    expect(clip(0)).toBe("0%");
    expect(clip(3)).toBe("100%");
  });

  it("selects on click, reports it and bursts the chosen star", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating onValueChange={onValueChange} />);
    await user.click(radio("4 stars"));
    expect(onValueChange).toHaveBeenCalledWith(4);
    expect(radio("4 stars")).toHaveAttribute("aria-checked", "true");
    expect(glyph(3)).toHaveAttribute("data-burst");
    expect(items()[3]!.querySelector('[data-slot="rating-burst"]')).toBeInTheDocument();
    expect(glyph(2)).not.toHaveAttribute("data-burst");
  });

  it("replays the burst but reports nothing when the same star is chosen again", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating defaultValue={2} onValueChange={onValueChange} />);
    await user.click(radio("2 stars"));
    const first = glyph(1);
    await user.click(radio("2 stars"));
    expect(glyph(1)).not.toBe(first);
    expect(glyph(1)).toHaveAttribute("data-burst");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("previews on hover and pops the star under the pointer", () => {
    render(<Rating defaultValue={1} />);
    fireEvent.pointerEnter(radio("3 stars"));
    expect(states()).toEqual(["full", "full", "full", "empty", "empty"]);
    expect(glyph(2)).toHaveAttribute("data-active");
    expect(glyph(0)).toHaveAttribute("data-preview");
    expect(glyph(3)).not.toHaveAttribute("data-preview");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-previewing");
    fireEvent.pointerLeave(screen.getByRole("radiogroup"));
    expect(states()).toEqual(["full", "empty", "empty", "empty", "empty"]);
    expect(glyph(2)).not.toHaveAttribute("data-active");
  });

  it("previews the focused option", async () => {
    const user = userEvent.setup();
    render(<Rating />);
    await user.tab();
    expect(radio("1 star")).toHaveFocus();
    expect(states()[0]).toBe("full");
    expect(glyph(0)).toHaveAttribute("data-active");
    await user.tab();
    expect(states()[0]).toBe("empty");
  });

  it("has one tab stop, on the chosen star", async () => {
    const user = userEvent.setup();
    render(<Rating defaultValue={3} />);
    const tabbable = screen.getAllByRole("radio").filter((r) => r.tabIndex === 0);
    expect(tabbable).toEqual([radio("3 stars")]);
    await user.tab();
    expect(radio("3 stars")).toHaveFocus();
  });

  it("moves and selects with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating defaultValue={4} onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(radio("5 stars")).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    await user.keyboard("{ArrowDown}");
    expect(radio("1 star")).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    await user.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{End}");
    expect(radio("5 stars")).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    onValueChange.mockClear();
    await user.keyboard("a");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("selects the focused star with Space", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenCalledWith(1);
  });

  it("mirrors Left and Right in a right-to-left layout", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <div dir="rtl">
        <Rating defaultValue={3} onValueChange={onValueChange} />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  describe("with half stars", () => {
    it("puts two radios in each star, one over each half", () => {
      render(<Rating allowHalf max={3} />);
      expect(screen.getAllByRole("radio")).toHaveLength(6);
      const [start, end] = items()[1]!.querySelectorAll('[data-slot="rating-radio"]');
      expect(start).toHaveAccessibleName("1.5 stars");
      expect(start).toHaveClass("start-0", "w-1/2");
      expect(end).toHaveAccessibleName("2 stars");
      expect(end).toHaveClass("end-0", "w-1/2");
    });

    it("previews and selects half a star by where the pointer is", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Rating allowHalf onValueChange={onValueChange} />);
      fireEvent.pointerEnter(radio("3.5 stars"));
      expect(states()).toEqual(["full", "full", "full", "partial", "empty"]);
      expect(clip(3)).toBe("50%");
      expect(glyph(3)).toHaveAttribute("data-active");
      await user.click(radio("3.5 stars"));
      expect(onValueChange).toHaveBeenCalledWith(3.5);
      expect(glyph(3)).toHaveAttribute("data-burst");
    });

    it("steps by half with the arrow keys", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Rating allowHalf defaultValue={2} onValueChange={onValueChange} />);
      await user.tab();
      expect(radio("2 stars")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(onValueChange).toHaveBeenLastCalledWith(2.5);
      expect(radio("2.5 stars")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(onValueChange).toHaveBeenLastCalledWith(0.5);
      await user.keyboard("{ArrowLeft}");
      expect(onValueChange).toHaveBeenLastCalledWith(5);
    });
  });

  it("renders read-only as an image that reads its value", () => {
    render(<Rating readOnly value={3.7} />);
    const image = screen.getByRole("img", { name: "3.7 out of 5" });
    expect(image).toHaveAttribute("data-readonly");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(states()).toEqual(["full", "full", "full", "partial", "empty"]);
    expect(clip(3)).toBe("30%");
    fireEvent.pointerEnter(items()[4]!);
    expect(states()[4]).toBe("empty");
  });

  it("lets a read-only rating take its own name", () => {
    render(<Rating readOnly value={4} max={10} aria-label="Rated 4 of 10 by critics" />);
    expect(screen.getByRole("img", { name: "Rated 4 of 10 by critics" })).toBeInTheDocument();
    expect(items()).toHaveLength(10);
  });

  it("blocks choosing and previewing when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating disabled defaultValue={2} onValueChange={onValueChange} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(group).toHaveAttribute("data-disabled");
    expect(radio("4 stars")).toBeDisabled();
    fireEvent.pointerEnter(radio("4 stars"));
    await user.click(radio("4 stars"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(states()).toEqual(["full", "full", "empty", "empty", "empty"]);
  });

  it("follows a controlled value and only requests changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Rating value={2} onValueChange={onValueChange} />);
    await user.click(radio("5 stars"));
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(radio("2 stars")).toHaveAttribute("aria-checked", "true");
    rerender(<Rating value={5} onValueChange={onValueChange} />);
    expect(radio("5 stars")).toHaveAttribute("aria-checked", "true");
  });

  it("works as a controlled pair with state", async () => {
    function Controlled() {
      const [value, setValue] = useState(0);
      return (
        <>
          <Rating value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(radio("3 stars"));
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });

  it("clamps a value outside the range", () => {
    render(<Rating value={9} max={4} />);
    expect(states()).toEqual(["full", "full", "full", "full"]);
    expect(radio("4 stars")).toHaveAttribute("aria-checked", "true");
  });

  it("takes custom labels, a custom glyph and a form name", () => {
    const { container } = render(
      <form>
        <Rating
          name="score"
          defaultValue={2}
          max={3}
          icon={<svg data-testid="heart" />}
          getLabel={(value, max) => `${String(value)} of ${String(max)} hearts`}
          aria-labelledby="score-label"
        />
        <span id="score-label">Score</span>
      </form>,
    );
    expect(screen.getByRole("radiogroup", { name: "Score" })).not.toHaveAttribute("aria-label");
    expect(radio("2 of 3 hearts")).toBeInTheDocument();
    expect(screen.getAllByTestId("heart")).toHaveLength(6);
    expect(container.querySelector<HTMLInputElement>('input[name="score"]')?.value).toBe("2");
  });

  it("sizes the stars", () => {
    const { rerender } = render(<Rating size="sm" />);
    expect(screen.getByRole("radiogroup")).toHaveClass("[--rating-size:1rem]");
    rerender(<Rating />);
    expect(screen.getByRole("radiogroup")).toHaveClass("[--rating-size:1.5rem]");
    rerender(<Rating size="lg" />);
    expect(screen.getByRole("radiogroup")).toHaveClass("[--rating-size:2rem]");
  });

  it("lets a consumer className win and forwards ref, props and handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const onPointerLeave = vi.fn();
    render(
      <Rating
        ref={ref}
        className="gap-3"
        data-testid="rating"
        onPointerLeave={onPointerLeave}
      />,
    );
    const root = screen.getByTestId("rating");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("gap-3");
    expect(root).not.toHaveClass("gap-1");
    fireEvent.pointerLeave(root);
    expect(onPointerLeave).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <Rating defaultValue={2} />
        <Rating allowHalf aria-label="Half-star rating" />
        <Rating readOnly value={3.5} />
      </>,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getAllByRole("radio", { name: "4.5 stars" })[0]!);
    await expectNoA11yViolations(container);
  });
});
