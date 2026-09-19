import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxLoading,
  ComboboxTrigger,
  type ComboboxProps,
} from "./combobox";

const OPTIONS = ["Next.js", "SvelteKit", "Nuxt", "Remix"];

function Example({
  options = OPTIONS,
  clearable,
  ...props
}: Partial<ComboboxProps> & { options?: string[]; clearable?: boolean }) {
  return (
    <Combobox {...props}>
      <ComboboxTrigger placeholder="Select framework…" />
      <ComboboxContent label="Search frameworks">
        <ComboboxInput aria-label="Search framework" clearable={clearable} />
        <ComboboxLoading />
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option} value={option} />
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Combobox motion", () => {
  it("turns the chevron while open", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const chevron = container.querySelector("[data-slot='combobox-chevron']");
    expect(chevron).not.toHaveClass("rotate-180");
    expect(chevron).toHaveClass("duration-[var(--duration-normal)]");
    await user.click(screen.getByRole("button"));
    expect(chevron).toHaveClass("rotate-180");
  });

  it("ships option keyframes whose durations and delays run on the motion scale", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button"));
    const css =
      document.head.querySelector("style[data-href='dowel-combobox']")?.textContent ?? "";
    expect(css).toContain("@keyframes dowel-combobox-item-in");
    expect(css).toContain("var(--duration-normal)");
    for (const delay of css.match(/animation-delay:[^}]+/g) ?? []) {
      expect(delay).toContain("var(--motion-scale");
    }
  });
});

describe("Combobox search and loading", () => {
  it("reports each search change, and the reset on close", async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onSearchChange={onSearchChange} />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("nu");
    expect(onSearchChange).toHaveBeenLastCalledWith("nu");
    await user.keyboard("{Escape}");
    expect(onSearchChange).toHaveBeenLastCalledWith("");
  });

  it("debounces onSearchChange", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    render(<Example defaultOpen onSearchChange={onSearchChange} searchDebounce={300} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "n" } });
    fireEvent.change(input, { target: { value: "nu" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onSearchChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSearchChange).toHaveBeenCalledOnce();
    expect(onSearchChange).toHaveBeenCalledWith("nu");
  });

  it("does not filter options it was told are already results", async () => {
    const user = userEvent.setup();
    render(<Example shouldFilter={false} />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("zzz");
    expect(screen.getAllByRole("option")).toHaveLength(OPTIONS.length);
  });

  it("marks the list busy, shows the loading state and holds back the empty state", () => {
    render(<Example defaultOpen loading options={[]} />);
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText("No framework found.")).not.toBeInTheDocument();
  });

  it("shows the empty state once loading finishes with nothing", () => {
    const { rerender } = render(<Example defaultOpen loading options={[]} />);
    rerender(<Example defaultOpen options={[]} />);
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("No framework found.")).toBeInTheDocument();
  });

  it("drives an async search end to end", async () => {
    const user = userEvent.setup();
    function Async() {
      const [results, setResults] = useState(OPTIONS);
      return (
        <Example
          options={results}
          shouldFilter={false}
          onSearchChange={(search) => {
            setResults(OPTIONS.filter((option) => option.toLowerCase().startsWith(search)));
          }}
        />
      );
    }
    render(<Async />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("s");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "SvelteKit",
    ]);
  });

  it("renders custom loading content", () => {
    render(
      <Combobox defaultOpen loading>
        <ComboboxContent>
          <ComboboxLoading className="py-2">Fetching…</ComboboxLoading>
          <ComboboxList />
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Fetching…");
    expect(screen.getByRole("status")).toHaveClass("py-2");
  });
});

describe("Combobox clear button", () => {
  it("appears only when there is search text", async () => {
    const user = userEvent.setup();
    render(<Example clearable />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await user.keyboard("nu");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("clears the search and returns focus to the input", async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(<Example clearable onSearchChange={onSearchChange} />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("nu");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    const input = screen.getByRole<HTMLInputElement>("combobox");
    expect(input.value).toBe("");
    expect(input).toHaveFocus();
    expect(onSearchChange).toHaveBeenLastCalledWith("");
    expect(screen.getAllByRole("option")).toHaveLength(OPTIONS.length);
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<Example clearable />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("nu");
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole<HTMLInputElement>("combobox").value).toBe("");
  });

  it("is not rendered unless asked for", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("nu");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });
});

describe("Combobox allowDeselect", () => {
  it("keeps the selection when the selected option is chosen again, by default", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Example defaultValue="Nuxt" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "Nuxt" }));
    expect(onValueChange).toHaveBeenLastCalledWith("Nuxt");
    expect(screen.getByRole("button")).toHaveTextContent("Nuxt");
  });

  it("clears the selection when opted in", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Example defaultValue="Nuxt" allowDeselect onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "Nuxt" }));
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("button")).toHaveTextContent("Select framework…");
  });

  it("still selects a different option when opted in", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue="Nuxt" allowDeselect />);
    await user.click(screen.getByRole("button"));
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button")).toHaveTextContent("Next.js");
  });
});

it("has no accessibility violations while loading and while searching", async () => {
  const { baseElement, rerender } = render(<Example defaultOpen loading clearable />);
  await expectNoA11yViolations(baseElement);
  rerender(<Example defaultOpen clearable />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "nu" } });
  await expectNoA11yViolations(baseElement);
});
