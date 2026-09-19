import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, Folder } from "lucide-react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CreateMenu, CreateMenuItem, type CreateMenuProps } from "./create-menu";

function Example({
  onDocument,
  ...props
}: Partial<CreateMenuProps> & { onDocument?: () => void }) {
  return (
    <CreateMenu {...props}>
      <CreateMenuItem icon={<FileText />} onSelect={onDocument}>
        Document
      </CreateMenuItem>
      <CreateMenuItem>Spreadsheet</CreateMenuItem>
      <CreateMenuItem disabled>Board</CreateMenuItem>
      <CreateMenuItem icon={<Folder />}>Folder</CreateMenuItem>
    </CreateMenu>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CreateMenu", () => {
  it("renders a menu button labelled by its label, with a decorative default icon", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Create" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("takes a custom label and icon, or none", () => {
    const { rerender } = render(
      <Example label="New" icon={<svg data-testid="custom" aria-hidden="true" />} />,
    );
    expect(screen.getByRole("button", { name: "New" })).toContainElement(
      screen.getByTestId("custom"),
    );
    rerender(<Example icon={null} />);
    expect(screen.getByRole("button", { name: "Create" }).querySelector("svg")).toBeNull();
  });

  it("opens from the pointer, over the trigger and inside the component", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const trigger = screen.getByRole("button", { name: "Create" });

    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("data-state", "open");
    // Not portalled: the panel grows out of the pill in place.
    expect(container).toContainElement(menu);
    expect(menu).toHaveAttribute("data-side", "bottom");
    expect(menu).toHaveAccessibleName("Create");
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  });

  it("opens from the keyboard and focuses the first item", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Document" })).toHaveFocus();
    });
  });

  it("moves with Up/Down, skips disabled items and jumps with Home/End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Document" })).toHaveFocus();
    });

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Spreadsheet" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Folder" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Document" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Folder" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Spreadsheet" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Create" });
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("runs an item's onSelect and closes", async () => {
    const onDocument = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onDocument={onDocument} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(await screen.findByRole("menuitem", { name: "Document" }));
    expect(onDocument).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("closes on an outside press", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <span data-testid="state">{open ? "open" : "closed"}</span>
          <Example open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Controlled />);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("slides one shared, decorative highlight pill to the highlighted item", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<Example defaultOpen />);
    const menu = await screen.findByRole("menu");
    const pill = menu.querySelector<HTMLElement>('[data-slot="create-menu-highlight"]');
    expect(pill).toHaveAttribute("aria-hidden", "true");
    expect(pill?.style.opacity).toBe("0");

    const items = screen.getAllByRole("menuitem");
    Object.defineProperty(items[0], "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(items[1], "offsetTop", { configurable: true, value: 36 });
    Object.defineProperty(items[1], "offsetHeight", { configurable: true, value: 34 });

    act(() => {
      items[0]?.focus();
    });
    expect(pill?.style.opacity).toBe("1");
    expect(pill).not.toHaveAttribute("data-moving");

    await user.keyboard("{ArrowDown}");
    expect(pill?.style.transform).toBe("translateY(36px)");
    expect(pill?.style.height).toBe("34px");
    expect(pill).toHaveAttribute("data-moving");
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(pill).not.toHaveAttribute("data-moving");

    // Radix focuses the menu itself when the pointer leaves: the pill fades.
    fireEvent.focusIn(menu);
    expect(pill?.style.opacity).toBe("0");
  });

  it("applies corner, panel width, tone and stroke", async () => {
    const { container } = render(
      <Example defaultOpen corner={12} panelWidth={240} tone="inverted" stroke />,
    );
    const root = container.querySelector<HTMLElement>('[data-slot="create-menu"]');
    expect(root?.style.getPropertyValue("--create-menu-corner")).toBe("12px");
    const menu = await screen.findByRole("menu");
    expect(menu.style.width).toBe("240px");
    expect(menu).toHaveClass("text-background");
    const surface = menu.querySelector('[data-slot="create-menu-surface"]');
    expect(surface).toHaveClass("bg-foreground", "inset-ring");
    expect(screen.getByRole("button", { name: "Create" })).toHaveClass("bg-foreground");
  });

  it("measures the trigger to lay the panel over it", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
    render(<Example />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("lets consumer classNames win and forwards ref and props", async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <CreateMenu
        ref={ref}
        data-testid="root"
        className="inline-flex"
        triggerClassName="px-2"
        contentClassName="px-6"
        defaultOpen
      >
        <CreateMenuItem className="h-10" style={{ color: "inherit" }}>
          Document
        </CreateMenuItem>
      </CreateMenu>,
    );
    expect(ref.current).toBe(container.querySelector('[data-slot="create-menu"]'));
    expect(screen.getByTestId("root")).toHaveClass("inline-flex");
    expect(screen.getByTestId("root")).not.toHaveClass("inline-grid");
    expect(screen.getByRole("button", { hidden: true, name: "Create" })).toHaveClass("px-2");
    expect(screen.getByRole("button", { hidden: true, name: "Create" })).not.toHaveClass(
      "px-5",
    );
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("px-6");
    expect(menu).not.toHaveClass("px-2.5");
    const item = screen.getByRole("menuitem", { name: "Document" });
    expect(item).toHaveClass("h-10");
    expect(item).not.toHaveClass("h-8.5");
    expect(item.style.borderRadius).toBe("var(--create-menu-row-r)");
  });

  it("hoists its keyframes once, scaled by --motion-scale", () => {
    render(
      <>
        <Example />
        <Example />
      </>,
    );
    const sheets = document.querySelectorAll('style[data-href="dowel-create-menu"]');
    expect(sheets.length).toBe(1);
    expect(sheets[0]?.textContent).toContain("var(--motion-scale)");
  });

  it("has no axe violations closed or open", async () => {
    const { container, baseElement } = render(<Example />);
    await expectNoA11yViolations(container);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Create" }), {
      button: 0,
      pointerType: "mouse",
    });
    await screen.findByRole("menu");
    await expectNoA11yViolations(baseElement);
  });
});
