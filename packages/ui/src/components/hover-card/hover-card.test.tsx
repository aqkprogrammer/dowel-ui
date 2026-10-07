import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  HoverCard,
  HoverCardArrow,
  HoverCardContent,
  HoverCardTrigger,
  hoverCardVariants,
  type HoverCardContentProps,
} from "./hover-card";

function content() {
  return document.querySelector<HTMLElement>("[data-slot=hover-card-content]");
}

function Example(props: Partial<HoverCardContentProps> & { defaultOpen?: boolean }) {
  const { defaultOpen, ...contentProps } = props;
  return (
    <HoverCard openDelay={0} closeDelay={0} defaultOpen={defaultOpen}>
      <HoverCardTrigger href="https://example.com/ada">@ada</HoverCardTrigger>
      <HoverCardContent {...contentProps}>
        <p>Ada Lovelace</p>
        <p>Wrote the first program.</p>
        <HoverCardArrow />
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  it("opens when the trigger is hovered and closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("link", { name: "@ada" });
    expect(content()).toBeNull();

    await user.hover(trigger);
    await waitFor(() => {
      expect(content()).not.toBeNull();
    });
    expect(content()).toHaveAttribute("data-state", "open");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    await user.unhover(trigger);
    await waitFor(() => {
      expect(content()).toBeNull();
    });
  });

  it("opens on keyboard focus and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("link", { name: "@ada" })).toHaveFocus();
    await waitFor(() => {
      expect(content()).not.toBeNull();
    });
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(content()).toBeNull();
    });
  });

  it("waits before opening by default, so passing over a link does not flash a card", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard>
        <HoverCardTrigger href="#ada">@ada</HoverCardTrigger>
        <HoverCardContent>Card</HoverCardContent>
      </HoverCard>,
    );
    await user.hover(screen.getByRole("link"));
    expect(content()).toBeNull();
    await waitFor(() => {
      expect(content()).not.toBeNull();
    });
  });

  it("staggers its children only when asked", () => {
    const { unmount } = render(<Example defaultOpen />);
    expect(content()).not.toHaveAttribute("data-stagger");
    unmount();
    render(<Example defaultOpen stagger />);
    expect(content()).toHaveAttribute("data-stagger", "");
  });

  it("draws an arrow", () => {
    render(<Example defaultOpen />);
    expect(document.querySelector("[data-slot=hover-card-arrow]")).not.toBeNull();
  });

  it.each([
    ["sm", "w-56"],
    ["md", "w-72"],
    ["lg", "w-80"],
  ] as const)("applies the %s size", (size, width) => {
    render(<Example defaultOpen size={size} />);
    expect(content()).toHaveClass(width);
    expect(hoverCardVariants({ size })).toContain(width);
  });

  it("works as a controlled component", async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Show
          </button>
          <HoverCard
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          >
            <HoverCardTrigger href="#ada">@ada</HoverCardTrigger>
            <HoverCardContent>Card</HoverCardContent>
          </HoverCard>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(content()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(content()).not.toBeNull();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href="#ada">@ada</HoverCardTrigger>
        <HoverCardContent ref={ref} className="w-96 p-8" data-testid="card">
          Card
        </HoverCardContent>
      </HoverCard>,
    );
    const card = screen.getByTestId("card");
    expect(ref.current).toBe(card);
    expect(card).toHaveClass("w-96", "p-8");
    expect(card).not.toHaveClass("w-72", "p-4");
  });

  it("has no accessibility violations while open", async () => {
    const { baseElement } = render(<Example defaultOpen stagger />);
    await expectNoA11yViolations(baseElement);
  });
});
