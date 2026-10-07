import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ShareButton, type ShareTarget } from "./share-button";

const TARGETS: ShareTarget[] = [
  { label: "Share on X", icon: <svg />, href: "https://x.example/share" },
  { label: "Share on LinkedIn", icon: <svg />, href: "https://linkedin.example/share" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
// jsdom lays nothing out; layout animations need a real box to finish.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 120, height: 40 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "share");
});

function trigger() {
  return screen.getByRole("button", { name: "Share" });
}

function group() {
  return screen.getByRole("group", { name: "Share to" });
}

describe("ShareButton", () => {
  it("renders a collapsed trigger and an empty labelled group", () => {
    render(<ShareButton targets={TARGETS} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");
    expect(within(group()).queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Share")).toHaveAttribute("aria-hidden", "true");
  });

  it("opens on press into named links, and closes on the next press", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ShareButton targets={TARGETS} openOn="click" onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", group().id);
    const link = within(group()).getByRole("link", { name: "Share on X" });
    expect(link).toHaveAttribute("href", "https://x.example/share");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    // Pressed open, the trigger's icon has become a close glyph.
    const close = trigger().querySelector('[data-slot="share-button-close-icon"]');
    expect(close).toHaveClass("opacity-100");

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => {
      expect(within(group()).queryAllByRole("link")).toHaveLength(0);
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("previews on hover and closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<ShareButton targets={TARGETS} />);
    await user.hover(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    // A preview keeps the share glyph: pressing it keeps the tray, not closes it.
    expect(trigger().querySelector('[data-slot="share-button-icon"]')).toHaveClass(
      "opacity-100",
    );
    await user.unhover(trigger());
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("keeps the tray when the pointer comes back within the grace period", () => {
    vi.useFakeTimers();
    render(<ShareButton targets={TARGETS} />);
    const root = trigger().closest('[data-slot="share-button"]') as HTMLElement;
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("pins a preview when pressed, so leaving does not close it", async () => {
    const user = userEvent.setup();
    render(<ShareButton targets={TARGETS} />);
    await user.hover(trigger());
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await user.unhover(trigger());
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores hover with openOn click, and touch never previews", () => {
    const { rerender } = render(<ShareButton targets={TARGETS} openOn="click" />);
    const root = trigger().closest('[data-slot="share-button"]') as HTMLElement;
    fireEvent.pointerEnter(root, { pointerType: "mouse" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    rerender(<ShareButton targets={TARGETS} />);
    fireEvent.pointerEnter(root, { pointerType: "touch" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes a pinned tray on a press outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ShareButton targets={TARGETS} openOn="click" />
        <p>Elsewhere</p>
      </div>,
    );
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(within(group()).getByRole("link", { name: "Share on X" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("works fully by keyboard: focus previews, arrows move, Escape returns focus", async () => {
    const user = userEvent.setup();
    render(<ShareButton targets={TARGETS} />);
    await user.tab();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("link", { name: "Share on X" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("link", { name: "Share on LinkedIn" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(trigger()).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("link", { name: "Share on LinkedIn" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens with Enter and leaves other keys alone", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<ShareButton targets={TARGETS} openOn="click" onKeyDown={onKeyDown} />);
    await user.tab();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("closes when focus leaves", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ShareButton targets={TARGETS} />
        <button type="button">Next</button>
      </div>,
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Share on X" })).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onSelect, collapses and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ShareButton openOn="click" targets={[{ label: "Email", icon: <svg />, onSelect }]} />,
    );
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Email" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("stays open when onSelect prevents default, and links can open in place", async () => {
    const user = userEvent.setup();
    render(
      <ShareButton
        openOn="click"
        targets={[
          {
            label: "Embed",
            icon: <svg />,
            onSelect: (event) => {
              event.preventDefault();
            },
          },
          { label: "Permalink", icon: <svg />, href: "#post", newTab: false },
        ]}
      />,
    );
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Embed" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const link = screen.getByRole("link", { name: "Permalink" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
    await user.click(link);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("copies the link, morphs to a check and announces it", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<ShareButton openOn="click" url="https://dowel.dev/post" onCopy={onCopy} />);
    await user.click(trigger());
    const copy = screen.getByRole("button", { name: "Copy link" });
    expect(copy).toHaveAttribute("data-copied", "false");
    await user.click(copy);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    });
    expect(await navigator.clipboard.readText()).toBe("https://dowel.dev/post");
    expect(onCopy).toHaveBeenCalledWith("https://dowel.dev/post");
    expect(copy).toHaveAttribute("data-copied", "true");
    expect(copy.querySelector('[data-slot="share-button-copied-icon"]')).toHaveClass(
      "opacity-100",
    );
    // Copying keeps the tray open, so the check can be seen.
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("reverts the check after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<ShareButton openOn="click" defaultOpen url="https://dowel.dev/post" />);
    const copy = screen.getByRole("button", { name: "Copy link" });
    await user.click(copy);
    await waitFor(() => {
      expect(copy).toHaveAttribute("data-copied", "true");
    });
    await user.click(copy);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(copy).toHaveAttribute("data-copied", "false");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("never shows the check when the clipboard refuses or is missing", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<ShareButton openOn="click" defaultOpen url="https://dowel.dev/post" />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    await Promise.resolve();
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveAttribute(
      "data-copied",
      "false",
    );

    const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(screen.getByRole("status")).toHaveTextContent("");
    if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard);
  });

  it("hands off to the native share sheet where there is one", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(
      <ShareButton
        native
        url="https://dowel.dev"
        shareTitle="Dowel"
        shareText="Look"
        targets={TARGETS}
      />,
    );
    expect(trigger()).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByRole("group")).toBeNull();
    await user.hover(trigger());
    await user.click(trigger());
    expect(share).toHaveBeenCalledWith({
      url: "https://dowel.dev",
      title: "Dowel",
      text: "Look",
    });
  });

  it("treats a dismissed sheet as nothing, and falls back to the tray on failure", async () => {
    const user = userEvent.setup();
    const abort = new Error("dismissed");
    abort.name = "AbortError";
    const share = vi.fn().mockRejectedValueOnce(abort).mockRejectedValueOnce(new Error("nope"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareButton native url="https://dowel.dev" targets={TARGETS} />);
    await user.click(trigger());
    await Promise.resolve();
    expect(screen.queryByRole("group")).toBeNull();
    await user.click(trigger());
    await waitFor(() => {
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });
    expect(within(group()).getAllByRole("link")).toHaveLength(2);
  });

  it("ignores native without browser support", () => {
    render(<ShareButton native targets={TARGETS} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("supports a controlled open state", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <ShareButton targets={TARGETS} open={open} onOpenChange={setOpen} openOn="click" />
          <span data-testid="state">{String(open)}</span>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger());
    expect(screen.getByTestId("state")).toHaveTextContent("false");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ShareButton targets={TARGETS} open={false} onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("takes its own words and icon", async () => {
    const user = userEvent.setup();
    render(
      <ShareButton
        label="Send"
        groupLabel="Send via"
        copyLabel="Copy URL"
        copiedLabel="URL copied"
        url="https://dowel.dev"
        icon={<svg data-testid="icon" />}
        openOn="click"
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(
      within(screen.getByRole("group", { name: "Send via" })).getByRole("button", {
        name: "Copy URL",
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ["solid", "bg-primary"],
    ["outline", "border-border"],
    ["soft", "text-primary"],
  ] as const)("applies the %s variant", (variant, className) => {
    render(<ShareButton variant={variant} data-testid="root" />);
    expect(screen.getByTestId("root")).toHaveClass(className);
  });

  it.each([
    ["sm", "h-8", "size-6"],
    ["md", "h-10", "size-8"],
    ["lg", "h-12", "size-10"],
  ] as const)("applies the %s size", (size, height, control) => {
    render(<ShareButton size={size} defaultOpen openOn="click" url="x" data-testid="root" />);
    expect(screen.getByTestId("root")).toHaveClass(height);
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveClass(control);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const onPointerDown = vi.fn();
    render(
      <ShareButton
        ref={ref}
        className="p-2"
        data-testid="root"
        id="share"
        onPointerDown={onPointerDown}
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("p-2");
    expect(root).not.toHaveClass("p-1");
    expect(root).toHaveAttribute("id", "share");
    expect(root).toHaveAttribute("data-slot", "share-button");
    fireEvent.pointerDown(root);
    expect(onPointerDown).toHaveBeenCalled();
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ShareButton targets={TARGETS} url="https://dowel.dev" openOn="click" />,
    );
    await expectNoA11yViolations(container);
    await user.click(trigger());
    await expectNoA11yViolations(container);
  });
});
