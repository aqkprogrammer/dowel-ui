import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExpandableCards, type ExpandableCardItem } from "./expandable-cards";

const ITEMS: ExpandableCardItem[] = [
  {
    id: "summer",
    title: "Summer Opening",
    image: "/summer.jpg",
    content: "Join us for the Summer Opening event.",
    author: { name: "Eduardo Calvo", subtitle: "CEO & Founder", image: "/edu.jpg" },
    actions: <button type="button">Play video</button>,
  },
  {
    id: "fashion",
    title: "Fashion",
    image: "/fashion.jpg",
    content: "Explore the latest trends in fashion.",
    author: { name: "Sarah Chen" },
  },
  {
    id: "dreams",
    title: "Dreams",
    image: "/dreams.jpg",
    imageAlt: "A hazy night sky",
    content: "A journey through dreams.",
  },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExpandableCards — inline", () => {
  it("renders each card as a collapsed disclosure button", () => {
    render(<ExpandableCards items={ITEMS} />);
    const summer = screen.getByRole("button", { name: "Summer Opening" });
    expect(summer).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(summer.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
    expect(screen.getByRole("img", { name: "A hazy night sky" })).toBeInTheDocument();
  });

  it("opens the detail, moves focus into it and scrolls the card into view", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} />);
    const summer = screen.getByRole("button", { name: "Summer Opening" });

    await user.click(summer);
    expect(summer).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Summer Opening" });
    expect(region).toHaveFocus();
    expect(region).toHaveTextContent("Join us for the Summer Opening event.");
    expect(region).toHaveTextContent("CEO & Founder");
    expect(screen.getByRole("button", { name: "Play video" })).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth", inline: "center" }),
    );
  });

  it("closes on Escape from inside the detail and returns focus to the card", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} />);
    const summer = screen.getByRole("button", { name: "Summer Opening" });
    await user.click(summer);
    await user.tab();
    expect(screen.getByRole("button", { name: "Play video" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(summer).toHaveAttribute("aria-expanded", "false");
    expect(summer).toHaveFocus();
    // A second Escape has nothing to close.
    await user.keyboard("{Escape}");
    expect(summer).toHaveFocus();
  });

  it("toggles closed from the card, and keeps only one card open", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} />);
    const summer = screen.getByRole("button", { name: "Summer Opening" });
    const fashion = screen.getByRole("button", { name: "Fashion" });
    await user.click(summer);
    await user.click(fashion);
    expect(summer).toHaveAttribute("aria-expanded", "false");
    expect(fashion).toHaveAttribute("aria-expanded", "true");
    await user.click(fashion);
    expect(fashion).toHaveAttribute("aria-expanded", "false");
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("region", { name: "Summer Opening" })).toHaveFocus();
  });

  it("jumps rather than scrolls smoothly under reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} />);
    await user.click(screen.getByRole("button", { name: "Fashion" }));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });

  it("starts open from defaultValue without stealing focus", () => {
    render(<ExpandableCards items={ITEMS} defaultValue="fashion" />);
    expect(screen.getByRole("button", { name: "Fashion" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(document.body).toHaveFocus();
  });

  it("follows a controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <>
          <ExpandableCards items={ITEMS} value={value} onValueChange={setValue} />
          <output>{value ?? "none"}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: /Dreams/ }));
    expect(screen.getByText("dreams")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Dreams/ }));
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("only requests changes when controlled without a handler", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} value={null} />);
    const dreams = screen.getByRole("button", { name: /Dreams/ });
    await user.click(dreams);
    expect(dreams).toHaveAttribute("aria-expanded", "false");
  });

  it("applies cardClassName, lets className win and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ExpandableCards
        items={ITEMS}
        ref={ref}
        className="w-auto"
        cardClassName="rounded-none"
      />,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveClass("w-auto");
    expect(ref.current).not.toHaveClass("w-full");
    const card = container.querySelector('[data-slot="expandable-cards-card"]');
    expect(card).toHaveClass("rounded-none");
    expect(card).not.toHaveClass("rounded-2xl");
  });

  it("has no accessibility violations, open or closed", async () => {
    const { container } = render(<ExpandableCards items={ITEMS} defaultValue="summer" />);
    await expectNoA11yViolations(container);
  });
});

describe("ExpandableCards — dialog", () => {
  // jsdom lays nothing out, and a shared-layout element leaving a zero-sized
  // box never hands back to the card it came from, so it would never finish
  // leaving. Any real size lets the handover complete, as it does in a browser.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 300 }),
    );
  });

  it("opens a modal named by the card, with focus inside", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} presentation="dialog" />);
    const summer = screen.getByRole("button", { name: "Summer Opening" });
    expect(summer).toHaveAttribute("aria-haspopup", "dialog");

    await user.click(summer);
    const dialog = await screen.findByRole("dialog", { name: "Summer Opening" });
    expect(dialog).toHaveAccessibleDescription("Join us for the Summer Opening event.");
    expect(summer).toHaveAttribute("aria-expanded", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByText("Eduardo Calvo")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the card", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} presentation="dialog" />);
    const fashion = screen.getByRole("button", { name: "Fashion" });
    await user.click(fashion);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(fashion).toHaveFocus();
    });
    expect(fashion).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with the Close button", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpandableCards items={ITEMS} presentation="dialog" onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("button", { name: /Dreams/ }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ExpandableCards items={ITEMS} presentation="dialog" />);
    await user.tab();
    await user.keyboard(" ");
    expect(await screen.findByRole("dialog", { name: "Summer Opening" })).toBeInTheDocument();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<ExpandableCards items={ITEMS} presentation="dialog" />);
    await user.click(screen.getByRole("button", { name: "Summer Opening" }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
