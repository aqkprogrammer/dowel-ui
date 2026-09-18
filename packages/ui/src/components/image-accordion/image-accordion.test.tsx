import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ImageAccordion, type ImageAccordionItem } from "./image-accordion";

const items: ImageAccordionItem[] = [
  { id: "a", title: "Dunes", description: "Wind-cut ridges", image: "/dunes.jpg" },
  {
    id: "b",
    title: "Harbour",
    description: "Boats at dusk",
    image: "/harbour.jpg",
    imageAlt: "Boats",
  },
  { id: "c", title: "Meadow", media: <div data-testid="gradient" /> },
  { id: "d", title: "Ridge" },
];

function trigger(name: string) {
  return screen.getByRole("button", { name });
}

function item(name: string) {
  return trigger(name).closest<HTMLElement>('[data-slot="image-accordion-item"]');
}

describe("ImageAccordion", () => {
  it("renders APG accordion headers inside headings, the first open", () => {
    render(<ImageAccordion items={items} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(trigger("Dunes")).toHaveAttribute("aria-expanded", "true");
    expect(trigger("Harbour")).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(trigger("Dunes").getAttribute("aria-controls") ?? "");
    expect(panel).toHaveTextContent("Wind-cut ridges");
    expect(panel).not.toHaveAttribute("aria-hidden");
    // No caption, nothing to control.
    expect(trigger("Ridge")).not.toHaveAttribute("aria-controls");
  });

  it("hides closed captions and grows the open panel", () => {
    render(<ImageAccordion items={items} expandedSize={5} />);
    const closed = document.getElementById(
      trigger("Harbour").getAttribute("aria-controls") ?? "",
    );
    expect(closed).toHaveAttribute("aria-hidden", "true");
    expect(closed).toHaveAttribute("inert");
    expect(item("Dunes")?.style.flexGrow).toBe("5");
    expect(item("Harbour")?.style.flexGrow).toBe("1");
    expect(item("Dunes")).toHaveAttribute("data-state", "open");
  });

  it("renders images decoratively unless given alt text, or custom media", () => {
    const { container } = render(<ImageAccordion items={items} />);
    expect(container.querySelector('img[src="/dunes.jpg"]')).toHaveAttribute("alt", "");
    expect(screen.getByRole("img", { name: "Boats" })).toBeInTheDocument();
    expect(screen.getByTestId("gradient")).toBeInTheDocument();
  });

  it("opens on mouse hover, but not on touch", () => {
    render(<ImageAccordion items={items} />);
    fireEvent.pointerEnter(item("Harbour") as HTMLElement, { pointerType: "mouse" });
    expect(trigger("Harbour")).toHaveAttribute("aria-expanded", "true");
    expect(trigger("Dunes")).toHaveAttribute("aria-expanded", "false");
    fireEvent.pointerEnter(item("Meadow") as HTMLElement, { pointerType: "touch" });
    expect(trigger("Meadow")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on press", async () => {
    const user = userEvent.setup();
    render(<ImageAccordion items={items} activateOn="click" />);
    await user.click(trigger("Meadow"));
    expect(trigger("Meadow")).toHaveAttribute("aria-expanded", "true");
  });

  it("opens on keyboard focus in hover mode", async () => {
    const user = userEvent.setup();
    render(<ImageAccordion items={items} />);
    await user.tab();
    await user.tab();
    expect(trigger("Harbour")).toHaveFocus();
    expect(trigger("Harbour")).toHaveAttribute("aria-expanded", "true");
  });

  it("only opens on press in click mode", async () => {
    const user = userEvent.setup();
    render(<ImageAccordion items={items} activateOn="click" />);
    fireEvent.pointerEnter(item("Harbour") as HTMLElement, { pointerType: "mouse" });
    await user.tab();
    await user.tab();
    expect(trigger("Harbour")).toHaveFocus();
    expect(trigger("Harbour")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    expect(trigger("Harbour")).toHaveAttribute("aria-expanded", "true");
  });

  it("moves between headers with arrow keys, wrapping, Home and End", async () => {
    const user = userEvent.setup();
    render(<ImageAccordion items={items} activateOn="click" />);
    trigger("Dunes").focus();
    await user.keyboard("{ArrowRight}");
    expect(trigger("Harbour")).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(trigger("Ridge")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(trigger("Dunes")).toHaveFocus();
    await user.keyboard("{End}");
    expect(trigger("Ridge")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(trigger("Ridge")).toHaveFocus();
    await user.keyboard("{Shift>}{Home}{/Shift}");
  });

  it("mirrors the arrow keys in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <ImageAccordion items={items} activateOn="click" />
      </div>,
    );
    trigger("Dunes").focus();
    await user.keyboard("{ArrowLeft}");
    expect(trigger("Harbour")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(trigger("Dunes")).toHaveFocus();
  });

  it("uses Up and Down when vertical, with titles upright", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImageAccordion items={items} orientation="vertical" activateOn="click" />,
    );
    expect(container.firstElementChild).toHaveClass("flex-col");
    trigger("Dunes").focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger("Harbour")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(trigger("Dunes")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(trigger("Dunes")).toHaveFocus();
    const title = container.querySelector('[data-slot="image-accordion-title"]');
    expect(title?.className).not.toContain("vertical-rl");
  });

  it("ignores keys from outside the headers and modified keys", () => {
    const onKeyDown = vi.fn();
    const { container } = render(<ImageAccordion items={items} onKeyDown={onKeyDown} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "ArrowRight" });
    fireEvent.keyDown(trigger("Dunes"), { key: "ArrowRight", ctrlKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(document.body).toHaveFocus();
  });

  it("supports a controlled active panel", async () => {
    const user = userEvent.setup();
    const onActiveIndexChange = vi.fn();
    function Controlled() {
      const [active, setActive] = useState(2);
      return (
        <ImageAccordion
          items={items}
          activateOn="click"
          activeIndex={active}
          onActiveIndexChange={(next) => {
            onActiveIndexChange(next);
            setActive(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(trigger("Meadow")).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger("Ridge"));
    expect(onActiveIndexChange).toHaveBeenCalledWith(3);
    expect(trigger("Ridge")).toHaveAttribute("aria-expanded", "true");
    // Pressing the open one again changes nothing.
    await user.click(trigger("Ridge"));
    expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
  });

  it("takes a heading level", () => {
    render(<ImageAccordion items={items} headingLevel={2} />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
  });

  it("lets a consumer className win, and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ImageAccordion items={items} ref={ref} className="h-96 gap-4" />);
    expect(ref.current).toHaveClass("h-96", "gap-4");
    expect(ref.current).not.toHaveClass("h-80");
    expect(ref.current).not.toHaveClass("gap-2");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ImageAccordion items={items} />);
    await expectNoA11yViolations(container);
  });
});
