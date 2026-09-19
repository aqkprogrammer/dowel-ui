import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Drawer,
  DrawerBody,
  DrawerCancel,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

function Example({ animation }: { animation?: "default" | "spring" }) {
  return (
    <Drawer>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent animation={animation}>
        <DrawerHeader>
          <DrawerTitle>Share</DrawerTitle>
          <DrawerDescription>Anyone with the link can view.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>Body</DrawerBody>
        <DrawerFooter>
          <DrawerCancel>Cancel</DrawerCancel>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-drawer"]');
}

describe("Drawer motion", () => {
  it("slides up as one piece by default", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Open"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveAttribute("data-animation");
    expect(dialog).toHaveClass("data-[state=open]:animate-slide-in");
  });

  it('staggers its sections after the slide with animation="spring", skipping the handle', async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-animation", "spring");
    expect(dialog).toHaveClass("data-[state=open]:animate-slide-in");
    const css = stylesheet()?.textContent ?? "";
    expect(css).toContain(">:not([data-slot=drawer-handle])");
    expect(css).toContain("animation-delay:calc(120ms * var(--motion-scale))");
    expect(document.querySelectorAll('style[data-href="dowel-drawer"]')).toHaveLength(1);
  });

  it("scales every duration and delay by --motion-scale, so reduced motion settles instantly", async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");

    const timings = stylesheet()?.textContent?.match(/calc\([^)]*\)/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) expect(timing).toContain("var(--motion-scale)");
  });

  it("keeps its keyboard ways out: Escape closes and focus returns", async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    const trigger = screen.getByText("Open");
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("has no accessibility violations with the spring entrance", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
