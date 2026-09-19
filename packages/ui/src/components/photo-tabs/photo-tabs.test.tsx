import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PhotoTabs, type PhotoTab } from "./photo-tabs";

const TABS: PhotoTab[] = [
  { value: "people", label: "People", icon: <svg data-testid="icon" />, src: "/one.jpg" },
  { value: "pets", label: "Pets", icon: <svg />, src: "/two.jpg", alt: "A white dog" },
  { value: "places", label: "Places", icon: <svg />, src: "/three.jpg" },
];

describe("PhotoTabs", () => {
  it("renders a named tab list and the first photo", () => {
    render(<PhotoTabs tabs={TABS} />);
    expect(screen.getByRole("tablist", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "People",
      "Pets",
      "Places",
    ]);
    expect(screen.getByRole("tab", { name: "People" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("img", { name: "People" })).toHaveAttribute("src", "/one.jpg");
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("switches photos on click and with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<PhotoTabs tabs={TABS} />);
    await user.click(screen.getByRole("tab", { name: "Pets" }));
    expect(screen.getByRole("img", { name: "A white dog" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Places" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Places" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Home}");
    expect(screen.getByRole("img", { name: "People" })).toBeInTheDocument();
  });

  it("follows a hovered trigger with the pill and hides it on leave", () => {
    const { container } = render(<PhotoTabs tabs={TABS} />);
    const pill = container.querySelector<HTMLElement>('[data-slot="photo-tabs-pill"]');
    expect(pill).toHaveAttribute("data-state", "hidden");
    expect(pill).toHaveAttribute("aria-hidden", "true");
    fireEvent.pointerEnter(screen.getByRole("tab", { name: "Pets" }));
    expect(pill).toHaveAttribute("data-state", "visible");
    expect(pill?.style.translate).toBe("0px 0px");
    fireEvent.pointerLeave(screen.getByRole("tablist"));
    expect(pill).toHaveAttribute("data-state", "hidden");
  });

  it("reveals the bar on hover and focus, or always when asked", () => {
    const { rerender } = render(<PhotoTabs tabs={TABS} />);
    const list = screen.getByRole("tablist");
    expect(list.className).toContain(
      "pointer-fine:group-focus-within/photo-tabs:translate-y-0",
    );
    expect(list).toHaveClass("bottom-3");
    rerender(<PhotoTabs tabs={TABS} revealOnHover={false} barPosition="top" />);
    expect(list.className).not.toContain("pointer-fine:opacity-0");
    expect(list).toHaveClass("top-3");
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("places");
      return (
        <PhotoTabs
          tabs={TABS}
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("img", { name: "Places" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "People" }));
    expect(onValueChange).toHaveBeenCalledWith("people");
    expect(screen.getByRole("img", { name: "People" })).toBeInTheDocument();
  });

  it("honours defaultValue, height, list label and part classes", () => {
    render(
      <PhotoTabs
        tabs={TABS}
        defaultValue="pets"
        height={300}
        listLabel="Albums"
        listClassName="gap-4"
        triggerClassName="size-10"
        imageClassName="object-contain"
        data-testid="root"
      />,
    );
    expect(screen.getByTestId("root")).toHaveStyle({ height: "300px" });
    expect(screen.getByRole("tablist", { name: "Albums" })).toHaveClass("gap-4");
    expect(screen.getByRole("tab", { name: "Pets" })).toHaveClass("size-10");
    expect(screen.getByRole("img", { name: "A white dog" })).toHaveClass("object-contain");
  });

  it("merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PhotoTabs ref={ref} tabs={TABS} className="rounded-none" data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId("root"));
    expect(ref.current).toHaveClass("rounded-none");
    expect(ref.current).not.toHaveClass("rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PhotoTabs tabs={TABS} />);
    await expectNoA11yViolations(container);
  });
});
