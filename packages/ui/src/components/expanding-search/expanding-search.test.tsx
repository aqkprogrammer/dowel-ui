import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExpandingSearch } from "./expanding-search";

function trigger() {
  return screen.getByRole("button", { name: "Search" });
}

describe("ExpandingSearch", () => {
  it("renders a search landmark with a collapsed trigger", () => {
    render(<ExpandingSearch />);
    expect(screen.getByRole("search", { name: "Search" })).toHaveAttribute(
      "data-state",
      "closed",
    );
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveAttribute("aria-controls", screen.getByRole("searchbox").id);
  });

  it("opens on click and focuses the field", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExpandingSearch onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("opens from the keyboard and Escape clears, then collapses back to the trigger", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ExpandingSearch onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("dowel");
    expect(onValueChange).toHaveBeenLastCalledWith("dowel");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("clears with the clear button and refocuses the field", async () => {
    const user = userEvent.setup();
    render(<ExpandingSearch defaultOpen defaultValue="cats" />);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("submits on Enter", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<ExpandingSearch onSearch={onSearch} />);
    await user.click(trigger());
    await user.keyboard("tables{Enter}");
    expect(onSearch).toHaveBeenCalledWith("tables");
  });

  it("collapses when an empty field loses focus, but keeps text", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ExpandingSearch />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger());
    await user.keyboard("x");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("the trigger toggles closed", async () => {
    const user = userEvent.setup();
    render(<ExpandingSearch defaultOpen />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("lets inputProps take over Escape for a combobox", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ExpandingSearch
        defaultOpen
        inputProps={{
          role: "combobox",
          "aria-expanded": true,
          "aria-controls": "results",
          className: "font-mono",
          onChange,
          onKeyDown: (event) => {
            if (event.key === "Escape") event.preventDefault();
          },
        }}
      >
        <ul id="results" role="listbox" aria-label="Results">
          <li role="option" aria-selected="false">
            One
          </li>
        </ul>
      </ExpandingSearch>,
    );
    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveClass("font-mono");
    await user.type(combobox, "o{Escape}");
    expect(onChange).toHaveBeenCalled();
    expect(combobox).toHaveValue("o");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("follows controlled open and value", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      const [value, setValue] = useState("");
      return (
        <>
          <ExpandingSearch
            open={open}
            onOpenChange={setOpen}
            value={value}
            onValueChange={setValue}
          />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(trigger());
    await user.keyboard("abc");
    expect(screen.getByRole("status")).toHaveTextContent("abc");
  });

  it("disables the trigger", () => {
    render(<ExpandingSearch disabled />);
    expect(trigger()).toBeDisabled();
  });

  it("lets a consumer className win and forwards ref, props and onBlur", async () => {
    const ref = createRef<HTMLFormElement>();
    const onBlur = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpandingSearch
        ref={ref}
        className="h-12 rounded-md"
        expandedWidth="20rem"
        stroke={false}
        onBlur={onBlur}
        label="Find"
        clearLabel="Reset"
        placeholder="Find…"
      />,
    );
    const form = screen.getByRole("search", { name: "Find" });
    expect(ref.current).toBe(form);
    expect(form).toHaveClass("h-12", "rounded-md");
    expect(form).not.toHaveClass("h-10", "rounded-full");
    expect(form.style.getPropertyValue("--expanding-search-width")).toBe("20rem");
    await user.click(screen.getByRole("button", { name: "Find" }));
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ExpandingSearch defaultOpen defaultValue="hi" />);
    await expectNoA11yViolations(container);
  });
});
