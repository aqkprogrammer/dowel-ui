import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bookmark, Folder, House, Search, User } from "lucide-react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DirectionProvider } from "../direction";
import {
  GooTabs,
  GooTabsContent,
  GooTabsList,
  GooTabsTrigger,
  gooTabsStretch,
  gooTabsTimings,
  type GooTabsListProps,
  type GooTabsProps,
} from "./goo-tabs";

const ITEMS = [
  { value: "home", label: "Home", icon: <House /> },
  { value: "search", label: "Search", icon: <Search /> },
  { value: "files", label: "Files", icon: <Folder /> },
  { value: "saved", label: "Saved", icon: <Bookmark /> },
  { value: "you", label: "You", icon: <User /> },
];

/*
 * jsdom does not lay out, so give every tab the source's geometry: 38px slots
 * on a 40px pitch from a 6px inset (x = 6, 46, 86, 126, 166), stacked on Y in
 * a vertical list.
 */
function tabIndex(el: HTMLElement) {
  const tabs = [...(el.parentElement?.querySelectorAll('[role="tab"]') ?? [])];
  return tabs.indexOf(el);
}
function vertical(el: HTMLElement) {
  return el.parentElement?.getAttribute("aria-orientation") === "vertical";
}
const descriptors = {
  offsetParent: {
    get(this: HTMLElement) {
      return this.parentElement;
    },
  },
  offsetLeft: {
    get(this: HTMLElement) {
      return vertical(this) ? 6 : 6 + 40 * tabIndex(this);
    },
  },
  offsetTop: {
    get(this: HTMLElement) {
      return vertical(this) ? 6 + 40 * tabIndex(this) : 6;
    },
  },
  offsetWidth: {
    get() {
      return 38;
    },
  },
  offsetHeight: {
    get() {
      return 38;
    },
  },
};
const originals = Object.fromEntries(
  Object.keys(descriptors).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
  ]),
);

beforeAll(() => {
  for (const [key, descriptor] of Object.entries(descriptors)) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, ...descriptor });
  }
});

afterAll(() => {
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Bar({ list, ...props }: Partial<GooTabsProps> & { list?: Partial<GooTabsListProps> }) {
  return (
    <GooTabs defaultValue="home" {...props}>
      <GooTabsList aria-label="Main" {...list}>
        {ITEMS.map((item) => (
          <GooTabsTrigger key={item.value} value={item.value} aria-label={item.label}>
            {item.icon}
          </GooTabsTrigger>
        ))}
      </GooTabsList>
      {ITEMS.map((item) => (
        <GooTabsContent key={item.value} value={item.value}>
          {item.label} panel
        </GooTabsContent>
      ))}
    </GooTabs>
  );
}

const pill = () => document.querySelector<HTMLElement>('[data-slot="goo-tabs-pill"]');
const indicator = () =>
  document.querySelector<HTMLElement>('[data-slot="goo-tabs-indicator"]')!;

describe("GooTabs", () => {
  it("renders a named tablist of icon tabs with a hidden indicator", () => {
    render(<Bar />);
    const list = screen.getByRole("tablist", { name: "Main" });
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Home" })).toHaveTextContent("Home panel");
    expect(indicator()).toHaveAttribute("aria-hidden", "true");
    expect(list).toHaveStyle({ padding: "6px", borderRadius: "26px" });
    expect(pill()).toHaveStyle({ width: "38px", transform: "translate3d(6px,6px,0)" });
    expect(indicator()).toHaveAttribute("data-phase", "idle");
  });

  it("stretches over the old and new tab, then settles on the new one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<Bar />);
    await user.click(screen.getByRole("tab", { name: "Saved" }));
    expect(screen.getByRole("tab", { name: "Saved" })).toHaveAttribute("aria-selected", "true");

    // Home → Saved keeps the left edge and widens to Saved's end: 6 → 158px.
    expect(indicator()).toHaveAttribute("data-phase", "stretch");
    expect(pill()).toHaveStyle({ width: "158px", transform: "translate3d(6px,6px,0)" });
    expect(pill()?.style.transition).toContain("190ms");

    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(indicator()).toHaveAttribute("data-phase", "settle");
    expect(pill()).toHaveStyle({ width: "38px", transform: "translate3d(126px,6px,0)" });
    expect(pill()?.style.transition).toContain("420ms");
    expect(pill()?.style.transition).toContain("cubic-bezier(.28,1.28,.36,1)");
    expect(pill()?.style.transition).toContain("cubic-bezier(.24,1.34,.38,1)");

    act(() => {
      vi.advanceTimersByTime(420);
    });
    expect(indicator()).toHaveAttribute("data-phase", "idle");
    expect(pill()?.style.transition).toBe("none");
  });

  it("jumps to the target when moving left, and restarts on a quick second change", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<Bar defaultValue="saved" list={{ speed: 100, bounce: 100 }} />);
    await user.click(screen.getByRole("tab", { name: "Search" }));
    // Saved → Search: x jumps to Search (46) and reaches back to Saved's end (164).
    expect(pill()).toHaveStyle({ width: "118px", transform: "translate3d(46px,6px,0)" });
    expect(pill()?.style.transition).toContain("76ms");
    await user.click(screen.getByRole("tab", { name: "You" }));
    expect(indicator()).toHaveAttribute("data-phase", "stretch");
    act(() => {
      vi.advanceTimersByTime(70);
    });
    expect(pill()?.style.transition).toContain("cubic-bezier(.28,1.56,.36,1)");
    expect(pill()?.style.transition).toContain("cubic-bezier(.24,1.68,.38,1)");
  });

  it("roves with arrows, Home and End, with automatic activation", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "Home" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "You" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "You" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Home" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{Home}");
    expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true");
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("mirrors arrows in RTL", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <Bar />
      </DirectionProvider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveFocus();
  });

  it("runs on the Y axis in a vertical bar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<Bar orientation="vertical" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(pill()).toHaveStyle({ height: "78px", width: "38px" });
  });

  it("follows a controlled value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Bar value="home" onValueChange={onValueChange} />);
    act(() => screen.getByRole("tab", { name: "Files" }).focus());
    rerender(<Bar value="files" onValueChange={onValueChange} />);
    expect(screen.getByRole("tab", { name: "Files" })).toHaveAttribute("aria-selected", "true");
  });

  it("skips the stretch under reduced motion", async () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("tab", { name: "Files" }));
    expect(indicator()).toHaveAttribute("data-phase", "idle");
    expect(pill()).toHaveStyle({ transform: "translate3d(86px,6px,0)" });
    expect(indicator()).not.toHaveAttribute("data-goo");
    matchMedia.mockRestore();
  });

  describe("goo", () => {
    const supports = () => vi.stubGlobal("CSS", { supports: () => true });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("filters the indicator layer, never the icons, with a useId-derived id", async () => {
      supports();
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      render(<Bar />);
      expect(indicator()).toHaveAttribute("data-goo");
      const filter = indicator().querySelector("filter")!;
      expect(filter.id).toMatch(/^dowel-goo-tabs-[\w-]+$/);
      const layer = indicator().querySelector<HTMLElement>('[data-slot="goo-tabs-goo"]')!;
      expect(layer.style.filter).toContain(`#${filter.id}`);
      expect(layer.style.transform).toBe("");
      for (const tab of screen.getAllByRole("tab")) expect(tab.style.filter).toBe("");

      await user.click(screen.getByRole("tab", { name: "Files" }));
      const blob = () => document.querySelector<HTMLElement>('[data-slot="goo-tabs-blob"]');
      expect(blob()?.style.transform).toContain("translate3d(6px,6px,0) scale(1)");
      act(() => {
        vi.advanceTimersByTime(160);
      });
      expect(blob()?.style.transform).toContain("scale(0)");
      act(() => {
        vi.advanceTimersByTime(420);
      });
      expect(blob()).toBeNull();
    });

    it("renders the plain pill when goo is off", () => {
      supports();
      render(<Bar list={{ goo: false }} />);
      expect(indicator()).not.toHaveAttribute("data-goo");
      expect(indicator().querySelector("filter")).toBeNull();
    });

    it("renders the plain pill where SVG filters are unsupported", () => {
      vi.stubGlobal("CSS", { supports: () => false });
      render(<Bar />);
      expect(indicator()).not.toHaveAttribute("data-goo");
    });
  });

  it("interpolates the timings and the stretch", () => {
    expect(gooTabsTimings(0)).toEqual({ stretch: 304, settle: 672 });
    expect(gooTabsTimings(100).stretch).toBeCloseTo(76);
    expect(gooTabsTimings(100).settle).toBeCloseTo(168);
    const from = { x: 6, y: 6, w: 38, h: 38 };
    const to = { x: 126, y: 6, w: 38, h: 38 };
    expect(gooTabsStretch(from, to, 0, false)).toEqual(to);
    expect(gooTabsStretch(from, to, 50, false)).toEqual({ x: 66, y: 6, w: 98, h: 38 });
  });

  it("applies tone, stroke, corner and hug", () => {
    render(<Bar list={{ tone: "inverted", stroke: true, corner: 12, hug: 4 }} />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveClass("bg-foreground", "ring-1");
    expect(list).toHaveStyle({ padding: "4px", borderRadius: "12px" });
    expect(pill()).toHaveStyle({ borderRadius: "12px" });
  });

  it("lets consumer classNames win and forwards refs", () => {
    const listRef = createRef<HTMLDivElement>();
    const tabRef = createRef<HTMLButtonElement>();
    render(
      <GooTabs defaultValue="a" className="gap-8">
        <GooTabsList ref={listRef} aria-label="Main" className="gap-4 bg-muted">
          <GooTabsTrigger ref={tabRef} value="a" className="size-12">
            Alpha
          </GooTabsTrigger>
        </GooTabsList>
      </GooTabs>,
    );
    const list = screen.getByRole("tablist");
    expect(listRef.current).toBe(list);
    expect(list).toHaveClass("bg-muted", "gap-4");
    expect(list).not.toHaveClass("bg-card", "gap-0.5");
    expect(tabRef.current).toBe(screen.getByRole("tab", { name: "Alpha" }));
    expect(tabRef.current).toHaveClass("size-12");
    expect(tabRef.current).not.toHaveClass("size-9.5");
    expect(list.parentElement).toHaveClass("gap-8");
  });

  it("warns in development when an icon-only tab is unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <GooTabs defaultValue="a">
        <GooTabsList aria-label="Main">
          <GooTabsTrigger value="a">
            <House />
          </GooTabsTrigger>
        </GooTabsList>
      </GooTabs>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[GooTabsTrigger]"));
  });

  it("has no axe violations", async () => {
    vi.stubGlobal("CSS", { supports: () => true });
    const { container } = render(<Bar />);
    await expectNoA11yViolations(container);
    vi.unstubAllGlobals();
  });
});
