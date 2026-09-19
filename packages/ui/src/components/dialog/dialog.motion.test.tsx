import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Example({ animation }: { animation?: "default" | "spring" }) {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent animation={animation}>
        <DialogHeader>
          <DialogTitle>Invite</DialogTitle>
          <DialogDescription>Send a link.</DialogDescription>
        </DialogHeader>
        <p>Body</p>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-dialog"]');
}

describe("Dialog motion", () => {
  it("keeps the default entrance unless asked", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByText("Open"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("data-[state=open]:animate-dialog-in");
    expect(dialog).not.toHaveAttribute("data-animation");
  });

  it('pops in with an overshoot and staggers its sections with animation="spring"', async () => {
    const user = userEvent.setup();
    render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-animation", "spring");
    expect(dialog).toHaveClass(
      "data-[state=open]:animate-[dowel-dialog-spring-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
      "data-[state=closed]:animate-dialog-out",
    );
    expect(dialog).not.toHaveClass("data-[state=open]:animate-dialog-in");

    const css = stylesheet()?.textContent ?? "";
    expect(css).toContain(
      ">:not([data-slot=dialog-close]):nth-child(2){animation-delay:calc(60ms",
    );
    expect(document.querySelectorAll('style[data-href="dowel-dialog"]')).toHaveLength(1);
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

  it("keeps focus management and Escape with the spring entrance", async () => {
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

  it("lets a consumer className win over the spring panel", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent animation="spring" className="max-w-2xl">
          <DialogTitle>Wide</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.keyboard("{Tab}");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-2xl");
    expect(dialog).not.toHaveClass("max-w-lg");
  });

  it("has no accessibility violations with the spring entrance", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example animation="spring" />);
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
