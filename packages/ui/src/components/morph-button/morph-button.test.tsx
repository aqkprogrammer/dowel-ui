import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MorphButton } from "./morph-button";

const Rest = () => <svg data-testid="rest-icon" />;
const Active = () => <svg data-testid="active-icon" />;

function layer(button: HTMLElement, slot: "rest" | "active") {
  return button.querySelector(`[data-slot="morph-button-${slot}"]`);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MorphButton", () => {
  it("renders a button named by its label, with decorative icons", () => {
    render(<MorphButton icon={<Rest />} activeIcon={<Active />} label="Deploy app" />);
    const button = screen.getByRole("button", { name: "Deploy app" });
    expect(button.querySelector('[data-slot="morph-button-icon"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("shows the resting icon and hides the active one by default", () => {
    render(<MorphButton icon={<Rest />} activeIcon={<Active />} label="Deploy" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-state", "inactive");
    expect(layer(button, "rest")).toHaveAttribute("data-state", "visible");
    expect(layer(button, "active")).toHaveAttribute("data-state", "hidden");
  });

  describe("toggle", () => {
    it("flips aria-pressed and data-state on click", async () => {
      const user = userEvent.setup();
      render(<MorphButton icon={<Rest />} activeIcon={<Active />} aria-label="Microphone" />);
      const button = screen.getByRole("button", { name: "Microphone" });
      expect(button).toHaveAttribute("aria-pressed", "false");

      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute("data-state", "active");
      expect(layer(button, "active")).toHaveAttribute("data-state", "visible");
      expect(layer(button, "rest")).toHaveAttribute("data-state", "hidden");

      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles from the keyboard with Enter and Space", async () => {
      const user = userEvent.setup();
      render(<MorphButton icon={<Rest />} aria-label="Bookmark" />);
      const button = screen.getByRole("button");

      await user.tab();
      expect(button).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(button).toHaveAttribute("aria-pressed", "true");
      await user.keyboard(" ");
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("keeps its accessible name when the visible label morphs", async () => {
      const user = userEvent.setup();
      render(
        <MorphButton
          icon={<Rest />}
          activeIcon={<Active />}
          label="Mute"
          activeLabel="Unmute"
        />,
      );
      const button = screen.getByRole("button", { name: "Mute" });
      await user.click(button);
      expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Unmute")).toHaveAttribute("data-state", "visible");
    });

    it("starts from defaultActive and reports changes", async () => {
      const onActiveChange = vi.fn();
      const user = userEvent.setup();
      render(
        <MorphButton
          icon={<Rest />}
          aria-label="Like"
          defaultActive
          onActiveChange={onActiveChange}
        />,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-pressed", "true");

      await user.click(button);
      expect(onActiveChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("follows the controlled prop and only requests changes", async () => {
      const onActiveChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <MorphButton
          icon={<Rest />}
          aria-label="Lock"
          active={false}
          onActiveChange={onActiveChange}
        />,
      );
      const button = screen.getByRole("button");

      await user.click(button);
      expect(onActiveChange).toHaveBeenCalledWith(true);
      expect(button).toHaveAttribute("aria-pressed", "false");

      rerender(
        <MorphButton
          icon={<Rest />}
          aria-label="Lock"
          active={true}
          onActiveChange={onActiveChange}
        />,
      );
      expect(button).toHaveAttribute("aria-pressed", "true");
    });

    it("works as a fully controlled pair", async () => {
      function Controlled() {
        const [on, setOn] = useState(false);
        return (
          <>
            <MorphButton
              icon={<Rest />}
              aria-label="Camera"
              active={on}
              onActiveChange={setOn}
            />
            <output>{on ? "on" : "off"}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("status")).toHaveTextContent("on");
    });

    it("does not toggle when the consumer prevents the click", async () => {
      const user = userEvent.setup();
      render(
        <MorphButton
          icon={<Rest />}
          aria-label="Theme"
          onClick={(event) => {
            event.preventDefault();
          }}
        />,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("transient", () => {
    it("activates, announces the active label, and reverts after the timeout", () => {
      vi.useFakeTimers();
      const onActiveChange = vi.fn();
      render(
        <MorphButton
          trigger="transient"
          icon={<Rest />}
          activeIcon={<Active />}
          label="Copy hash"
          activeLabel="Copied"
          revertAfter={1500}
          onActiveChange={onActiveChange}
        />,
      );
      const button = screen.getByRole("button", { name: "Copy hash" });
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();

      fireEvent.click(button);
      expect(button).toHaveAttribute("data-state", "active");
      expect(screen.getByRole("button", { name: "Copied" })).toBe(button);
      expect(screen.getByRole("status")).toHaveTextContent("Copied");
      expect(onActiveChange).toHaveBeenLastCalledWith(true);

      act(() => {
        vi.advanceTimersByTime(1499);
      });
      expect(button).toHaveAttribute("data-state", "active");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(button).toHaveAttribute("data-state", "inactive");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
      expect(onActiveChange).toHaveBeenLastCalledWith(false);
    });

    it("restarts the timer when pressed again while active", () => {
      vi.useFakeTimers();
      render(
        <MorphButton
          trigger="transient"
          icon={<Rest />}
          aria-label="Submit"
          revertAfter={1000}
        />,
      );
      const button = screen.getByRole("button");
      fireEvent.click(button);
      act(() => {
        vi.advanceTimersByTime(800);
      });
      fireEvent.click(button);
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(button).toHaveAttribute("data-state", "active");
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(button).toHaveAttribute("data-state", "inactive");
    });

    it("prefers an explicit announcement", async () => {
      const user = userEvent.setup();
      render(
        <MorphButton
          trigger="transient"
          icon={<Rest />}
          aria-label="Download"
          announcement="Download started"
        />,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("status")).toHaveTextContent("Download started");
    });

    it("clears its timer on unmount", () => {
      vi.useFakeTimers();
      const onActiveChange = vi.fn();
      const { unmount } = render(
        <MorphButton
          trigger="transient"
          icon={<Rest />}
          aria-label="Edit"
          onActiveChange={onActiveChange}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      unmount();
      act(() => {
        vi.runAllTimers();
      });
      expect(onActiveChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("hover", () => {
    it("activates on pointer enter and deactivates on leave", async () => {
      const user = userEvent.setup();
      render(<MorphButton trigger="hover" icon={<Rest />} label="Share" />);
      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("aria-pressed");

      await user.hover(button);
      expect(button).toHaveAttribute("data-state", "active");
      await user.unhover(button);
      expect(button).toHaveAttribute("data-state", "inactive");
    });

    it("activates on keyboard focus too, never hover alone", async () => {
      const user = userEvent.setup();
      render(<MorphButton trigger="hover" icon={<Rest />} label="Deploy" />);
      const button = screen.getByRole("button");

      await user.tab();
      expect(button).toHaveAttribute("data-state", "active");
      await user.tab();
      expect(button).toHaveAttribute("data-state", "inactive");
    });

    it("stays active when the pointer leaves a keyboard-focused button", async () => {
      const user = userEvent.setup();
      render(<MorphButton trigger="hover" icon={<Rest />} label="Deploy" />);
      const button = screen.getByRole("button");

      await user.tab();
      await user.hover(button);
      await user.unhover(button);
      expect(button).toHaveAttribute("data-state", "active");
    });

    it("deactivates when the pointer leaves after a click, since click focus is not keyboard focus", async () => {
      const user = userEvent.setup();
      render(<MorphButton trigger="hover" icon={<Rest />} label="Deploy" />);
      const button = screen.getByRole("button");

      await user.click(button);
      expect(button).toHaveFocus();
      await user.unhover(button);
      expect(button).toHaveAttribute("data-state", "inactive");
    });
  });

  it("changes only through the prop in manual mode, and names by the visible label", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MorphButton trigger="manual" icon={<Rest />} label="Save" activeLabel="Saved" />,
    );
    const button = screen.getByRole("button", { name: "Save" });
    await user.click(button);
    expect(button).toHaveAttribute("data-state", "inactive");
    expect(button).not.toHaveAttribute("aria-pressed");

    rerender(
      <MorphButton trigger="manual" active icon={<Rest />} label="Save" activeLabel="Saved" />,
    );
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("reuses the resting icon when no active icon is given, filled on request", () => {
    render(
      <MorphButton icon={<Rest />} aria-label="Save for later" fillOnActive tone="primary" />,
    );
    expect(screen.getAllByTestId("rest-icon")).toHaveLength(2);
    const active = layer(screen.getByRole("button"), "active");
    expect(active).toHaveClass("[&>svg]:fill-current", "text-primary");
  });

  it.each([
    ["primary", "text-primary"],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
    ["info", "text-info"],
  ] as const)("colours the active icon with the %s tone", (tone, expected) => {
    render(<MorphButton icon={<Rest />} aria-label="Tone" tone={tone} />);
    expect(layer(screen.getByRole("button"), "active")).toHaveClass(expected);
    expect(layer(screen.getByRole("button"), "rest")).not.toHaveClass(expected);
  });

  it.each([
    ["scale", "data-[state=hidden]:scale-50", "data-[state=hidden]:scale-50"],
    [
      "rise",
      "data-[state=hidden]:-translate-y-[15px]",
      "data-[state=hidden]:translate-y-[15px]",
    ],
    ["tilt", "data-[state=hidden]:rotate-15", "data-[state=hidden]:-rotate-15"],
  ] as const)("applies the %s morph to both layers", (morph, rest, active) => {
    render(<MorphButton icon={<Rest />} aria-label="Morph" morph={morph} />);
    const button = screen.getByRole("button");
    expect(layer(button, "rest")).toHaveClass(rest);
    expect(layer(button, "active")).toHaveClass(active);
  });

  it("renders two sparks for the sparkle adornment and a dot for the dot adornment", () => {
    const { container, rerender } = render(
      <MorphButton icon={<Rest />} aria-label="Star" adornment="sparkle" />,
    );
    expect(container.querySelectorAll('[data-slot="morph-button-spark"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="morph-button-dot"]')).toBeNull();

    rerender(<MorphButton icon={<Rest />} aria-label="Star" adornment="dot" />);
    expect(container.querySelector('[data-slot="morph-button-dot"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="morph-button-spark"]')).toBeNull();
  });

  it("is icon-sized without a label and label-sized with one", () => {
    const { rerender } = render(<MorphButton icon={<Rest />} aria-label="Search" />);
    expect(screen.getByRole("button")).toHaveClass("size-9");
    rerender(<MorphButton icon={<Rest />} label="Search" />);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("warns in development when an icon-only button has no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<MorphButton icon={<Rest />} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
  });

  it("does not warn when named", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<MorphButton icon={<Rest />} aria-label="Named" />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<MorphButton icon={<Rest />} label="Wide" className="h-20 bg-card" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-20", "bg-card");
    expect(button).not.toHaveClass("h-9", "bg-secondary");
  });

  it("forwards a ref and arbitrary props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<MorphButton ref={ref} icon={<Rest />} label="Ref" data-testid="morph" />);
    expect(ref.current).toBe(screen.getByTestId("morph"));
  });

  it("passes consumer handlers through", async () => {
    const onClick = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const user = userEvent.setup();
    render(
      <MorphButton
        icon={<Rest />}
        label="Handlers"
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />,
    );
    const button = screen.getByRole("button");
    await user.hover(button);
    await user.click(button);
    await user.unhover(button);
    await user.tab();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
    expect(onPointerEnter).toHaveBeenCalled();
    expect(onPointerLeave).toHaveBeenCalled();
  });

  it("blocks activation when disabled", async () => {
    const user = userEvent.setup();
    render(<MorphButton icon={<Rest />} aria-label="Off" disabled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("has no accessibility violations in any mode", async () => {
    const { container } = render(
      <>
        <MorphButton icon={<Rest />} activeIcon={<Active />} aria-label="Microphone" />
        <MorphButton icon={<Rest />} label="Save" defaultActive fillOnActive adornment="dot" />
        <MorphButton
          trigger="transient"
          icon={<Rest />}
          label="Copy hash"
          activeLabel="Copied"
          adornment="sparkle"
        />
        <MorphButton trigger="hover" icon={<Rest />} label="Share" morph="rise" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
