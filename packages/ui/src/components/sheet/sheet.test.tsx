import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from "./sheet";

function Example({ side }: { side?: SheetContentProps["side"] } = {}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Changes are saved immediately.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens from its trigger and is named by its title", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
  });

  it.each([
    ["top", "[--slide-y:-100%]"],
    ["bottom", "[--slide-y:100%]"],
    ["left", "[--slide-x:-100%]"],
    ["right", "[--slide-x:100%]"],
  ] as const)("slides in from the %s", async (side, expectedClass) => {
    const user = userEvent.setup();
    render(<Example side={side} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toHaveClass(expectedClass);
  });

  it("stacks the panel above its own overlay", async () => {
    // The overlay and the panel share a layer, and the overlay comes first in
    // the document, so the panel paints over it. They were once on separate
    // layers with the overlay's higher, which dimmed every open sheet.
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    const panel = await screen.findByRole("dialog");
    const overlay = document.querySelector("[data-slot='sheet-overlay']");
    if (!overlay) throw new Error("sheet overlay not rendered");

    const layer = (element: Element) => /z-\[var\(--z-[a-z]+\)\]/.exec(element.className)?.[0];
    expect(layer(panel)).toBe("z-[var(--z-drawer)]");
    expect(layer(overlay)).toBe(layer(panel));
    expect(
      overlay.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("defaults to the right edge", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toHaveClass("[--slide-x:100%]");
  });

  it("closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("closes from SheetClose", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("omits the close button when asked", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetTitle>No close button</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("closes from the built-in close button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("lets a consumer className override the width", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent className="max-w-2xl">
          <SheetTitle>Wide</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByText("Open"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("max-w-2xl");
    expect(dialog).not.toHaveClass("max-w-sm");
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await expectNoA11yViolations(baseElement);
  });
});
