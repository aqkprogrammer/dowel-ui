import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CodeTabs, type CodeTab } from "./code-tabs";

const TABS: CodeTab[] = [
  { value: "pnpm", label: "pnpm", code: "pnpm add @dowel-ui/react", language: "bash" },
  { value: "npm", label: "npm", code: "npm install @dowel-ui/react", language: "bash" },
  {
    value: "yarn",
    label: "yarn",
    code: "yarn add @dowel-ui/react\nyarn dowel init",
    icon: <svg data-testid="yarn-icon" />,
  },
];

let keyCount = 0;
/** A fresh syncKey per test: the page-wide choice outlives a test's render. */
function freshKey() {
  keyCount += 1;
  return `test-${String(keyCount)}-${String(Date.now())}`;
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
/** jsdom here has no Web Storage; a Map stands in for it. */
function installStorage(storage: Pick<Storage, "getItem" | "setItem" | "clear">) {
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "clear"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    clear: () => {
      values.clear();
    },
  };
}

beforeEach(() => {
  installStorage(memoryStorage());
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 80, height: 28 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

function panelCode() {
  return screen.getByRole("tabpanel").querySelector("code")?.textContent;
}

describe("CodeTabs", () => {
  it("renders a named tablist with the first snippet showing", () => {
    render(<CodeTabs tabs={TABS} />);
    const list = screen.getByRole("tablist", { name: "Code variants" });
    expect(within(list).getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true");
    expect(panelCode()).toBe("pnpm add @dowel-ui/react");
    expect(screen.getByRole("region", { name: "pnpm" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1");
    const indicator = document.querySelector('[data-slot="code-tabs-indicator"]');
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("tab", { name: "pnpm" })).toContainElement(
      indicator as HTMLElement,
    );
    expect(screen.getByTestId("yarn-icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("switches snippets on click, moving the indicator", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<CodeTabs tabs={TABS} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("tab", { name: "yarn" }));
    expect(onValueChange).toHaveBeenCalledWith("yarn");
    await waitFor(() => expect(screen.getAllByRole("tabpanel")).toHaveLength(1));
    expect(panelCode()).toBe("yarn add @dowel-ui/react\nyarn dowel init");
    expect(document.querySelectorAll('[data-slot="code-tabs-indicator"]')).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "yarn" })).toContainElement(
      document.querySelector<HTMLElement>('[data-slot="code-tabs-indicator"]'),
    );
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<CodeTabs tabs={TABS} />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "npm" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "npm" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "yarn" })).toHaveAttribute("aria-selected", "true");
  });

  it("copies the snippet on screen", async () => {
    const user = userEvent.setup();
    render(<CodeTabs tabs={TABS} defaultValue="npm" />);
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(await navigator.clipboard.readText()).toBe("npm install @dowel-ui/react");
    await user.click(screen.getByRole("tab", { name: "pnpm" }));
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(await navigator.clipboard.readText()).toBe("pnpm add @dowel-ui/react");
  });

  it("hides the copy button and renames things on request", () => {
    render(
      <CodeTabs tabs={TABS} hideCopy listLabel="Package manager" copyLabel="Copy command" />,
    );
    expect(screen.getByRole("tablist", { name: "Package manager" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy command" })).toBeNull();
  });

  it("starts on defaultValue, and ignores one it does not offer", () => {
    const { unmount } = render(<CodeTabs tabs={TABS} defaultValue="npm" />);
    expect(screen.getByRole("tab", { name: "npm" })).toHaveAttribute("aria-selected", "true");
    unmount();
    render(<CodeTabs tabs={TABS} defaultValue="deno" />);
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true");
  });

  it("works controlled", async () => {
    function Controlled() {
      const [value, setValue] = useState("npm");
      return (
        <>
          <CodeTabs tabs={TABS} value={value} onValueChange={setValue} />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("tab", { name: "yarn" }));
    expect(screen.getByTestId("value")).toHaveTextContent("yarn");
    expect(screen.getByRole("tab", { name: "yarn" })).toHaveAttribute("aria-selected", "true");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<CodeTabs tabs={TABS} value="npm" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("tab", { name: "yarn" }));
    expect(onValueChange).toHaveBeenCalledWith("yarn");
    expect(screen.getByRole("tab", { name: "npm" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches every instance with the same syncKey, and remembers", async () => {
    const user = userEvent.setup();
    const key = freshKey();
    render(
      <>
        <CodeTabs data-testid="a" tabs={TABS} syncKey={key} />
        <CodeTabs data-testid="b" tabs={TABS} syncKey={key} />
        <CodeTabs data-testid="c" tabs={TABS} />
      </>,
    );
    const a = screen.getByTestId("a");
    const b = screen.getByTestId("b");
    const c = screen.getByTestId("c");
    await user.click(within(a).getByRole("tab", { name: "yarn" }));
    expect(within(b).getByRole("tab", { name: "yarn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // An unsynced instance stays put.
    expect(within(c).getByRole("tab", { name: "pnpm" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.localStorage.getItem(`dowel-code-tabs:${key}`)).toBe("yarn");
  });

  it("starts from a remembered choice", () => {
    const key = freshKey();
    window.localStorage.setItem(`dowel-code-tabs:${key}`, "npm");
    render(<CodeTabs tabs={TABS} syncKey={key} />);
    expect(screen.getByRole("tab", { name: "npm" })).toHaveAttribute("aria-selected", "true");
  });

  it("ignores a remembered choice it does not offer", () => {
    const key = freshKey();
    window.localStorage.setItem(`dowel-code-tabs:${key}`, "deno");
    render(<CodeTabs tabs={TABS} syncKey={key} defaultValue="yarn" />);
    expect(screen.getByRole("tab", { name: "yarn" })).toHaveAttribute("aria-selected", "true");
  });

  it("follows a choice made in another browser tab", () => {
    const key = freshKey();
    render(<CodeTabs tabs={TABS} syncKey={key} />);
    act(() => {
      fireEvent(
        window,
        new StorageEvent("storage", { key: `dowel-code-tabs:${key}`, newValue: "yarn" }),
      );
    });
    expect(screen.getByRole("tab", { name: "yarn" })).toHaveAttribute("aria-selected", "true");
    // Unrelated keys and removals are ignored.
    act(() => {
      fireEvent(window, new StorageEvent("storage", { key: "other", newValue: "npm" }));
      fireEvent(
        window,
        new StorageEvent("storage", { key: `dowel-code-tabs:${key}`, newValue: null }),
      );
    });
    expect(screen.getByRole("tab", { name: "yarn" })).toHaveAttribute("aria-selected", "true");
  });

  it("still syncs on the page when storage throws", async () => {
    installStorage({
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      clear: () => {},
    });
    const user = userEvent.setup();
    const key = freshKey();
    render(
      <>
        <CodeTabs data-testid="a" tabs={TABS} syncKey={key} />
        <CodeTabs data-testid="b" tabs={TABS} syncKey={key} />
      </>,
    );
    await user.click(within(screen.getByTestId("a")).getByRole("tab", { name: "npm" }));
    expect(within(screen.getByTestId("b")).getByRole("tab", { name: "npm" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("applies each indicator", () => {
    const { rerender } = render(<CodeTabs tabs={TABS} indicator="pill" />);
    expect(document.querySelector('[data-slot="code-tabs-indicator"]')).toHaveClass("inset-0");
    expect(screen.getByRole("tablist")).toHaveClass("bg-muted");
    rerender(<CodeTabs tabs={TABS} indicator="underline" />);
    expect(document.querySelector('[data-slot="code-tabs-indicator"]')).toHaveClass("h-0.5");
    expect(screen.getByRole("tablist")).toHaveClass("bg-transparent");
    expect(screen.getByRole("tablist").parentElement?.parentElement).toHaveAttribute(
      "data-indicator",
      "underline",
    );
  });

  it("renders nothing in the panel with no tabs", () => {
    render(<CodeTabs tabs={[]} />);
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });

  it("lets a consumer className win", () => {
    render(<CodeTabs tabs={TABS} data-testid="root" className="rounded-none" />);
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("rounded-none");
    expect(root).not.toHaveClass("rounded-xl");
    expect(root).toHaveAttribute("data-slot", "code-tabs");
  });

  it("forwards its ref and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CodeTabs ref={ref} tabs={TABS} id="install" aria-label="Install" />);
    expect(ref.current).toHaveAttribute("id", "install");
    expect(ref.current).toHaveAttribute("data-slot", "code-tabs");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<CodeTabs tabs={TABS} />);
    await expectNoA11yViolations(container);
  });
});
