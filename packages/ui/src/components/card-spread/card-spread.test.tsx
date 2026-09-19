import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CardSpread, CardSpreadItem, type CardSpreadProps } from "./card-spread";
import { getCardSpreadPose } from "./card-spread-layouts";

function Deck({ count = 5, ...props }: Partial<CardSpreadProps> & { count?: number }) {
  return (
    <CardSpread aria-label="Photo stack" {...props}>
      {Array.from({ length: count }, (_, i) => (
        <CardSpreadItem key={i}>Card {i + 1}</CardSpreadItem>
      ))}
    </CardSpread>
  );
}

function LinkDeck(props: Partial<CardSpreadProps>) {
  return (
    <CardSpread aria-label="Destinations" {...props}>
      {["Beach", "Hills", "Forest"].map((name) => (
        <CardSpreadItem key={name} asChild>
          <a href={`#${name.toLowerCase()}`}>{name}</a>
        </CardSpreadItem>
      ))}
    </CardSpread>
  );
}

const deck = () => screen.getByRole("group");
const toggle = () => screen.getByRole("button", { name: "Spread cards" });
const items = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-slot="card-spread-item"]'));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CardSpread", () => {
  it("renders a named group of cards, closed and stacked", () => {
    render(<Deck />);
    const root = screen.getByRole("group", { name: "Photo stack" });
    expect(root).toHaveAttribute("data-state", "closed");
    expect(root).toHaveAttribute("data-layout", "arc");
    expect(items(root)).toHaveLength(5);
    for (const item of items(root)) {
      expect(item).toHaveAttribute("data-state", "closed");
      expect(item.style.transform).toContain("rotate(calc(0deg");
    }
    expect(screen.getByText("Card 3")).toBeVisible();
  });

  it("positions each card from its index with the layout's pose", () => {
    render(<Deck layout="wheel" defaultOpen />);
    const cards = items(deck());
    cards.forEach((card, i) => {
      const pose = getCardSpreadPose("wheel", i, 5, true);
      expect(card).toHaveAttribute("data-index", String(i));
      expect(card.style.transform).toContain(`rotate(calc(${String(pose.rotate)}deg`);
      expect(card.style.zIndex).toBe(String(pose.z));
      expect(card.style.transformOrigin).toContain("110%");
    });
  });

  it("mirrors horizontal travel and rotation through the direction flip", () => {
    render(<Deck layout="corner" defaultOpen />);
    const first = items(deck())[0] as HTMLElement;
    expect(first.style.transform).toContain("var(--card-spread-flip, 1)");
    expect(first.style.transformOrigin).toContain("-50% * var(--card-spread-flip, 1)");
  });

  it("opens on mouse hover and closes when the pointer leaves", () => {
    render(<Deck />);
    fireEvent.pointerEnter(deck(), { pointerType: "mouse" });
    expect(deck()).toHaveAttribute("data-state", "open");
    fireEvent.pointerLeave(deck(), { pointerType: "mouse" });
    expect(deck()).toHaveAttribute("data-state", "closed");
  });

  it("treats a tap as a press of the toggle, not as a hover", () => {
    render(<Deck />);
    fireEvent.pointerEnter(deck(), { pointerType: "touch" });
    expect(deck()).toHaveAttribute("data-state", "closed");
    fireEvent.click(toggle());
    expect(deck()).toHaveAttribute("data-state", "open");
    expect(deck()).toHaveAttribute("data-pinned");
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("stays open after a click until clicked again", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Deck onOpenChange={onOpenChange} />);

    await user.click(toggle());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(deck());
    expect(deck()).toHaveAttribute("data-state", "open");

    // Pointer focus does not hold it open: the second click really closes it.
    await user.click(toggle());
    await user.unhover(deck());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(deck()).toHaveAttribute("data-state", "closed");
  });

  describe("keyboard", () => {
    it("gives a deck of plain cards a toggle, and opens while it has focus", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Deck />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(toggle()).toHaveFocus();
      expect(toggle()).toHaveAttribute("aria-pressed", "false");
      expect(deck()).toHaveAttribute("data-state", "open");
      await user.tab();
      expect(deck()).toHaveAttribute("data-state", "closed");
    });

    it("pins with Enter and Space, and Escape closes it", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <>
          <Deck onOpenChange={onOpenChange} />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.keyboard("{Enter}");
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      await user.tab();
      expect(deck()).toHaveAttribute("data-state", "open");

      await user.tab({ shift: true });
      await user.keyboard(" ");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      await user.keyboard(" ");
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(deck()).toHaveAttribute("data-state", "closed");
      expect(toggle()).toHaveFocus();
    });

    it("Escape closes a spread opened only by focus", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Deck onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard("{Escape}");
      expect(deck()).toHaveAttribute("data-state", "closed");
      expect(onOpenChange).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      await user.keyboard("a");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("reaches a deck of links through the links, opening on focus within", async () => {
      const user = userEvent.setup();
      render(<LinkDeck />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      await user.tab();
      const beach = screen.getByRole("link", { name: "Beach" });
      expect(beach).toHaveFocus();
      expect(beach).toHaveAttribute("data-slot", "card-spread-card");
      expect(deck()).toHaveAttribute("data-state", "open");

      await user.tab();
      expect(screen.getByRole("link", { name: "Hills" })).toHaveFocus();
      expect(deck()).toHaveAttribute("data-state", "open");
    });

    it("names the toggle with toggleLabel", () => {
      render(<Deck toggleLabel="Fan out photos" />);
      expect(screen.getByRole("button", { name: "Fan out photos" })).toBeInTheDocument();
    });
  });

  describe("state", () => {
    it("starts pinned from defaultOpen", () => {
      render(<Deck defaultOpen />);
      expect(deck()).toHaveAttribute("data-state", "open");
      expect(deck()).toHaveAttribute("data-pinned");
      expect(toggle()).toHaveAttribute("aria-pressed", "true");
    });

    it("follows the controlled prop and only requests changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <Deck open={false} onOpenChange={onOpenChange} trigger="click" />,
      );
      await user.click(toggle());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(deck()).toHaveAttribute("data-state", "closed");

      rerender(<Deck open onOpenChange={onOpenChange} trigger="click" />);
      expect(deck()).toHaveAttribute("data-state", "open");
    });

    it("works as a fully controlled pair", async () => {
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Deck open={open} onOpenChange={setOpen} />
            <output>{open ? "open" : "closed"}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(toggle());
      expect(screen.getByRole("status")).toHaveTextContent("open");
    });

    it("click trigger ignores hover and focus", async () => {
      const user = userEvent.setup();
      render(<Deck trigger="click" />);
      await user.hover(deck());
      expect(deck()).toHaveAttribute("data-state", "closed");
      await user.tab();
      expect(deck()).toHaveAttribute("data-state", "closed");
      await user.keyboard("{Enter}");
      expect(deck()).toHaveAttribute("data-state", "open");
    });

    it("manual trigger only follows the open prop, with no toggle", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Deck trigger="manual" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      await user.hover(deck());
      expect(deck()).toHaveAttribute("data-state", "closed");

      rerender(<Deck trigger="manual" open />);
      expect(deck()).toHaveAttribute("data-state", "open");
    });

    it("calls the consumer's own handlers", () => {
      const handlers = {
        onPointerEnter: vi.fn(),
        onPointerLeave: vi.fn(),
        onPointerDown: vi.fn(),
        onFocus: vi.fn(),
        onBlur: vi.fn(),
        onClick: vi.fn(),
      };
      render(<Deck {...handlers} />);
      fireEvent.pointerEnter(deck());
      fireEvent.pointerDown(deck());
      fireEvent.focus(deck());
      fireEvent.blur(deck());
      fireEvent.pointerLeave(deck());
      fireEvent.click(deck());
      for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("motion", () => {
    it("staggers cards by index when opening and in reverse when closing", () => {
      const { rerender } = render(<Deck open trigger="manual" stagger={40} />);
      const delays = () => items(deck()).map((item) => item.style.transitionDelay);
      expect(delays()[0]).toBe("calc(0ms * var(--motion-scale, 1))");
      expect(delays()[4]).toBe("calc(160ms * var(--motion-scale, 1))");

      rerender(<Deck open={false} trigger="manual" stagger={40} />);
      expect(delays()[0]).toBe("calc(160ms * var(--motion-scale, 1))");
      expect(delays()[4]).toBe("calc(0ms * var(--motion-scale, 1))");
    });

    it("eases through the motion tokens so reduced motion applies the layout instantly", () => {
      render(<Deck defaultOpen />);
      const item = items(deck())[0] as HTMLElement;
      expect(item).toHaveClass(
        "duration-[var(--duration-slower)]",
        "ease-[var(--ease-overshoot)]",
      );
      expect(item).not.toHaveAttribute("data-motion");
      expect(item.style.transitionDelay).toContain("var(--motion-scale");
      // The open pose is applied regardless: reduced motion changes timing, not layout.
      expect(item.style.transform).toContain("rotate(calc(-30deg");
    });

    it("ships its direction flip in a hoisted stylesheet", () => {
      render(<Deck />);
      const sheet = document.querySelector('style[data-href="dowel-card-spread"]');
      expect(sheet?.textContent).toContain("--card-spread-flip:-1");
    });
  });

  describe("stamp", () => {
    it("perforates the cards with a mask by default in the stamp layout", () => {
      render(<Deck layout="stamp" />);
      const card = screen.getByText("Card 1");
      expect(card).toHaveAttribute("data-edge", "stamp");
      expect(card.getAttribute("style")).toContain("radial-gradient");
      expect(card.parentElement).toHaveClass("drop-shadow-md");
    });

    it("lets an item or the deck choose its edge", () => {
      render(
        <CardSpread aria-label="Mixed" layout="stamp" edge="rounded">
          <CardSpreadItem>Plain</CardSpreadItem>
          <CardSpreadItem edge="stamp" style={{ opacity: 0.5 }}>
            Stamp
          </CardSpreadItem>
        </CardSpread>,
      );
      expect(screen.getByText("Plain")).toHaveAttribute("data-edge", "rounded");
      expect(screen.getByText("Stamp")).toHaveAttribute("data-edge", "stamp");
      expect(screen.getByText("Stamp").style.opacity).toBe("0.5");
    });

    it("passes arc, gap and offset through to the layout", () => {
      render(<Deck layout="stamp" defaultOpen arc={40} gap={10} offset={0} />);
      const last = items(deck())[4] as HTMLElement;
      expect(last.style.transform).toContain("rotate(calc(80deg");
      expect(last.style.transform).toContain("translate(calc(20%");
    });
  });

  describe("API", () => {
    it("applies size variants and lets a consumer className win", () => {
      const { rerender } = render(<Deck size="lg" />);
      expect(deck()).toHaveClass("w-40", "h-56");
      rerender(<Deck size="sm" className="w-48" />);
      expect(deck()).toHaveClass("w-48", "h-32");
      expect(deck()).not.toHaveClass("w-24");
    });

    it("lets a card's className win over its surface", () => {
      render(
        <CardSpread aria-label="Tinted">
          <CardSpreadItem className="rounded-none bg-primary">Tinted</CardSpreadItem>
        </CardSpread>,
      );
      const card = screen.getByText("Tinted");
      expect(card).toHaveClass("bg-primary", "rounded-none");
      expect(card).not.toHaveClass("bg-muted", "rounded-2xl");
    });

    it("forwards refs and native props", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Deck ref={ref} id="deck" data-testid="deck" />);
      expect(ref.current).toBe(deck());
      expect(deck()).toHaveAttribute("id", "deck");
    });

    it("supports callback refs", () => {
      const ref = vi.fn();
      render(<Deck ref={ref} />);
      expect(ref).toHaveBeenCalledWith(deck());
    });

    it("ignores children that are not elements", () => {
      render(
        <CardSpread aria-label="Sparse">
          {null}
          text
          <CardSpreadItem>Only</CardSpreadItem>
        </CardSpread>,
      );
      expect(items(deck())).toHaveLength(1);
      expect(items(deck())[0]?.style.transform).toContain("translate(calc(0%");
    });

    it("throws when an item is rendered outside a deck", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<CardSpreadItem>Loose</CardSpreadItem>)).toThrow(
        /inside <CardSpread>/,
      );
    });
  });

  describe("accessibility", () => {
    it("has no axe violations closed or open", async () => {
      const { container, rerender } = render(<Deck />);
      await expectNoA11yViolations(container);
      rerender(<Deck defaultOpen layout="stamp" />);
      await expectNoA11yViolations(container);
    });

    it("has no axe violations as a deck of links", async () => {
      const { container } = render(<LinkDeck defaultOpen />);
      await expectNoA11yViolations(container);
    });
  });

  describe("children", () => {
    it("opens fragments up, so every card still gets its own index", () => {
      const { container } = render(
        <CardSpread aria-label="Deck" defaultOpen>
          <>
            <CardSpreadItem>1</CardSpreadItem>
            <CardSpreadItem>2</CardSpreadItem>
          </>
          <CardSpreadItem>3</CardSpreadItem>
        </CardSpread>,
      );
      const indexes = [...container.querySelectorAll("[data-slot=card-spread-item]")].map(
        (item) => item.getAttribute("data-index"),
      );
      expect(indexes).toEqual(["0", "1", "2"]);
    });

    it("warns in development when a wrapper component stands in for the cards", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      function Wrapper() {
        return (
          <>
            <CardSpreadItem>1</CardSpreadItem>
            <CardSpreadItem>2</CardSpreadItem>
          </>
        );
      }
      render(
        <CardSpread aria-label="Deck">
          <Wrapper />
        </CardSpread>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("<CardSpreadItem>"));
      warn.mockRestore();
    });
  });
});
