import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BulgeVolume } from "./bulge-volume";

const thumb = () => screen.getByRole("slider");

describe("BulgeVolume", () => {
  it("is a vertical slider named Volume by default", () => {
    render(<BulgeVolume />);
    expect(thumb()).toHaveAccessibleName("Volume");
    expect(thumb()).toHaveAttribute("aria-orientation", "vertical");
    expect(thumb()).toHaveAttribute("aria-valuenow", "60");
    expect(thumb()).toHaveAttribute("aria-valuetext", "60%");
  });

  it("takes its own name", () => {
    render(<BulgeVolume aria-label="Music" />);
    expect(thumb()).toHaveAccessibleName("Music");
  });

  it("moves with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BulgeVolume defaultValue={50} onValueChange={onValueChange} />);
    thumb().focus();
    await user.keyboard("{ArrowUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "51");
    await user.keyboard("{End}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(20);
      return (
        <>
          <BulgeVolume value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    thumb().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(thumb()).toHaveAttribute("aria-valuenow", "19");
  });

  it("shows the speaker muted at zero and keeps it hidden from assistive tech", () => {
    const { container } = render(<BulgeVolume defaultValue={0} />);
    const icon = container.querySelector("[data-slot=bulge-volume-icon]");
    expect(icon).toHaveAttribute("data-level", "muted");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("can hide the speaker", () => {
    const { container } = render(<BulgeVolume showIcon={false} />);
    expect(container.querySelector("[data-slot=bulge-volume-icon]")).toBeNull();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(<BulgeVolume ref={ref} className="custom" />);
    const root = container.querySelector("[data-slot=bulge-volume]");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("custom", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<BulgeVolume />);
    await expectNoA11yViolations(container);
  });
});
