import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast as ToastPrimitive } from "radix-ui";
import { afterEach, describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Toast, ToastProvider, ToastTitle, Toaster } from "./toast";
import { resetToasts, toast } from "./toast-store";

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

function raise(message: string) {
  act(() => {
    toast(message);
  });
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-toast"]');
}

describe("Toast motion", () => {
  it("slides in from off-screen by default", async () => {
    render(<Toaster />);
    raise("Saved");
    await screen.findByText("Saved");
    const node = document.querySelector("[data-slot='toast']");
    expect(node).toHaveClass("data-[state=open]:animate-slide-in");
    expect(node).not.toHaveAttribute("data-animation");
  });

  it('hops in with a scale pop with animation="spring", keeping the exit and swipe', async () => {
    render(<Toaster animation="spring" />);
    raise("Saved");
    await screen.findByText("Saved");

    const node = document.querySelector("[data-slot='toast']");
    expect(node).toHaveAttribute("data-animation", "spring");
    expect(node).toHaveClass(
      "data-[animation=spring]:data-[state=open]:animate-[dowel-toast-spring-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
      "data-[state=closed]:animate-float-out",
      "data-[swipe=end]:animate-toast-swipe-out",
    );
    expect(stylesheet()?.textContent).toContain("@keyframes dowel-toast-spring-in");
  });

  it.each([
    ["bottom-right", "[--dowel-toast-from:3rem]"],
    ["top-left", "[--dowel-toast-from:-3rem]"],
    ["bottom-center", "[--dowel-toast-from:0]"],
  ] as const)("hops in from the docked edge at %s", (position, origin) => {
    const { baseElement } = render(<Toaster animation="spring" position={position} />);
    expect(baseElement.querySelector("[data-slot='toast-viewport']")).toHaveClass(origin);
  });

  it("leaves the viewport untouched by default", () => {
    const { baseElement } = render(<Toaster position="top-left" />);
    const viewport = baseElement.querySelector("[data-slot='toast-viewport']");
    expect(viewport?.className).not.toContain("dowel-toast-from");
  });

  it("times the pop from --motion-scale, so reduced motion settles instantly", async () => {
    render(<Toaster animation="spring" />);
    raise("Saved");
    await screen.findByText("Saved");
    const node = document.querySelector("[data-slot='toast']");
    const animations = node?.className.match(/animate-\[[^\]]*\]/g) ?? [];
    expect(animations.length).toBeGreaterThan(0);
    for (const animation of animations) expect(animation).toContain("var(--motion-scale)");
    expect(document.querySelectorAll('style[data-href="dowel-toast"]')).toHaveLength(1);
  });

  it("works on a hand-built Toast", async () => {
    render(
      <ToastProvider>
        <Toast animation="spring" open>
          <ToastTitle>Manual</ToastTitle>
        </Toast>
        <ToastPrimitive.Viewport />
      </ToastProvider>,
    );
    expect(await screen.findByText("Manual")).toBeInTheDocument();
    expect(document.querySelector("[data-slot='toast']")).toHaveAttribute(
      "data-animation",
      "spring",
    );
  });

  it("still dismisses from its close button", async () => {
    const user = userEvent.setup();
    render(<Toaster animation="spring" />);
    raise("Saved");
    await screen.findByText("Saved");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(document.querySelector("[data-slot='toast']")).toBeNull();
    });
  });

  it("has no accessibility violations with the spring entrance", async () => {
    const { baseElement } = render(<Toaster animation="spring" />);
    raise("Saved");
    await screen.findByText("Saved");
    await expectNoA11yViolations(baseElement);
  });
});
