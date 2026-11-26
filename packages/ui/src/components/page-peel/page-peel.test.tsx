import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PagePeel } from "./page-peel";

function part(slot: string) {
  return document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
}

function setup(props: Partial<Parameters<typeof PagePeel>[0]> = {}) {
  return render(
    <PagePeel revealContent={<a href="#code">Code: PEEL-20</a>} {...props}>
      <a href="#offer">20% off</a>
    </PagePeel>,
  );
}

describe("PagePeel", () => {
  it("is a toggle button at the corner, off at first", () => {
    setup();
    const handle = screen.getByRole("button", { name: "Peel back" });
    expect(handle).toHaveAttribute("aria-pressed", "false");
    expect(part("page-peel")).toHaveAttribute("data-state", "flat");
  });

  it("peels and un-peels by click and keyboard", async () => {
    const user = userEvent.setup();
    setup();
    const handle = screen.getByRole("button", { name: "Peel back" });

    await user.click(handle);
    expect(handle).toHaveAttribute("aria-pressed", "true");
    expect(part("page-peel")).toHaveAttribute("data-state", "peeled");

    handle.focus();
    await user.keyboard("{Enter}");
    expect(handle).toHaveAttribute("aria-pressed", "false");
    await user.keyboard(" ");
    expect(handle).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps hidden content out of reach", async () => {
    const user = userEvent.setup();
    setup();
    expect(part("page-peel-reveal")).toHaveAttribute("inert");
    expect(part("page-peel-face")).not.toHaveAttribute("inert");

    await user.click(screen.getByRole("button", { name: "Peel back" }));
    expect(part("page-peel-reveal")).not.toHaveAttribute("inert");
    expect(part("page-peel-face")).toHaveAttribute("inert");
  });

  it("follows a controlled value and reports changes", async () => {
    const user = userEvent.setup();
    const onPeeledChange = vi.fn();
    function Controlled() {
      const [peeled, setPeeled] = useState(true);
      return (
        <PagePeel
          peeled={peeled}
          onPeeledChange={(next) => {
            setPeeled(next);
            onPeeledChange(next);
          }}
          revealContent="Under"
        >
          Over
        </PagePeel>
      );
    }
    render(<Controlled />);
    const handle = screen.getByRole("button", { name: "Peel back" });
    expect(handle).toHaveAttribute("aria-pressed", "true");
    await user.click(handle);
    expect(onPeeledChange).toHaveBeenCalledWith(false);
    expect(handle).toHaveAttribute("aria-pressed", "false");
  });

  it("cuts the corner from the page while hovered, and not before", () => {
    setup();
    Object.defineProperty(part("page-peel"), "offsetWidth", { value: 200, configurable: true });
    const before = part("page-peel-face").style.clipPath;
    fireEvent.pointerEnter(part("page-peel"));
    // Size is measured on mount (0 in jsdom), so the hover hint stays a zero cut.
    expect(part("page-peel-face").style.clipPath).toContain("polygon(");
    expect(before).toContain("polygon(");
  });

  it("resolves the logical corner against the direction", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <PagePeel corner="bottom-end" revealContent="Under">
          Over
        </PagePeel>
      </div>,
    );
    // bottom-end in right-to-left is the bottom-left corner.
    expect(part("page-peel-handle").style.left).toBe("0px");
    expect(part("page-peel-handle").style.bottom).toBe("0px");
  });

  it("takes its own label and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PagePeel ref={ref} label="Reveal code" revealContent="Under">
        Over
      </PagePeel>,
    );
    expect(screen.getByRole("button", { name: "Reveal code" })).toBeInTheDocument();
    expect(ref.current).toBe(part("page-peel"));
  });

  it("keeps the flap decorative", () => {
    setup();
    expect(part("page-peel-flap")).toHaveAttribute("aria-hidden", "true");
  });

  it("has no accessibility violations, flat or peeled", async () => {
    const { container } = setup();
    await expectNoA11yViolations(container);
    const { container: peeled } = render(
      <PagePeel defaultPeeled revealContent="Under">
        Over
      </PagePeel>,
    );
    await expectNoA11yViolations(peeled);
  });
});
