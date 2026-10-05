import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PinList, type PinListItem } from "./pin-list";

const ITEMS: PinListItem[] = [
  {
    id: "inbox",
    title: "Inbox",
    description: "12 unread",
    icon: <svg data-testid="inbox-icon" />,
  },
  { id: "drafts", title: "Drafts", description: "3 drafts" },
  { id: "sent", title: "Sent" },
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
    DOMRect.fromRect({ x: 0, y: 0, width: 320, height: 56 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

function list(name: string) {
  return screen.getByRole("list", { name });
}

function pin(title: string) {
  return screen.getByRole("button", { name: `Pin ${title}` });
}

describe("PinList", () => {
  it("renders the unpinned rows in a named list, and no empty pinned section", () => {
    render(<PinList items={ITEMS} />);
    expect(screen.queryByRole("list", { name: "Pinned" })).toBeNull();
    const all = list("All");
    expect(within(all).getAllByRole("listitem")).toHaveLength(3);
    expect(pin("Inbox")).toHaveAttribute("aria-pressed", "false");
    expect(pin("Inbox")).toHaveAttribute("data-state", "off");
    expect(screen.getByText("12 unread")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("starts with defaultPinned rows in the pinned list", () => {
    render(<PinList items={ITEMS} defaultPinned={["sent"]} />);
    expect(within(list("Pinned")).getByText("Sent")).toBeInTheDocument();
    expect(within(list("All")).getAllByRole("listitem")).toHaveLength(2);
    expect(pin("Sent")).toHaveAttribute("aria-pressed", "true");
  });

  it("moves a row across, keeps focus on its pin and announces it", async () => {
    const user = userEvent.setup();
    const onPinnedChange = vi.fn();
    render(<PinList items={ITEMS} onPinnedChange={onPinnedChange} />);

    await user.click(pin("Drafts"));
    expect(onPinnedChange).toHaveBeenLastCalledWith(["drafts"]);
    expect(within(list("Pinned")).getByText("Drafts")).toBeInTheDocument();
    expect(pin("Drafts")).toHaveAttribute("aria-pressed", "true");
    expect(pin("Drafts")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Pinned Drafts");

    await user.click(pin("Drafts"));
    expect(onPinnedChange).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(screen.queryByRole("list", { name: "Pinned" })).toBeNull());
    expect(pin("Drafts")).toHaveAttribute("aria-pressed", "false");
    expect(pin("Drafts")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Unpinned Drafts");
  });

  it("collapses the rest when everything is pinned", async () => {
    const user = userEvent.setup();
    render(<PinList items={ITEMS} defaultPinned={["inbox", "drafts"]} />);
    await user.click(pin("Sent"));
    await waitFor(() => expect(screen.queryByRole("list", { name: "All" })).toBeNull());
    // Pinned rows keep the items' order, not the order they were pinned in.
    expect(
      within(list("Pinned"))
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["Inbox12 unread", "Drafts3 drafts", "Sent"]);
  });

  it("toggles from the keyboard and undoes with a second press", async () => {
    const user = userEvent.setup();
    render(<PinList items={ITEMS} />);
    await user.tab();
    expect(pin("Inbox")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(pin("Inbox")).toHaveAttribute("aria-pressed", "true");
    expect(pin("Inbox")).toHaveFocus();
    await user.keyboard(" ");
    expect(pin("Inbox")).toHaveAttribute("aria-pressed", "false");
    expect(pin("Inbox")).toHaveFocus();
  });

  it("works controlled", async () => {
    function Controlled() {
      const [pinned, setPinned] = useState<string[]>(["inbox"]);
      return (
        <>
          <PinList items={ITEMS} pinned={pinned} onPinnedChange={setPinned} />
          <output data-testid="pinned">{pinned.join(",")}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(pin("Sent"));
    expect(screen.getByTestId("pinned")).toHaveTextContent("inbox,sent");
    expect(within(list("Pinned")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onPinnedChange = vi.fn();
    render(<PinList items={ITEMS} pinned={[]} onPinnedChange={onPinnedChange} />);
    await user.click(pin("Inbox"));
    expect(onPinnedChange).toHaveBeenCalledWith(["inbox"]);
    expect(pin("Inbox")).toHaveAttribute("aria-pressed", "false");
  });

  it("takes custom labels, names and announcements", async () => {
    const user = userEvent.setup();
    render(
      <PinList
        items={ITEMS}
        pinnedLabel="Favourites"
        unpinnedLabel="Folders"
        pinLabel={(item) => `Favourite ${item.title}`}
        announce={(item, pinned) => `${item.title} ${pinned ? "favourited" : "unfavourited"}`}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Favourite Sent" }));
    expect(within(list("Favourites")).getByText("Sent")).toBeInTheDocument();
    expect(list("Folders")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sent favourited");
  });

  it("disables every pin", async () => {
    const user = userEvent.setup();
    const onPinnedChange = vi.fn();
    render(<PinList items={ITEMS} disabled onPinnedChange={onPinnedChange} />);
    expect(pin("Inbox")).toBeDisabled();
    await user.click(pin("Inbox"));
    expect(onPinnedChange).not.toHaveBeenCalled();
  });

  it("applies each variant", () => {
    const { rerender } = render(<PinList items={ITEMS} data-testid="root" variant="card" />);
    expect(screen.getByTestId("root").className).toContain("bg-card");
    rerender(<PinList items={ITEMS} data-testid="root" variant="plain" />);
    expect(screen.getByTestId("root").className).toContain("hover:bg-muted/60");
    expect(screen.getByTestId("root").className).not.toContain("bg-card");
  });

  it("lets a consumer className win", () => {
    render(<PinList items={ITEMS} data-testid="root" className="gap-8" />);
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("gap-8");
    expect(root).not.toHaveClass("gap-5");
    expect(root).toHaveAttribute("data-slot", "pin-list");
  });

  it("forwards its ref and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PinList ref={ref} items={ITEMS} id="folders" aria-label="Folders" />);
    expect(ref.current).toHaveAttribute("id", "folders");
    expect(ref.current).toHaveAttribute("aria-label", "Folders");
  });

  it("moves rows instantly under reduced motion", async () => {
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
    render(<PinList items={ITEMS} />);
    await user.click(pin("Sent"));
    expect(within(list("Pinned")).getByText("Sent")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PinList items={ITEMS} defaultPinned={["drafts"]} />);
    await expectNoA11yViolations(container);
  });
});
