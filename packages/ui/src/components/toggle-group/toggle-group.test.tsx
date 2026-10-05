import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ToggleGroup, ToggleGroupItem, toggleGroupVariants } from "./toggle-group";

function highlights(container: HTMLElement) {
  return container.querySelectorAll('[data-slot="toggle-group-highlight"]');
}

function Alignment(props: { defaultValue?: string; onValueChange?: (value: string) => void }) {
  return (
    <ToggleGroup type="single" aria-label="Text alignment" {...props}>
      <ToggleGroupItem value="start">Start</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="end">End</ToggleGroupItem>
    </ToggleGroup>
  );
}

function Formatting(props: {
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}) {
  return (
    <ToggleGroup type="multiple" aria-label="Formatting" {...props}>
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("renders a single-choice group as radios with one sliding highlight", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<Alignment onValueChange={onValueChange} />);

    expect(screen.getByRole("radiogroup", { name: "Text alignment" })).toHaveAttribute(
      "data-slot",
      "toggle-group",
    );
    expect(highlights(container)).toHaveLength(0);

    await user.click(screen.getByRole("radio", { name: "Center" }));
    expect(screen.getByRole("radio", { name: "Center" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(onValueChange).toHaveBeenLastCalledWith("center");
    expect(highlights(container)).toHaveLength(1);
    expect(
      screen
        .getByRole("radio", { name: "Center" })
        .querySelector("[data-slot=toggle-group-highlight]"),
    ).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("radio", { name: "End" }));
    expect(screen.getByRole("radio", { name: "End" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Center" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await waitFor(() => {
      expect(highlights(container)).toHaveLength(1);
    });

    // Pressing the chosen item again clears the selection.
    await user.click(screen.getByRole("radio", { name: "End" }));
    expect(onValueChange).toHaveBeenLastCalledWith("");
    await waitFor(() => {
      expect(highlights(container)).toHaveLength(0);
    });
  });

  it("scopes each group's pill to that group", () => {
    const { container } = render(
      <>
        <Alignment defaultValue="start" />
        <Alignment defaultValue="end" />
      </>,
    );
    expect(highlights(container)).toHaveLength(2);
  });

  it("is a toolbar of pressed buttons in multiple mode", () => {
    render(<Formatting />);
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
  });

  it("gives every pressed item its own highlight in multiple mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <Formatting defaultValue={["bold"]} onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(highlights(container)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Italic" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["bold", "italic"]);
    expect(highlights(container)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["italic"]);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await waitFor(() => {
      expect(highlights(container)).toHaveLength(1);
    });
  });

  it("moves with the arrow keys and selects from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Alignment />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Start" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Center" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Center" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("follows a controlled single value", async () => {
    function Controlled() {
      const [value, setValue] = useState("start");
      return (
        <>
          <ToggleGroup type="single" value={value} onValueChange={setValue} aria-label="Align">
            <ToggleGroupItem value="start">Start</ToggleGroupItem>
            <ToggleGroupItem value="end">End</ToggleGroupItem>
          </ToggleGroup>
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "End" }));
    expect(screen.getByRole("status")).toHaveTextContent("end");
    expect(screen.getByRole("radio", { name: "End" })).toHaveAttribute("aria-checked", "true");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup type="multiple" value={[]} onValueChange={onValueChange} aria-label="Styles">
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(onValueChange).toHaveBeenCalledWith(["bold"]);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("passes the %s size to its items", (size, height) => {
    render(
      <ToggleGroup type="single" size={size} aria-label="Size">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("radio")).toHaveClass(height);
  });

  it.each([
    ["default", "bg-accent"],
    ["outline", "shadow-xs"],
  ] as const)("applies the %s variant", (variant, highlightClass) => {
    const { container } = render(
      <ToggleGroup type="single" variant={variant} defaultValue="a" aria-label="Variant">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-variant", variant);
    expect(highlights(container)[0]).toHaveClass(highlightClass);
    expect(toggleGroupVariants({ variant: "outline" })).toContain("border-input");
  });

  it("disables every item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleGroup type="single" disabled onValueChange={onValueChange} aria-label="Off">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.click(screen.getByRole("radio"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio")).toBeDisabled();
  });

  it("lets consumer classNames win and forwards refs and props", () => {
    const groupRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLButtonElement>();
    render(
      <ToggleGroup
        ref={groupRef}
        type="multiple"
        className="gap-4"
        data-testid="group"
        aria-label="Group"
      >
        <ToggleGroupItem ref={itemRef} value="a" className="h-12" data-testid="item">
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const group = screen.getByTestId("group");
    const item = screen.getByTestId("item");
    expect(groupRef.current).toBe(group);
    expect(itemRef.current).toBe(item);
    expect(group).toHaveClass("gap-4");
    expect(group).not.toHaveClass("gap-1");
    expect(item).toHaveClass("h-12");
    expect(item).not.toHaveClass("h-9");
  });

  it("throws when an item is used outside a group", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToggleGroupItem value="a">A</ToggleGroupItem>)).toThrow(
      /inside a ToggleGroup/,
    );
    vi.restoreAllMocks();
  });

  it("renders the final state under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    const { container } = render(<Formatting defaultValue={["bold", "underline"]} />);
    expect(highlights(container)).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <Alignment defaultValue="start" />
        <Formatting defaultValue={["bold"]} />
      </>,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("radio", { name: "End" }));
    await expectNoA11yViolations(container);
  });
});
