import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
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

const DRAWER_HEIGHT = 400;

function Example({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
  return (
    <Drawer onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button>Open</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow down the results.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>Body</DrawerBody>
        <DrawerFooter>
          <DrawerCancel>Cancel</DrawerCancel>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** jsdom reports every box as zero-sized, so the drawer's height is stubbed to
 * exercise the distance-based dismiss rule. */
function stubHeight(element: Element, height = DRAWER_HEIGHT) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    height,
    width: 320,
    top: 0,
    left: 0,
    right: 320,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

async function open() {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByRole("button", { name: "Open" }));
  const dialog = await screen.findByRole("dialog");
  const handle = dialog.querySelector("[data-slot='drawer-handle']");
  if (!handle) throw new Error("drawer handle not rendered");
  stubHeight(dialog);
  return { user, dialog, handle };
}

function drag(handle: Element, distance: number) {
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: distance });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: distance });
}

describe("Drawer", () => {
  it("opens from its trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });

  it("hides the drag handle from assistive technology", async () => {
    const { handle } = await open();
    expect(handle).toHaveAttribute("aria-hidden", "true");
  });

  it("closes on Escape", async () => {
    const { user } = await open();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes from DrawerCancel", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("drag to dismiss", () => {
    it("closes when dragged past a quarter of its height", async () => {
      const { handle } = await open();

      drag(handle, DRAWER_HEIGHT * 0.5);
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("stays open when dragged only a little", async () => {
      const { handle } = await open();

      // Below MIN_FLICK_DISTANCE, so neither the distance nor the velocity rule
      // fires. A tap on the handle must never dismiss the drawer.
      drag(handle, 8);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("follows the pointer while dragging", async () => {
      const { dialog, handle } = await open();

      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 60 });

      expect(dialog).toHaveAttribute("data-dragging", "true");
      expect(dialog.style.transform).toBe("translate3d(0, 60px, 0)");

      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 60 });
    });

    it("ignores upward drags so the panel stays anchored to the edge", async () => {
      const { dialog, handle } = await open();

      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 100 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 20 });

      expect(dialog.style.transform).toBe("");

      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 20 });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ignores non-primary buttons", async () => {
      const { dialog, handle } = await open();

      fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientY: 0 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });

      expect(dialog.style.transform).toBe("");
    });
  });

  it("reports open state changes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("throws a useful error if content is rendered outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <DrawerContent>
          <DrawerTitle>Orphan</DrawerTitle>
        </DrawerContent>,
      ),
    ).toThrow(/must be rendered inside <Drawer>/);
    consoleError.mockRestore();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await expectNoA11yViolations(baseElement);
  });
});
