import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GooeyPopover, type GooeyPopoverProps } from "./gooey-popover";

function Example(props: Partial<GooeyPopoverProps>) {
  return (
    <GooeyPopover triggerLabel="Quick actions" {...props}>
      <p>Popover content</p>
      <button type="button">Confirm</button>
    </GooeyPopover>
  );
}

function content() {
  return document.querySelector<HTMLElement>('[data-slot="gooey-popover-content"]');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GooeyPopover", () => {
  it("renders a named, collapsed icon trigger", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(content()).toBeNull();
  });

  it("opens from a click into a named dialog with focus inside", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Quick actions" });
    expect(dialog).toHaveTextContent("Popover content");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("opens from the keyboard, closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on an outside press and when the trigger is pressed again", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Outside</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Quick actions" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<Example open onOpenChange={onOpenChange} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("draws the goo layer with a unique filter id and hides decoration", async () => {
    render(
      <>
        <Example open />
        <GooeyPopover triggerLabel="Second" open aria-label="Other">
          x
        </GooeyPopover>
      </>,
    );
    await screen.findByRole("dialog", { name: "Quick actions" });
    const goo = document.querySelectorAll<HTMLElement>('[data-slot="gooey-popover-goo"]');
    expect(goo).toHaveLength(2);
    const ids = [...document.querySelectorAll("filter")].map((filter) => filter.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^dowel-goo-/);
    expect(goo[0]).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector('[data-slot="gooey-popover-ghost"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(document.querySelectorAll('style[data-href="dowel-gooey-popover"]')).toHaveLength(1);
  });

  it("measures the trigger's centre relative to the content", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const isTrigger = this.dataset.slot === "gooey-popover-trigger";
      return (
        isTrigger
          ? { left: 100, top: 300, width: 44, height: 44 }
          : { left: 20, top: 100, width: 240, height: 120 }
      ) as DOMRect;
    });
    render(<Example defaultOpen />);
    await screen.findByRole("dialog");
    await waitFor(() => expect(content()!.style.getPropertyValue("--gooey-x")).toBe("102px"));
    expect(content()!.style.getPropertyValue("--gooey-y")).toBe("222px");
  });

  it.each([
    ["top", "50%", "calc(100% + 30px)"],
    ["bottom", "50%", "-30px"],
    ["left", "calc(100% + 30px)", "50%"],
    ["right", "-30px", "50%"],
  ] as const)("guesses the trigger position for side=%s", async (side, x, y) => {
    render(<Example defaultOpen side={side} sideOffset={10} triggerSize={40} duration={400} />);
    await screen.findByRole("dialog");
    expect(content()!.style.getPropertyValue("--gooey-gx")).toBe(x);
    expect(content()!.style.getPropertyValue("--gooey-gy")).toBe(y);
    expect(content()!.style.getPropertyValue("--gooey-speed")).toBe("400ms");
    expect(content()!.style.getPropertyValue("--gooey-size")).toBe("40px");
  });

  it("uses a custom icon, tone, sizes, and lets classNames win", async () => {
    render(
      <Example
        defaultOpen
        tone="primary"
        trigger={<span data-testid="icon">i</span>}
        triggerSize={56}
        contentWidth="20rem"
        className="p-2"
        triggerClassName="rounded-md"
        aria-labelledby="heading"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    expect(trigger).toHaveClass("bg-primary", "rounded-md");
    expect(trigger).not.toHaveClass("rounded-full");
    expect(trigger).toHaveStyle({ width: "56px" });
    expect(screen.getAllByTestId("icon")).toHaveLength(2);
    await screen.findByText("Popover content");
    expect(content()).toHaveClass("p-2");
    expect(content()).not.toHaveClass("p-0");
    expect(content()!.style.width).toBe("20rem");
    expect(content()).toHaveAttribute("aria-labelledby", "heading");
    expect(content()).not.toHaveAttribute("aria-label");
  });

  it("forwards refs to the content (object and callback)", async () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = render(<Example defaultOpen ref={ref} />);
    await screen.findByRole("dialog");
    expect(ref.current).toBe(content());
    unmount();
    const callback = vi.fn();
    render(<Example defaultOpen ref={callback} />);
    await screen.findByRole("dialog");
    expect(callback).toHaveBeenCalledWith(content());
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Quick actions" }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
