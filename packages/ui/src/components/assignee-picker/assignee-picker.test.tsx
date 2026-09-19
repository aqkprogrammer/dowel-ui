import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AssigneePicker,
  type AssigneePickerPerson,
  type AssigneePickerProps,
} from "./assignee-picker";

const PEOPLE: AssigneePickerPerson[] = [
  { id: "adam", name: "Adam Marsh", description: "Design" },
  { id: "priya", name: "Priya Raman", description: "Research" },
  { id: "nora", name: "Nora Wilder", description: "Engineering", avatar: "/nora.png" },
  { id: "marco", name: "Marco Bellini" },
];

function Example(props: Partial<AssigneePickerProps>) {
  return <AssigneePicker people={PEOPLE} {...props} />;
}

function trigger() {
  return screen.getByRole("button", { name: /^Assignees:/ });
}

function faces() {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-slot="assignee-picker-face"]'),
  ].filter((face) => face.dataset.state !== "leave");
}

function rail() {
  return document.querySelector<HTMLElement>('[data-slot="assignee-picker-rail"]');
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("listbox", { name: "Assignees" });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AssigneePicker", () => {
  it("names the trigger by its label and the placeholder when nobody is assigned", () => {
    render(<Example />);
    const button = screen.getByRole("button", { name: "Assignees: Unassigned" });
    expect(button).toHaveAttribute("aria-haspopup", "listbox");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveTextContent("Unassigned");
    expect(rail()).toHaveStyle({ width: "0px" });
  });

  it("names the trigger by who is assigned and stacks their faces", () => {
    render(<Example defaultValue={["adam", "priya"]} />);
    expect(
      screen.getByRole("button", { name: "Assignees: Adam Marsh, Priya Raman" }),
    ).not.toHaveTextContent("Unassigned");
    expect(faces()).toHaveLength(2);
    // 28 + (n − 1) × (28 − overlap): an 18px step at the default overlap.
    expect(rail()).toHaveStyle({ width: "46px" });
    expect(faces()[1]).toHaveStyle({ insetInlineStart: "18px" });
    expect(faces()[0]).toHaveTextContent("AM");
    // Faces already there on first paint do not fly in.
    expect(faces()[0]).toHaveAttribute("data-state", "idle");
  });

  it("derives the step from overlap", () => {
    render(<Example defaultValue={["adam", "priya", "nora"]} overlap={0} />);
    expect(rail()).toHaveStyle({ width: "84px" });
  });

  it("opens a named multi-select listbox and moves focus onto the first assigned person", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue={["nora"]} />);
    const listbox = await openList(user);
    expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[0]).toHaveAccessibleName("Adam Marsh");
    expect(options[0]).toHaveAccessibleDescription("Design");
    await waitFor(() => expect(options[2]).toHaveFocus());
    expect(options[2]).toHaveAttribute("tabindex", "0");
    expect(options[0]).toHaveAttribute("tabindex", "-1");
  });

  it("toggles people by click and keeps the list open", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await openList(user);
    await user.click(screen.getByRole("option", { name: /Priya Raman/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(["priya"]);
    await user.click(screen.getByRole("option", { name: /Adam Marsh/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(["priya", "adam"]);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Assignees: Priya Raman, Adam Marsh");
    await user.click(screen.getByRole("option", { name: /Priya Raman/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(["adam"]);
  });

  it("roves with the arrow keys, wraps, and jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    const options = await screen.findAllByRole("option");
    await waitFor(() => expect(options[0]).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(options[3]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(options[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(options[3]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(options[0]).toHaveFocus();
    expect(options[0]).toHaveAttribute("tabindex", "0");
  });

  it("toggles the focused option with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    const options = await screen.findAllByRole("option");
    await waitFor(() => expect(options[0]).toHaveFocus());
    await user.keyboard(" ");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard(" ");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
    // Other keys do nothing.
    await user.keyboard("x");
    expect(options[1]).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await openList(user);
    await waitFor(() => expect(screen.getAllByRole("option")[0]).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("closes on Tab and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    await openList(user);
    await waitFor(() => expect(screen.getAllByRole("option")[0]).toHaveFocus());
    await user.keyboard("{Tab}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("toggles the card from the pill", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await openList(user);
    await user.click(trigger());
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("supports a controlled value and open state", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <Example
        value={["marco"]}
        onValueChange={onValueChange}
        open
        onOpenChange={onOpenChange}
      />,
    );
    const option = screen.getByRole("option", { name: /Adam Marsh/ });
    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith(["marco", "adam"]);
    expect(option).toHaveAttribute("aria-selected", "false");
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("ignores selected ids that name nobody", () => {
    render(<Example value={["ghost", "adam"]} />);
    expect(trigger()).toHaveAccessibleName("Assignees: Adam Marsh");
    expect(faces()).toHaveLength(1);
  });

  it("flies a new face in and keeps a removed one mounted for its exit", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue={["adam"]} />);
    await openList(user);
    await user.click(screen.getByRole("option", { name: /Priya Raman/ }));
    const added = document.querySelectorAll('[data-slot="assignee-picker-face"]')[1];
    expect(added).toHaveAttribute("data-state", "enter");

    await user.click(screen.getByRole("option", { name: /Adam Marsh/ }));
    const leaving = document.querySelector(
      '[data-slot="assignee-picker-face"][data-state="leave"]',
    );
    expect(leaving).toHaveTextContent("AM");
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="assignee-picker-face"][data-state="leave"]'),
      ).toBeNull(),
    );
    expect(faces()).toHaveLength(1);
  });

  it("revives a face re-added while it is still leaving", () => {
    const { rerender } = render(<Example value={["adam", "priya"]} />);
    rerender(<Example value={["adam"]} />);
    expect(document.querySelectorAll('[data-state="leave"]')).toHaveLength(1);
    rerender(<Example value={["adam", "priya"]} />);
    expect(document.querySelectorAll('[data-state="leave"]')).toHaveLength(0);
    expect(faces()).toHaveLength(2);
  });

  it("drops a leaving face whose person disappears", () => {
    const { rerender } = render(<Example value={["adam", "priya"]} />);
    rerender(<AssigneePicker people={PEOPLE.slice(0, 1)} value={["adam"]} />);
    expect(document.querySelectorAll('[data-state="leave"]')).toHaveLength(0);
  });

  it("clears pending exit timers on unmount", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, "clearTimeout");
    const { rerender, unmount } = render(<Example value={["adam", "priya"]} />);
    rerender(<Example value={["adam"]} />);
    unmount();
    expect(clear).toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
  });

  it("collapses extra people into a +N slot", () => {
    render(<Example defaultValue={["adam", "priya", "nora", "marco"]} maxFaces={3} />);
    expect(faces()).toHaveLength(2);
    expect(document.querySelector('[data-slot="assignee-picker-overflow"]')).toHaveTextContent(
      "+2",
    );
    expect(rail()).toHaveStyle({ width: "64px" });
    // The name still lists everyone.
    expect(trigger()).toHaveAccessibleName(
      "Assignees: Adam Marsh, Priya Raman, Nora Wilder, Marco Bellini",
    );
  });

  it("packs faces into a 2×2 square in a grid stack", () => {
    render(<Example defaultValue={["adam", "priya", "nora"]} stack="grid" />);
    expect(rail()).toHaveStyle({ width: "28px" });
    const [, second, third] = faces();
    expect(second).toHaveStyle({ width: "13px", insetInlineStart: "15px", top: "0px" });
    expect(third).toHaveStyle({ insetInlineStart: "0px", top: "15px" });
  });

  it("shows a single face full size in a grid stack", () => {
    render(<Example defaultValue={["adam"]} stack="grid" />);
    expect(faces()[0]).toHaveStyle({ width: "28px" });
  });

  it("applies corner, tone and stroke to both surfaces", async () => {
    const user = userEvent.setup();
    render(<Example corner={8} tone="inverted" stroke contentWidth={300} />);
    expect(trigger()).toHaveStyle({ borderRadius: "8px" });
    expect(trigger()).toHaveClass("bg-foreground", "ring-1");
    const listbox = await openList(user);
    expect(listbox).toHaveClass("bg-foreground", "ring-1");
    expect(listbox).toHaveStyle({ width: "300px", borderRadius: "8px" });
    expect(screen.getAllByRole("option")[0]).toHaveStyle({ borderRadius: "2px" });
  });

  it("lets consumer classes win and forwards ref and props to the root", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(
      <Example
        ref={ref}
        className="inline-block"
        triggerClassName="h-9"
        contentClassName="p-3"
        data-testid="root"
        label="Owners"
        placeholder="Nobody"
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("inline-block");
    expect(root).not.toHaveClass("inline-flex");
    const button = screen.getByRole("button", { name: "Owners: Nobody" });
    expect(button).toHaveClass("h-9");
    expect(button).not.toHaveClass("h-11");
    await user.click(button);
    const listbox = await screen.findByRole("listbox", { name: "Owners" });
    expect(listbox).toHaveClass("p-3");
    expect(listbox).not.toHaveClass("p-1.5");
  });

  it("ships its motion as a hoisted stylesheet scaled by --motion-scale", () => {
    render(<Example />);
    const sheet = document.querySelector('style[data-href="dowel-assignee-picker"]');
    expect(sheet?.textContent).toContain("@keyframes dowel-assignee-picker-face-in");
    expect(sheet?.textContent).toContain("calc(340ms * var(--motion-scale))");
    expect(sheet?.textContent).toContain("calc(200ms * var(--motion-scale))");
  });

  it("has no axe violations closed and open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example defaultValue={["adam"]} />);
    await expectNoA11yViolations(baseElement);
    await openList(user);
    await expectNoA11yViolations(baseElement);
  });
});
