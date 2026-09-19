import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ExpandableList, type ExpandableListItem } from "./expandable-list";

const ITEMS: ExpandableListItem[] = [
  {
    id: "resend",
    title: "Resend",
    subtitle: "Senior Frontend Engineer / $120k – $180k",
    meta: "Hybrid / San Francisco | Full-time",
    media: <svg data-testid="logo" />,
    content: "Build the future of email infrastructure.",
    actions: <a href="/apply">Apply</a>,
  },
  { id: "turso", title: "Turso", content: "Edge databases in Rust." },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
// jsdom lays nothing out, and a shared-layout element leaving a zero-sized box
// never hands back to the row it came from. Any real size lets it finish.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 60 }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExpandableList", () => {
  it("renders each item as a closed dialog-opening button", () => {
    render(<ExpandableList items={ITEMS} />);
    const row = screen.getByRole("button", { name: /Resend/ });
    expect(row).toHaveAttribute("aria-haspopup", "dialog");
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(row).toHaveTextContent("Hybrid / San Francisco | Full-time");
    expect(screen.getByTestId("logo").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("opens a named, described dialog and returns focus on Close", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ExpandableList items={ITEMS} onValueChange={onValueChange} />);
    const row = screen.getByRole("button", { name: /Resend/ });
    await user.click(row);
    expect(onValueChange).toHaveBeenCalledWith("resend");

    const dialog = await screen.findByRole("dialog", { name: "Resend" });
    expect(dialog).toHaveAccessibleDescription("Build the future of email infrastructure.");
    expect(screen.getByRole("link", { name: "Apply" })).toBeInTheDocument();
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(row).toHaveFocus());
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("opens from the keyboard and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ExpandableList items={ITEMS} />);
    await user.tab();
    await user.tab();
    const row = screen.getByRole("button", { name: /Turso/ });
    expect(row).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Turso" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(row).toHaveFocus());
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<string | null>("turso");
      return (
        <>
          <ExpandableList
            items={ITEMS}
            value={value}
            onValueChange={setValue}
            closeLabel="Dismiss"
          />
          <output>{value ?? "none"}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(await screen.findByRole("dialog", { name: "Turso" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("none"),
    );
  });

  it("honours defaultValue and ignores unknown ids", async () => {
    const { unmount } = render(<ExpandableList items={ITEMS} defaultValue="resend" />);
    expect(await screen.findByRole("dialog", { name: "Resend" })).toBeInTheDocument();
    unmount();
    render(<ExpandableList items={ITEMS} value="missing" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("applies density, merges className and forwards the ref", () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <ExpandableList
        ref={ref}
        items={ITEMS}
        density="compact"
        className="gap-6"
        rowClassName="p-6"
      />,
    );
    expect(ref.current).toBe(screen.getByRole("list"));
    expect(ref.current).toHaveClass("gap-6");
    expect(ref.current).not.toHaveClass("gap-2");
    expect(screen.getByRole("button", { name: /Turso/ })).toHaveClass("p-6");
  });

  it("has no accessibility violations closed or open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<ExpandableList items={ITEMS} />);
    await expectNoA11yViolations(baseElement);
    await user.click(screen.getByRole("button", { name: /Resend/ }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
