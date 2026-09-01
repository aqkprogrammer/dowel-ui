import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Slider } from "./slider";

describe("Slider", () => {
  it("renders a single thumb by default", () => {
    render(<Slider aria-label="Volume" />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("renders one thumb per value", () => {
    render(<Slider aria-label="Price range" defaultValue={[20, 80]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("exposes its value and bounds", () => {
    render(<Slider aria-label="Volume" defaultValue={[40]} min={0} max={100} />);

    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
  });

  it("increments with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Slider aria-label="Volume" defaultValue={[40]} />);

    await user.tab();
    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "41");

    await user.keyboard("{ArrowLeft}");
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
  });

  it("jumps to the bounds with Home and End", async () => {
    const user = userEvent.setup();
    render(<Slider aria-label="Volume" defaultValue={[40]} min={10} max={90} />);

    await user.tab();
    await user.keyboard("{Home}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "10");

    await user.keyboard("{End}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "90");
  });

  it("honours the step", async () => {
    const user = userEvent.setup();
    render(<Slider aria-label="Volume" defaultValue={[40]} step={10} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "50");
  });

  it("reports changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Slider aria-label="Volume" defaultValue={[40]} onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith([41]);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState([30]);
      return <Slider aria-label="Volume" value={value} onValueChange={setValue} />;
    }

    render(<Controlled />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "31");
  });

  it("does not respond while disabled", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Slider aria-label="Volume" defaultValue={[40]} disabled onValueChange={onValueChange} />,
    );

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("supports vertical orientation", () => {
    render(<Slider aria-label="Volume" orientation="vertical" data-testid="slider" />);
    expect(screen.getByTestId("slider")).toHaveAttribute("data-orientation", "vertical");
  });

  it("forwards aria-valuetext onto the thumb", () => {
    render(
      <Slider aria-label="Duration" defaultValue={[90]} aria-valuetext="1 minute 30 seconds" />,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "1 minute 30 seconds");
  });

  it("names each thumb of a range slider separately", () => {
    render(
      <Slider
        defaultValue={[20, 80]}
        thumbLabels={["Minimum price", "Maximum price"]}
        thumbValueTexts={["$20", "$80"]}
      />,
    );

    const min = screen.getByRole("slider", { name: "Minimum price" });
    const max = screen.getByRole("slider", { name: "Maximum price" });
    expect(min).toHaveAttribute("aria-valuetext", "$20");
    expect(max).toHaveAttribute("aria-valuetext", "$80");
  });

  it("warns in development when a thumb would be unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Slider defaultValue={[40]} />);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    warn.mockRestore();
  });

  it("does not warn when every thumb is named", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Slider defaultValue={[20, 80]} thumbLabels={["Minimum", "Maximum"]} />);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Slider aria-label="Volume" defaultValue={[40]} />);
    await expectNoA11yViolations(container);
  });
});
