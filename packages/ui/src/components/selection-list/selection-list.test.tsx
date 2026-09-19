import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  SelectionList,
  type SelectionListItem,
  type SelectionListProps,
} from "./selection-list";

const ITEMS: SelectionListItem[] = [
  { id: "nadia", name: "Nadia Okonkwo", description: "@nadia" },
  { id: "tomas", name: "Tomas Cardoso", description: "@tomas", avatar: "/tomas.png" },
  { id: "kai", name: "Kai Brenner", description: "@kai" },
  { id: "lukas", name: "Lukas Lindqvist" },
];

function Example(props: Partial<SelectionListProps>) {
  return <SelectionList items={ITEMS} aria-label="Invite people" {...props} />;
}

function options() {
  return screen.getAllByRole("option");
}

function option(index: number) {
  const found = options()[index];
  if (!found) throw new Error(`No option ${String(index)}`);
  return found;
}

function action() {
  return document.querySelector<HTMLElement>('[data-slot="selection-list-action"]');
}

function cta() {
  return document.querySelector<HTMLButtonElement>('[data-slot="selection-list-cta"]');
}

function pill() {
  return document.querySelector<HTMLElement>('[data-slot="selection-list-pill"]');
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SelectionList", () => {
  it("renders a named multi-select listbox of options with a single tab stop", () => {
    render(<Example />);
    const listbox = screen.getByRole("listbox", { name: "Invite people" });
    expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    expect(options()).toHaveLength(4);
    expect(options()[0]).toHaveAccessibleName("Nadia Okonkwo");
    expect(options()[0]).toHaveAccessibleDescription("@nadia");
    expect(options()[3]).not.toHaveAttribute("aria-describedby");
    expect(options().map((option) => option.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
    ]);
    expect(options()[0]).toHaveTextContent("NO");
  });

  it("defaults the listbox name and accepts aria-labelledby", () => {
    const { unmount } = render(<SelectionList items={ITEMS} />);
    expect(screen.getByRole("listbox", { name: "Select people" })).toBeInTheDocument();
    unmount();
    render(
      <>
        <h2 id="heading">Reviewers</h2>
        <SelectionList items={ITEMS} aria-labelledby="heading" />
      </>,
    );
    expect(screen.getByRole("listbox", { name: "Reviewers" })).not.toHaveAttribute(
      "aria-label",
    );
  });

  it("tucks the action away, inert and hidden, while nothing is selected", () => {
    render(<Example />);
    expect(action()).toHaveAttribute("data-state", "tucked");
    expect(action()).toHaveAttribute("aria-hidden", "true");
    expect(action()).toHaveAttribute("inert");
    expect(cta()).toBeDisabled();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("toggles rows by click and springs the action out with a count", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await user.click(option(1));
    expect(onValueChange).toHaveBeenLastCalledWith(["tomas"]);
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    expect(action()).toHaveAttribute("data-state", "out");
    expect(action()).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();
    await user.click(option(2));
    expect(screen.getByRole("button", { name: "Send 2 requests" })).toBeInTheDocument();
    await user.click(option(1));
    expect(onValueChange).toHaveBeenLastCalledWith(["kai"]);
  });

  it("roves with arrows, wraps, jumps with Home/End and toggles with Space/Enter", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(options()[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(options()[1]).toHaveFocus();
    expect(options()[1]).toHaveAttribute("tabindex", "0");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(options()[3]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(options()[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(options()[3]).toHaveFocus();
    await user.keyboard("{Home} ");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(options()[1]).toHaveAttribute("aria-selected", "false");
    await user.keyboard("q");
    expect(options()[1]).toHaveFocus();
  });

  it("selects and clears everything with Ctrl/Cmd+A", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Control>}a{/Control}");
    expect(options().every((o) => o.getAttribute("aria-selected") === "true")).toBe(true);
    await user.keyboard("{Meta>}a{/Meta}");
    expect(options().every((o) => o.getAttribute("aria-selected") === "false")).toBe(true);
  });

  it("moves the hover pill with the pointer and with keyboard focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(pill()).toHaveAttribute("data-state", "hidden");
    expect(pill()).toHaveAttribute("aria-hidden", "true");

    await user.hover(option(2));
    expect(pill()?.style.transform).toContain("translateY(calc(2 *");
    await waitFor(() => expect(pill()).toHaveAttribute("data-state", "visible"));
    await user.hover(option(1));
    expect(pill()?.style.transform).toContain("translateY(calc(1 *");
    await waitFor(() => expect(pill()).toHaveAttribute("data-state", "visible"));

    fireEvent.pointerLeave(screen.getByRole("listbox"));
    expect(pill()).toHaveAttribute("data-state", "hidden");

    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(pill()).toHaveAttribute("data-state", "visible"));
    expect(pill()?.style.transform).toContain("translateY(calc(3 *");

    await user.tab();
    expect(pill()).toHaveAttribute("data-state", "hidden");
  });

  it("keeps the pill while focus moves between rows", () => {
    render(<Example />);
    const [first, second] = options();
    act(() => first?.focus());
    act(() => second?.focus());
    expect(pill()?.style.transform).toContain("translateY(calc(1 *");
  });

  it("runs the action, announces the result, clears and tucks away", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const onAction = vi.fn();
    const onValueChange = vi.fn();
    render(
      <Example
        defaultValue={["nadia", "kai"]}
        onAction={onAction}
        onValueChange={onValueChange}
        resetAfter={1000}
      />,
    );
    const button = screen.getByRole("button", { name: "Send 2 requests" });
    await user.click(button);
    expect(onAction).toHaveBeenCalledWith(["nadia", "kai"]);
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(button).toHaveAccessibleName("Requests sent");
    expect(screen.getByRole("status")).toHaveTextContent("Requests sent");
    expect(action()).toHaveAttribute("data-state", "out");
    expect(button).toHaveFocus();

    // A second press while done does nothing.
    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(action()).toHaveAttribute("data-state", "tucked");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    // Focus comes back to the list rather than falling to the page.
    expect(options()[0]).toHaveFocus();
  });

  it("does not move focus when the action was not focused at reset", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Example defaultValue={["nadia"]} resetAfter={500} />);
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(document.body).toHaveFocus();
  });

  it("shows a busy state while a returned promise is pending", async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => undefined;
    const onAction = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    render(<Example defaultValue={["kai"]} onAction={onAction} />);
    const button = screen.getByRole("button", { name: "Send request" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Requests sent");
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("keeps the selection when the action rejects", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.reject(new Error("offline")));
    render(<Example defaultValue={["kai"]} onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy"));
    expect(options()[2]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ignores a promise that settles after unmount", async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => undefined;
    let reject: () => void = () => undefined;
    const pending = [
      new Promise<void>((done) => (resolve = done)),
      new Promise<void>((_, fail) => (reject = fail)),
    ];
    let call = 0;
    const onAction = () => pending[call++];
    const first = render(<Example defaultValue={["kai"]} onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Send request" }));
    first.unmount();
    const second = render(<Example defaultValue={["kai"]} onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Send request" }));
    second.unmount();
    await act(async () => {
      resolve();
      reject();
      await Promise.resolve();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("takes custom labels", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Example actionLabel={(n) => `Invite ${String(n)}`} doneLabel="Invites sent" />,
    );
    await user.click(option(0));
    await user.click(option(1));
    expect(screen.getByRole("button", { name: "Invite 2" })).toBeInTheDocument();
    rerender(<Example actionLabel="Invite" doneLabel="Invites sent" />);
    await user.click(screen.getByRole("button", { name: "Invite" }));
    expect(screen.getByRole("status")).toHaveTextContent("Invites sent");
  });

  it("supports a controlled value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example value={["lukas", "ghost"]} onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument();
    await user.click(option(0));
    expect(onValueChange).toHaveBeenCalledWith(["lukas", "nadia"]);
    expect(options()[0]).toHaveAttribute("aria-selected", "false");
  });

  it("derives radii from corner and applies tone and stroke", () => {
    render(<Example corner={30} tone="inverted" stroke />);
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveStyle({ borderRadius: "30px" });
    expect(listbox).toHaveClass("bg-foreground", "ring-1");
    expect(pill()).toHaveStyle({ borderRadius: "15px" });
    expect(options()[0]).toHaveStyle({ borderRadius: "19.5px" });
    expect(cta()).toHaveStyle({ borderRadius: "19.5px" });
  });

  it("draws the tick with a goo filter named from useId, and a plain fill for reduced motion", () => {
    render(<Example defaultValue={["nadia"]} />);
    const filter = document.querySelector("filter");
    expect(filter?.id).toMatch(/^dowel-selection-list-goo-[\w-]+$/);
    const goo = document.querySelector('[data-slot="selection-list-goo"] g');
    expect(goo).toHaveAttribute("filter", `url(#${String(filter?.id)})`);
    expect(document.querySelector('[data-slot="selection-list-tick"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    const sheet = document.querySelector(
      'style[data-href="dowel-selection-list"]',
    )?.textContent;
    expect(sheet).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\[data-slot="selection-list-goo"\] \{ display: none; \}/,
    );
    expect(sheet).toContain('[data-slot="selection-list-fill"] { display: block; }');
  });

  it("lets consumer classes win and forwards ref and props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Example
        ref={ref}
        className="w-80"
        listClassName="p-4"
        actionClassName="h-12"
        data-testid="root"
        defaultValue={["kai"]}
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("w-80");
    expect(root).not.toHaveClass("w-67");
    expect(screen.getByRole("listbox")).toHaveClass("p-4");
    expect(screen.getByRole("listbox")).not.toHaveClass("p-2.5");
    expect(cta()).toHaveClass("h-12");
    expect(cta()).not.toHaveClass("h-11");
  });

  it("has no axe violations empty and with a selection", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
    await user.click(option(0));
    await expectNoA11yViolations(container);
  });
});
