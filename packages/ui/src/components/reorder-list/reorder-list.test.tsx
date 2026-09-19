import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { leanFor, ReorderList, reorderSpring, type ReorderListItem } from "./reorder-list";

const PEOPLE: ReorderListItem[] = [
  { id: "mara", label: "Mara Quinn", initials: "MQ", accent: "var(--color-primary)" },
  { id: "tomas", label: "Tomás Oliveira", initials: "TO", avatar: "/tomas.jpg" },
  { id: "lars", label: "Lars Andersen", online: true },
  { id: "sofia", label: "Sofia Ricci", initials: "SR" },
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

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const handle = (name: string | RegExp) => screen.getByRole("button", { name });
const status = () => screen.getByRole("status");
const names = () =>
  screen.getAllByRole("listitem").map((row) => row.textContent?.replace(/, online$/, ""));
const slotOf = (name: string) => handle(name).closest("li")?.getAttribute("data-index");

describe("ReorderList", () => {
  it("renders a named list of buttons, each named by its label and described by the instructions", () => {
    render(<ReorderList items={PEOPLE} aria-label="Speaking order" />);
    const list = screen.getByRole("list", { name: "Speaking order" });
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(handle("Mara Quinn")).toHaveAccessibleDescription(/Space or Enter to pick up/);
    expect(handle("Lars Andersen, online")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="reorder-list-presence"]')).toBeInTheDocument();
    expect(screen.getByText("MQ")).toBeInTheDocument();
    // The initial falls back to the label's first letter.
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="reorder-list-blobs"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(status()).toHaveTextContent("");
  });

  it("gives the goo filter a unique id per instance", () => {
    render(
      <>
        <ReorderList items={PEOPLE} />
        <ReorderList items={PEOPLE} />
      </>,
    );
    const ids = [...document.querySelectorAll("filter")].map((filter) => filter.id);
    expect(new Set(ids).size).toBe(2);
    const blobs = document.querySelectorAll('[data-slot="reorder-list-blobs"]');
    expect((blobs[0] as HTMLElement).style.filter).toContain(String(ids[0]));
  });

  it("runs the full keyboard reorder: grab, move, drop, with announcements", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    handle("Mara Quinn").focus();

    await user.keyboard(" ");
    expect(handle("Mara Quinn")).toHaveAttribute("aria-pressed", "true");
    expect(handle("Mara Quinn")).toHaveAttribute("data-grabbed");
    expect(status()).toHaveTextContent(
      "Mara Quinn grabbed. Current position 1 of 4. Use the arrow keys to move, Space to drop, Escape to cancel.",
    );

    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Mara Quinn moved to position 2 of 4");
    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Mara Quinn moved to position 3 of 4");
    expect(slotOf("Mara Quinn")).toBe("2");
    expect(slotOf("Tomás Oliveira")).toBe("0");
    // A draft: nothing committed yet.
    expect(onValueChange).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(status()).toHaveTextContent("Mara Quinn dropped at position 3 of 4");
    expect(onValueChange).toHaveBeenCalledWith(["tomas", "lars", "mara", "sofia"]);
    expect(names()).toEqual([
      "TOTomás Oliveira",
      "LLars Andersen",
      "MQMara Quinn",
      "SRSofia Ricci",
    ]);
    expect(handle("Mara Quinn")).toHaveFocus();
    expect(handle("Mara Quinn")).toHaveAttribute("aria-pressed", "false");
  });

  it("moves to the ends with Home and End, and stops at the edges", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    handle("Lars Andersen, online").focus();
    await user.keyboard("{Enter}{End}");
    expect(status()).toHaveTextContent("Lars Andersen moved to position 4 of 4");
    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Lars Andersen moved to position 4 of 4");
    await user.keyboard("{Home}{ArrowUp} ");
    expect(onValueChange).toHaveBeenLastCalledWith(["lars", "mara", "tomas", "sofia"]);
  });

  it("cancels with Escape and restores the original position", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    handle("Mara Quinn").focus();
    await user.keyboard(" {ArrowDown}{ArrowDown}{Escape}");
    expect(status()).toHaveTextContent(
      "Reorder cancelled. Mara Quinn returned to position 1 of 4",
    );
    expect(slotOf("Mara Quinn")).toBe("0");
    expect(handle("Mara Quinn")).toHaveAttribute("aria-pressed", "false");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(handle("Mara Quinn")).toHaveFocus();
  });

  it("cancels a grab when focus leaves the row", async () => {
    const user = userEvent.setup();
    render(<ReorderList items={PEOPLE} />);
    handle("Mara Quinn").focus();
    await user.keyboard(" {ArrowDown}");
    await user.tab();
    expect(status()).toHaveTextContent(
      "Reorder cancelled. Mara Quinn returned to position 1 of 4",
    );
  });

  it("drops without calling onValueChange when the position did not change", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    handle("Mara Quinn").focus();
    await user.keyboard("  ");
    expect(status()).toHaveTextContent("Mara Quinn dropped at position 1 of 4");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("moves focus between rows with the arrows, Home and End when nothing is grabbed", async () => {
    const user = userEvent.setup();
    render(<ReorderList items={PEOPLE} />);
    handle("Mara Quinn").focus();
    await user.keyboard("{ArrowDown}");
    expect(handle("Tomás Oliveira")).toHaveFocus();
    await user.keyboard("{End}");
    expect(handle("Sofia Ricci")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(handle("Sofia Ricci")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(handle("Mara Quinn")).toHaveFocus();
    await user.keyboard("{ArrowUp}{Escape}a");
    expect(handle("Mara Quinn")).toHaveFocus();
    expect(status()).toHaveTextContent("");
  });

  it("uses announcement overrides", async () => {
    const user = userEvent.setup();
    render(
      <ReorderList
        items={PEOPLE}
        instructions="Espacio para mover."
        announcements={{
          grabbed: ({ item, position, total }) =>
            `${item.label} en ${String(position)}/${String(total)}`,
        }}
      />,
    );
    expect(handle("Mara Quinn")).toHaveAccessibleDescription("Espacio para mover.");
    handle("Mara Quinn").focus();
    await user.keyboard(" ");
    expect(status()).toHaveTextContent("Mara Quinn en 1/4");
    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Mara Quinn moved to position 2 of 4");
  });

  it("reorders by pointer drag: neighbours give way at half a step and the drop is announced", () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    const row = handle("Mara Quinn");
    fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientY: 100 });
    expect(row).toHaveAttribute("data-grabbed");
    // Pointer drags are not a keyboard grab.
    expect(row).toHaveAttribute("aria-pressed", "false");
    fireEvent.pointerMove(row, { pointerId: 1, clientY: 120 });
    // 20px is less than half a step: nobody moves yet.
    expect(slotOf("Tomás Oliveira")).toBe("1");
    fireEvent.pointerMove(row, { pointerId: 1, clientY: 130 });
    expect(slotOf("Tomás Oliveira")).toBe("0");
    fireEvent.pointerMove(row, { pointerId: 2, clientY: 400 });
    fireEvent.pointerMove(row, { pointerId: 1, clientY: 210 });
    expect(slotOf("Lars Andersen, online")).toBe("1");
    fireEvent.pointerUp(row, { pointerId: 1, clientY: 210 });
    expect(onValueChange).toHaveBeenCalledWith(["tomas", "lars", "mara", "sofia"]);
    expect(status()).toHaveTextContent("Mara Quinn dropped at position 3 of 4");
    expect(row).not.toHaveAttribute("data-grabbed");
  });

  it("clamps a drag past the ends", () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    const row = handle("Sofia Ricci");
    fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientY: 0 });
    fireEvent.pointerMove(row, { pointerId: 1, clientY: -900 });
    fireEvent.pointerCancel(row, { pointerId: 1, clientY: -900 });
    expect(onValueChange).toHaveBeenCalledWith(["sofia", "mara", "tomas", "lars"]);
  });

  it("treats a press without travel as a click, not a drop", () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    const row = handle("Mara Quinn");
    fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientY: 0 });
    fireEvent.pointerMove(row, { pointerId: 1, clientY: 2 });
    fireEvent.pointerUp(row, { pointerId: 1, clientY: 2 });
    fireEvent.pointerDown(row, { pointerId: 1, button: 2, clientY: 0 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent("");
    expect(row).not.toHaveAttribute("data-grabbed");
  });

  it("works uncontrolled from defaultValue", async () => {
    const user = userEvent.setup();
    render(<ReorderList items={PEOPLE} defaultValue={["sofia", "mara"]} />);
    expect(slotOf("Sofia Ricci")).toBe("0");
    expect(slotOf("Tomás Oliveira")).toBe("2");
    handle("Sofia Ricci").focus();
    await user.keyboard(" {ArrowDown} ");
    expect(slotOf("Sofia Ricci")).toBe("1");
  });

  it("is controlled by value, ignoring unknown and duplicate ids", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [order, setOrder] = useState(["lars", "lars", "ghost", "mara", "tomas", "sofia"]);
      return (
        <>
          <ReorderList items={PEOPLE} value={order} onValueChange={setOrder} />
          <output>{order.join(",")}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(slotOf("Lars Andersen, online")).toBe("0");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    handle("Lars Andersen, online").focus();
    await user.keyboard(" {ArrowDown} ");
    expect(screen.getByText("mara,lars,tomas,sofia")).toBeInTheDocument();
  });

  it("snaps back when a controlled value is not updated", async () => {
    const user = userEvent.setup();
    render(<ReorderList items={PEOPLE} value={["mara", "tomas", "lars", "sofia"]} />);
    handle("Mara Quinn").focus();
    await user.keyboard(" {ArrowDown} ");
    expect(slotOf("Mara Quinn")).toBe("0");
  });

  it("does nothing when disabled", () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} disabled onValueChange={onValueChange} />);
    expect(handle("Mara Quinn")).toBeDisabled();
    expect(screen.getByRole("list").parentElement).toHaveAttribute("data-disabled");
  });

  it("renders custom row content while keeping the label as the name", () => {
    render(
      <ReorderList
        items={PEOPLE}
        renderItem={(item, { index }) => (
          <span data-testid="custom">
            {String(index + 1)}. {item.label.toUpperCase()}
          </span>
        )}
      />,
    );
    expect(screen.getAllByTestId("custom")[0]).toHaveTextContent("1. MARA QUINN");
    expect(handle("Mara Quinn")).toBeInTheDocument();
  });

  it("applies corner, stroke and fill", () => {
    const { container } = render(<ReorderList items={PEOPLE} corner={40} stroke fill="dark" />);
    const skin = container.querySelector<HTMLElement>('[data-slot="reorder-list-skin"]');
    expect(skin?.style.borderRadius).toBe("22px");
    expect(skin).toHaveClass("ring-1");
    expect(container.firstChild).toHaveClass("text-background/85");
  });

  it("deforms with velocity scaled by lean, and not at all at rest", () => {
    expect(leanFor(0, 18)).toEqual({ scaleX: 1, scaleY: 1, skewY: 0 });
    const brisk = leanFor(1500, 18);
    expect(brisk.scaleX).toBeCloseTo(0.8, 1);
    expect(brisk.scaleY).toBeCloseTo(1.1, 1);
    expect(brisk.skewY).toBeCloseTo(1.44, 1);
    expect(leanFor(-1500, 100).scaleX).toBe(0.55);
    expect(leanFor(-1500, 18).skewY).toBeLessThan(0);
    expect(reorderSpring(0).stiffness).toBeGreaterThan(reorderSpring(100).stiffness);
    expect(reorderSpring(200)).toEqual(reorderSpring(100));
  });

  it("under reduced motion drops the goo, keeps rows exact and still reorders", async () => {
    mockReducedMotion();
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ReorderList items={PEOPLE} onValueChange={onValueChange} />);
    const blobs = document.querySelector<HTMLElement>('[data-slot="reorder-list-blobs"]');
    expect(blobs?.style.filter).toBe("");
    handle("Mara Quinn").focus();
    await user.keyboard(" {ArrowDown} ");
    expect(onValueChange).toHaveBeenCalledWith(["tomas", "mara", "lars", "sofia"]);
    const row = handle("Sofia Ricci");
    fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientY: 0 });
    fireEvent.pointerMove(row, { pointerId: 1, clientY: -60 });
    const skin = document.querySelectorAll<HTMLElement>('[data-slot="reorder-list-skin"]')[3];
    expect(skin?.style.transform ?? "").not.toMatch(/skew/);
    fireEvent.pointerUp(row, { pointerId: 1, clientY: -60 });
    expect(onValueChange).toHaveBeenLastCalledWith(["tomas", "mara", "sofia", "lars"]);
  });

  it("relaxes the held pill once the pointer is still", () => {
    vi.useFakeTimers();
    try {
      render(<ReorderList items={PEOPLE} />);
      const row = handle("Mara Quinn");
      fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientY: 0 });
      fireEvent.pointerMove(row, { pointerId: 1, clientY: 20 });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.pointerUp(row, { pointerId: 1, clientY: 20 });
      expect(row).not.toHaveAttribute("data-grabbed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ReorderList
        ref={ref}
        items={PEOPLE}
        className="w-80"
        data-testid="root"
        style={{ height: 300 }}
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("w-80");
    expect(root).not.toHaveClass("w-[12.25rem]");
    expect(root.style.height).toBe("300px");
  });

  it("renders nothing to reorder for an empty list", () => {
    render(<ReorderList items={[]} data-testid="root" />);
    expect(screen.getByTestId("root").style.height).toBe("0px");
  });

  it("has no axe violations, idle and grabbed", async () => {
    const user = userEvent.setup();
    const { container } = render(<ReorderList items={PEOPLE} aria-label="Speaking order" />);
    await expectNoA11yViolations(container);
    handle("Mara Quinn").focus();
    await user.keyboard(" {ArrowDown}");
    await expectNoA11yViolations(container);
  });
});
