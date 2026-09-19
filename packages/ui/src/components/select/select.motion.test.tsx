import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function Example({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select defaultValue={defaultValue}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-select"]');
}

describe("Select motion", () => {
  it("opens with the same pop and stagger as the menus", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByRole("combobox"));

    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveClass(
      "data-[state=open]:animate-[dowel-select-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
      "data-[state=closed]:animate-float-out",
    );
    const viewport = baseElement.querySelector("[data-slot='select-viewport']");
    expect(viewport?.className).toContain("dowel-select-item-in");
    expect(stylesheet()?.textContent).toContain(
      "[data-slot=select-viewport]>:nth-child(3){animation-delay:calc(40ms * var(--motion-scale))}",
    );
  });

  it("pops the tick on the selected option", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue="banana" />);
    await user.click(screen.getByRole("combobox"));

    const option = await screen.findByRole("option", { name: "Banana" });
    const tick = option.querySelector("[data-slot='select-item-check']");
    expect(tick).toHaveAttribute("aria-hidden", "true");
    expect(tick?.getAttribute("class")).toContain("dowel-select-check-in");
  });

  it("scales every duration and delay by --motion-scale, so reduced motion settles instantly", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");

    const timings = stylesheet()?.textContent?.match(/calc\([^)]*\)/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) expect(timing).toContain("var(--motion-scale)");
    expect(document.querySelectorAll('style[data-href="dowel-select"]')).toHaveLength(1);
  });

  it("still selects with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("combobox").focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
    });
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example defaultValue="apple" />);
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");
    await expectNoA11yViolations(baseElement);
  });
});
