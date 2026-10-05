import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FileTree, type FileTreeNode } from "./file-tree";

const ITEMS: FileTreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "components",
        name: "components",
        children: [
          { id: "button", name: "button.tsx", status: "modified" },
          { id: "card", name: "card.tsx", status: "added" },
        ],
      },
      { id: "index", name: "index.ts" },
      { id: "legacy", name: "legacy.ts", status: "deleted" },
    ],
  },
  { id: "empty", name: "empty", children: [] },
  { id: "readme", name: "README.md" },
  { id: "package", name: "package.json" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
// jsdom lays nothing out; a shared-layout element needs a real box to finish.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 240, height: 32 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

function item(name: string | RegExp) {
  return screen.getByRole("treeitem", { name });
}

describe("FileTree", () => {
  it("renders a named tree of top-level items with positions", () => {
    render(<FileTree aria-label="Files" items={ITEMS} />);
    const tree = screen.getByRole("tree", { name: "Files" });
    expect(tree).toHaveAttribute("data-slot", "file-tree");
    const src = item("src");
    expect(src).toHaveAttribute("aria-level", "1");
    expect(src).toHaveAttribute("aria-posinset", "1");
    expect(src).toHaveAttribute("aria-setsize", "4");
    expect(src).toHaveAttribute("aria-expanded", "false");
    expect(src).toHaveAttribute("aria-selected", "false");
    expect(item("README.md")).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByRole("group")).toBeNull();
    // Only the first item is in the tab sequence.
    expect(src).toHaveAttribute("tabindex", "0");
    expect(item("README.md")).toHaveAttribute("tabindex", "-1");
  });

  it("opens folders that start expanded without a group per closed folder", () => {
    render(
      <FileTree aria-label="Files" items={ITEMS} defaultExpanded={["src", "components"]} />,
    );
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    const button = item("button.tsx, modified");
    expect(button).toHaveAttribute("aria-level", "3");
    expect(button).toHaveAttribute("aria-posinset", "1");
    expect(button).toHaveAttribute("aria-setsize", "2");
    expect(item("src")).toHaveAttribute("data-state", "open");
  });

  it("names status in words and shows it as a coloured letter", () => {
    render(
      <FileTree aria-label="Files" items={ITEMS} defaultExpanded={["src", "components"]} />,
    );
    const added = item("card.tsx, added");
    const badge = added.querySelector('[data-slot="file-tree-status"]');
    expect(badge).toHaveTextContent("A");
    expect(badge).toHaveClass("text-success");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(item("legacy.ts, deleted").querySelector(".line-through")).not.toBeNull();
    expect(
      item("button.tsx, modified").querySelector('[data-slot="file-tree-status"]'),
    ).toHaveTextContent("M");
  });

  it("takes custom status words", () => {
    render(
      <FileTree
        aria-label="Files"
        items={[{ id: "a", name: "a.ts", status: "added" }]}
        statusLabels={{ added: "nuevo" }}
      />,
    );
    expect(item("a.ts, nuevo")).toBeInTheDocument();
  });

  it("toggles a folder and selects on click", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const onExpandedChange = vi.fn();
    render(
      <FileTree
        aria-label="Files"
        items={ITEMS}
        onSelectedChange={onSelectedChange}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getByText("src"));
    expect(item("src")).toHaveAttribute("aria-expanded", "true");
    expect(item("src")).toHaveAttribute("aria-selected", "true");
    expect(onSelectedChange).toHaveBeenLastCalledWith("src", ITEMS[0]);
    expect(onExpandedChange).toHaveBeenLastCalledWith(["src"]);
    expect(within(item("src")).getByRole("group")).toBeInTheDocument();
    expect(item("src").querySelector('[data-slot="file-tree-guide"]')).not.toBeNull();
    expect(item("src").querySelector('[data-slot="file-tree-selection"]')).not.toBeNull();

    await user.click(screen.getByText("index.ts"));
    expect(item("index.ts")).toHaveAttribute("aria-selected", "true");
    expect(item("src")).toHaveAttribute("aria-selected", "false");
    // The highlight moved: there is only ever one.
    expect(document.querySelectorAll('[data-slot="file-tree-selection"]')).toHaveLength(1);

    await user.click(screen.getByText("src"));
    await waitFor(() => expect(screen.queryByRole("group")).toBeNull());
    expect(onExpandedChange).toHaveBeenLastCalledWith([]);
  });

  it("ignores clicks that are not on a row", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<FileTree aria-label="Files" items={ITEMS} onSelectedChange={onSelectedChange} />);
    await user.click(screen.getByRole("tree"));
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("respects a consumer click handler that prevents default", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <FileTree
        aria-label="Files"
        items={ITEMS}
        onClick={(event) => {
          event.preventDefault();
        }}
        onSelectedChange={onSelectedChange}
      />,
    );
    await user.click(screen.getByText("README.md"));
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("moves with the arrows, opens with Right and steps out with Left", async () => {
    const user = userEvent.setup();
    render(<FileTree aria-label="Files" items={ITEMS} />);
    await user.tab();
    expect(item("src")).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(item("empty")).toHaveFocus();
    expect(item("empty")).toHaveAttribute("tabindex", "0");
    expect(item("src")).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{ArrowUp}");
    expect(item("src")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(item("src")).toHaveAttribute("aria-expanded", "true");
    expect(item("src")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("components")).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(item("button.tsx, modified")).toHaveFocus();
    // Right on a file does nothing.
    await user.keyboard("{ArrowRight}");
    expect(item("button.tsx, modified")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(item("components")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("components")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowLeft}");
    expect(item("src")).toHaveFocus();
    // Left on a closed top-level item stays put.
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(item("src")).toHaveFocus();
    expect(item("src")).toHaveAttribute("aria-expanded", "false");
  });

  it("jumps with Home and End and stops at the ends", async () => {
    const user = userEvent.setup();
    render(<FileTree aria-label="Files" items={ITEMS} />);
    await user.tab();
    await user.keyboard("{End}");
    expect(item("package.json")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("package.json")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("src")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("src")).toHaveFocus();
  });

  it("selects with Enter and Space, toggling folders", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<FileTree aria-label="Files" items={ITEMS} onSelectedChange={onSelectedChange} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(item("src")).toHaveAttribute("aria-expanded", "true");
    expect(item("src")).toHaveAttribute("aria-selected", "true");
    await user.keyboard(" ");
    expect(item("src")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{End} ");
    expect(item("package.json")).toHaveAttribute("aria-selected", "true");
    expect(onSelectedChange).toHaveBeenLastCalledWith("package", ITEMS[3]);
  });

  it("opens every sibling folder with *", async () => {
    const user = userEvent.setup();
    render(<FileTree aria-label="Files" items={ITEMS} />);
    await user.tab();
    await user.keyboard("*");
    expect(item("src")).toHaveAttribute("aria-expanded", "true");
    expect(item("empty")).toHaveAttribute("aria-expanded", "true");
    // Nested: opens components, the only closed folder among its siblings.
    await user.keyboard("{ArrowDown}*");
    expect(item("components")).toHaveAttribute("aria-expanded", "true");
    // Nothing left to open is a no-op.
    await user.keyboard("*");
    expect(item("components")).toHaveAttribute("aria-expanded", "true");
  });

  it("jumps to the next item by its first letter, wrapping", async () => {
    const user = userEvent.setup();
    render(<FileTree aria-label="Files" items={ITEMS} />);
    await user.tab();
    await user.keyboard("p");
    expect(item("package.json")).toHaveFocus();
    await user.keyboard("R");
    expect(item("README.md")).toHaveFocus();
    await user.keyboard("s");
    expect(item("src")).toHaveFocus();
    // No match, and modified keys, leave focus where it is.
    await user.keyboard("z{Control>}e{/Control}");
    expect(item("src")).toHaveFocus();
  });

  it("works controlled", async () => {
    function Controlled() {
      const [expanded, setExpanded] = useState<string[]>([]);
      const [selected, setSelected] = useState<string | null>("readme");
      return (
        <>
          <FileTree
            aria-label="Files"
            items={ITEMS}
            expanded={expanded}
            onExpandedChange={setExpanded}
            selected={selected}
            onSelectedChange={setSelected}
          />
          <output data-testid="state">{`${expanded.join(",")}|${String(selected)}`}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    // The selection is the tab stop when it is visible.
    expect(item("README.md")).toHaveAttribute("tabindex", "0");
    await user.click(screen.getByText("src"));
    expect(screen.getByTestId("state")).toHaveTextContent("src|src");
    expect(item("src")).toHaveAttribute("aria-expanded", "true");
  });

  it("only requests changes when controlled", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const onSelectedChange = vi.fn();
    render(
      <FileTree
        aria-label="Files"
        items={ITEMS}
        expanded={[]}
        selected={null}
        onExpandedChange={onExpandedChange}
        onSelectedChange={onSelectedChange}
      />,
    );
    await user.click(screen.getByText("src"));
    expect(onExpandedChange).toHaveBeenCalledWith(["src"]);
    expect(item("src")).toHaveAttribute("aria-expanded", "false");
    expect(item("src")).toHaveAttribute("aria-selected", "false");
  });

  it("hides guides on request", () => {
    render(
      <FileTree aria-label="Files" items={ITEMS} defaultExpanded={["src"]} guides={false} />,
    );
    expect(document.querySelector('[data-slot="file-tree-guide"]')).toBeNull();
  });

  it("takes a custom icon", () => {
    render(
      <FileTree
        aria-label="Files"
        items={[{ id: "a", name: "a.ts", icon: <svg data-testid="ts" /> }]}
      />,
    );
    expect(screen.getByTestId("ts").closest('[data-slot="file-tree-icon"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("applies each size", () => {
    const { rerender } = render(<FileTree aria-label="Files" items={ITEMS} size="sm" />);
    expect(screen.getByRole("tree")).toHaveClass("text-xs");
    rerender(<FileTree aria-label="Files" items={ITEMS} size="md" />);
    expect(screen.getByRole("tree")).toHaveClass("text-sm");
  });

  it("lets a consumer className win", () => {
    render(<FileTree aria-label="Files" items={ITEMS} className="text-base" />);
    const tree = screen.getByRole("tree");
    expect(tree).toHaveClass("text-base");
    expect(tree).not.toHaveClass("text-sm");
  });

  it("forwards its ref and spreads props", () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <FileTree ref={ref} aria-label="Files" items={ITEMS} data-testid="tree" id="files" />,
    );
    expect(ref.current).toBe(screen.getByTestId("tree"));
    expect(ref.current).toHaveAttribute("id", "files");
  });

  it("lets a consumer key handler take over", async () => {
    const user = userEvent.setup();
    render(
      <FileTree
        aria-label="Files"
        items={ITEMS}
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(item("src")).toHaveFocus();
  });

  it("settles instantly under reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const user = userEvent.setup();
    render(<FileTree aria-label="Files" items={ITEMS} />);
    await user.click(screen.getByText("src"));
    expect(within(item("src")).getByRole("group")).toBeInTheDocument();
    await user.click(screen.getByText("src"));
    await waitFor(() => expect(screen.queryByRole("group")).toBeNull());
  });

  it("has no accessibility violations, open or closed", async () => {
    const { container } = render(
      <FileTree
        aria-label="Files"
        items={ITEMS}
        defaultExpanded={["src", "components"]}
        defaultSelected="card"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
