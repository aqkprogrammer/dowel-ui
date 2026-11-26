import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TabBar } from "./tab-bar";

describe("TabBar", () => {
  it("is a named radio group of four labelled icon tabs, the first selected", () => {
    render(<TabBar aria-label="Sections" />);
    expect(screen.getByRole("radiogroup", { name: "Sections" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("radio");
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Home",
      "Search",
      "Saved",
      "Profile",
    ]);
    expect(tabs[0]).toBeChecked();
    expect(tabs[0]?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("selects on click and stretches the highlight", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <TabBar aria-label="Sections" onValueChange={onValueChange} />,
    );
    expect(container.querySelector("[data-part=pill]")).not.toHaveAttribute("data-moving");

    await user.click(screen.getByRole("radio", { name: "Saved" }));
    expect(onValueChange).toHaveBeenCalledWith("saved");
    expect(screen.getByRole("radio", { name: "Saved" })).toBeChecked();
    expect(screen.getByRole("radiogroup").style.getPropertyValue("--i")).toBe("2");
    expect(container.querySelector("[data-part=pill]")).toHaveAttribute("data-moving");
  });

  it("roves focus with the arrow keys and selects with Space", async () => {
    const user = userEvent.setup();
    render(<TabBar aria-label="Sections" />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Home" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Search" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Search" })).toBeChecked();
  });

  it("follows a controlled value and takes custom items", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("b");
      return (
        <TabBar
          aria-label="Custom"
          items={[
            { value: "a", label: "Alpha", icon: <span>A</span> },
            { value: "b", label: "Beta", icon: <span>B</span> },
          ]}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Alpha" }));
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<TabBar aria-label="Sections" ref={ref} className="shadow-lg" />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveClass("shadow-lg", "bg-muted");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TabBar aria-label="Sections" />);
    await expectNoA11yViolations(container);
  });
});
