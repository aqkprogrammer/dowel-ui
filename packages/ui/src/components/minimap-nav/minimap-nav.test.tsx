import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  MinimapNav,
  inferMinimapKind,
  minimapNearness,
  type MinimapNavProps,
  type MinimapNavSection,
} from "./minimap-nav";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const SECTIONS: MinimapNavSection[] = [
  { id: "intro", label: "Introduction" },
  { id: "setup", label: "Setup" },
  { id: "usage", label: "Usage" },
  { id: "notes", label: "Notes" },
];

/** A page whose sections take their weight from the headings inside them. */
function Page({
  scroller = false,
  ...props
}: Partial<MinimapNavProps> & { scroller?: boolean }) {
  const content = (
    <>
      <section id="intro">
        <h1>Introduction</h1>
      </section>
      <h2 id="setup">Setup</h2>
      <section id="usage">
        <h3>Usage</h3>
      </section>
      <p id="notes">Notes</p>
    </>
  );
  return (
    <main>
      <MinimapNav sections={SECTIONS} {...props} />
      {scroller ? (
        <div data-testid="scroller" style={{ overflowY: "auto" }}>
          {content}
        </div>
      ) : (
        content
      )}
    </main>
  );
}

function item(name: string) {
  return screen.getByRole("link", { name });
}

function dash(name: string) {
  return item(name).querySelector<HTMLElement>('[data-slot="minimap-nav-dash"]')!;
}

/** The dash's current scaleX, read from the transform motion wrote. */
function scaleOf(element: HTMLElement) {
  const match = /scaleX\(([\d.]+)\)/.exec(element.style.transform);
  return match ? Number(match[1]) : 1;
}

/** Places each section's top edge, in px from the top of the viewport. */
function placeSections(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    vi.spyOn(document.getElementById(id)!, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, top, 600, 200),
    );
  }
}

beforeEach(() => {
  motionPreference.reduced = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("MinimapNav", () => {
  it("renders a named navigation with one in-page link per section", () => {
    render(<Page />);
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#intro",
      "#setup",
      "#usage",
      "#notes",
    ]);
    for (const link of links) {
      expect(link.querySelector('[data-slot="minimap-nav-dash"]')).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("infers weight from the first heading in each target", () => {
    render(<Page />);
    expect(item("Introduction")).toHaveAttribute("data-kind", "title");
    expect(item("Setup")).toHaveAttribute("data-kind", "subtitle");
    expect(item("Usage")).toHaveAttribute("data-kind", "section");
    expect(item("Notes")).toHaveAttribute("data-kind", "body");
    expect(dash("Introduction")).toHaveClass("bg-foreground");
    expect(dash("Notes")).toHaveClass("bg-muted-foreground/50");
  });

  it("prefers an explicit kind, then a level", () => {
    render(
      <MinimapNav
        aria-label="Map"
        sections={[
          { id: "a", label: "A", kind: "body", level: 1 },
          { id: "b", label: "B", level: 1 },
          { id: "c", label: "C", level: 2 },
          { id: "d", label: "D", level: 3 },
          { id: "e", label: "E", level: 5 },
          { id: "missing", label: "Missing" },
        ]}
      />,
    );
    expect(item("A")).toHaveAttribute("data-kind", "body");
    expect(item("B")).toHaveAttribute("data-kind", "title");
    expect(item("C")).toHaveAttribute("data-kind", "subtitle");
    expect(item("D")).toHaveAttribute("data-kind", "section");
    expect(item("E")).toHaveAttribute("data-kind", "body");
    expect(item("Missing")).toHaveAttribute("data-kind", "body");
  });

  it("maps headings to weights", () => {
    const heading = document.createElement("h2");
    expect(inferMinimapKind(heading)).toBe("subtitle");
    expect(inferMinimapKind(document.createElement("div"))).toBe("body");
    expect(inferMinimapKind(null)).toBe("body");
  });

  it("eases nearness from 1 under the pointer to 0 at its reach", () => {
    expect(minimapNearness(0)).toBe(1);
    expect(minimapNearness(-1)).toBeCloseTo(minimapNearness(1));
    expect(minimapNearness(1)).toBeGreaterThan(minimapNearness(2));
    expect(minimapNearness(3.5)).toBe(0);
    expect(minimapNearness(40)).toBe(0);
  });

  it("anchors dashes and labels to the chosen side", () => {
    const { rerender } = render(<Page />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("data-side", "start");
    expect(nav).toHaveClass("[--minimap-nav-origin:left]");
    expect(dash("Setup")).toHaveClass("origin-(--minimap-nav-origin)");
    expect(item("Setup").querySelector('[data-slot="minimap-nav-label"]')).toHaveClass(
      "start-full",
    );

    rerender(<Page side="end" />);
    expect(nav).toHaveAttribute("data-side", "end");
    expect(nav).toHaveClass("[--minimap-nav-origin:right]");
    expect(item("Setup").querySelector('[data-slot="minimap-nav-label"]')).toHaveClass(
      "end-full",
    );
  });

  it("swells the dashes near the pointer and relaxes when it leaves", async () => {
    motionPreference.reduced = true;
    render(<Page />);
    const list = screen.getByRole("list");
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 40, 32));
    // Title at rest: full weight 1, half length.
    await waitFor(() => {
      expect(dash("Introduction").style.transform).toBe("scaleX(0.5)");
    });

    // Over the first row's centre.
    fireEvent.pointerMove(list, { clientY: 104, pointerType: "mouse" });
    await waitFor(() => {
      expect(scaleOf(dash("Introduction"))).toBe(1);
    });
    // One row away the subtitle has grown past its rest length (0.39) but not
    // to its full weight (0.78); three rows away the body barely moves.
    expect(scaleOf(dash("Setup"))).toBeGreaterThan(0.6);
    expect(scaleOf(dash("Setup"))).toBeLessThan(0.78);
    expect(scaleOf(dash("Notes"))).toBeLessThan(0.22);

    fireEvent.pointerLeave(list);
    await waitFor(() => {
      expect(dash("Introduction").style.transform).toBe("scaleX(0.5)");
    });
  });

  it("ignores touch, which has no pointer to be near", async () => {
    motionPreference.reduced = true;
    render(<Page />);
    const list = screen.getByRole("list");
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 40, 32));
    fireEvent.pointerMove(list, { clientY: 104, pointerType: "touch" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(dash("Introduction").style.transform).toBe("scaleX(0.5)");
  });

  it("marks the section at the reading line current, and pulses it while scrolling", async () => {
    render(<Page activeOffset={80} />);
    placeSections({ intro: -400, setup: -20, usage: 300, notes: 900 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() => {
      expect(item("Setup")).toHaveAttribute("aria-current", "location");
    });
    // A resize re-reads without pulsing.
    expect(item("Setup")).toHaveAttribute("data-state", "idle");

    placeSections({ intro: -700, setup: -320, usage: 60, notes: 600 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => {
      expect(item("Usage")).toHaveAttribute("aria-current", "location");
    });
    expect(item("Usage")).toHaveAttribute("data-state", "pulse");
    expect(dash("Usage")).toHaveClass("bg-foreground");
    expect(item("Setup")).not.toHaveAttribute("aria-current");

    await waitFor(
      () => {
        expect(item("Usage")).toHaveAttribute("data-state", "idle");
      },
      { timeout: 1500 },
    );
    expect(item("Usage")).toHaveAttribute("aria-current", "location");
  });

  it("falls back to the first section before any has reached the line", async () => {
    render(<Page />);
    placeSections({ intro: 200, setup: 500, usage: 800, notes: 1100 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() => {
      expect(item("Introduction")).toHaveAttribute("aria-current", "location");
    });
  });

  it("follows the scrolling ancestor that holds the sections", async () => {
    render(<Page scroller />);
    const scroller = screen.getByTestId("scroller");
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 200, 600, 400));
    placeSections({ intro: -100, setup: 150, usage: 230, notes: 700 });

    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    // 230 - 200 = 30px into the container: past the 80px line.
    await waitFor(() => {
      expect(item("Usage")).toHaveAttribute("data-state", "pulse");
    });
  });

  it("scrolls to a section, writes the hash and moves focus there", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    render(<Page />);
    await user.click(item("Usage"));
    const target = document.getElementById("usage")!;
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(target);
    expect(window.location.hash).toBe("#usage");
    expect(target).toHaveAttribute("tabindex", "-1");
    expect(target).toHaveFocus();
    expect(item("Usage")).toHaveAttribute("aria-current", "location");
  });

  it("jumps without smooth scrolling under reduced motion", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    render(<Page />);
    await user.click(item("Setup"));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    // A heading is not focusable on its own, so it gains tabindex -1 too.
    expect(document.getElementById("setup")).toHaveFocus();
  });

  it("leaves modified clicks and missing targets to the browser", () => {
    render(
      <main>
        <Page />
        <MinimapNav aria-label="Other" sections={[{ id: "nowhere", label: "Nowhere" }]} />
      </main>,
    );
    const modified = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    fireEvent(item("Usage"), modified);
    expect(modified.defaultPrevented).toBe(false);

    const missing = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(item("Nowhere"), missing);
    expect(missing.defaultPrevented).toBe(false);
  });

  it("is one Tab stop, moved with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Page />
        <button type="button">After</button>
      </>,
    );
    placeSections({ intro: 0, setup: 500, usage: 900, notes: 1300 });
    await waitFor(() => {
      expect(item("Introduction")).toHaveAttribute("aria-current", "location");
    });
    const links = screen.getAllByRole("link");
    expect(links.filter((link) => link.tabIndex === 0)).toHaveLength(1);

    await user.tab();
    expect(item("Introduction")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Setup")).toHaveFocus();
    expect(item("Setup")).toHaveAttribute("tabindex", "0");
    await user.keyboard("{End}");
    expect(item("Notes")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Notes")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Introduction")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("Introduction")).toHaveFocus();
    await user.keyboard("x");
    expect(item("Introduction")).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    // Leaving resets the stop to the current section.
    expect(item("Setup")).toHaveAttribute("tabindex", "-1");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <MinimapNav
        ref={ref}
        sections={SECTIONS}
        className="w-16"
        data-testid="map"
        aria-label="Map"
      />,
    );
    const nav = screen.getByTestId("map");
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass("w-16");
    expect(nav).not.toHaveClass("w-10");
    expect(nav).toHaveAccessibleName("Map");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Page />);
    await expectNoA11yViolations(container);
  });
});
