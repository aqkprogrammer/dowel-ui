import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  defaultComboboxFilter,
} from "./combobox";

const FRAMEWORKS = [
  { value: "Next.js", keywords: ["vercel", "react"] },
  { value: "SvelteKit", keywords: ["svelte"] },
  { value: "Nuxt", keywords: ["vue"] },
  { value: "Remix", keywords: ["react"] },
];

function Example({
  onValueChange,
  defaultValue,
  disabledValue,
}: {
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabledValue?: string;
} = {}) {
  return (
    <Combobox defaultValue={defaultValue} onValueChange={onValueChange}>
      <ComboboxTrigger placeholder="Select framework…" />
      <ComboboxContent label="Search frameworks">
        <ComboboxInput placeholder="Search framework…" aria-label="Search framework" />
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxList>
          {FRAMEWORKS.map((framework) => (
            <ComboboxItem
              key={framework.value}
              value={framework.value}
              keywords={framework.keywords}
              disabled={framework.value === disabledValue}
            />
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

async function open() {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByRole("button"));
  const input = await screen.findByRole("combobox");
  return { user, input };
}

describe("defaultComboboxFilter", () => {
  it("matches case-insensitively on any entry", () => {
    expect(defaultComboboxFilter("nex", ["Next.js", "react"])).toBe(true);
    expect(defaultComboboxFilter("REACT", ["Next.js", "react"])).toBe(true);
    expect(defaultComboboxFilter("vue", ["Next.js", "react"])).toBe(false);
  });

  it("matches everything on an empty search", () => {
    expect(defaultComboboxFilter("   ", ["anything"])).toBe(true);
  });
});

describe("Combobox", () => {
  it("shows the placeholder until something is selected", () => {
    render(<Example />);
    expect(screen.getByRole("button")).toHaveTextContent("Select framework…");
  });

  it("shows the selected value on the trigger", () => {
    render(<Example defaultValue="Nuxt" />);
    expect(screen.getByRole("button")).toHaveTextContent("Nuxt");
  });

  it("is closed until the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  describe("ARIA wiring", () => {
    it("puts the combobox role on the input, not the trigger", async () => {
      const { input } = await open();

      expect(input.tagName).toBe("INPUT");
      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
    });

    it("points the input at the listbox it controls", async () => {
      const { input } = await open();
      const list = screen.getByRole("listbox");
      expect(input).toHaveAttribute("aria-controls", list.id);
    });

    it("moves focus into the input, not onto an option", async () => {
      const { input } = await open();
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it("tracks the active option with aria-activedescendant", async () => {
      const { user, input } = await open();
      expect(input).not.toHaveAttribute("aria-activedescendant");

      await user.keyboard("{ArrowDown}");

      const active = screen.getByRole("option", { name: "Next.js" });
      expect(input).toHaveAttribute("aria-activedescendant", active.id);
      // Focus must stay in the input the whole time.
      expect(input).toHaveFocus();
    });

    it("keeps options out of the tab order", async () => {
      await open();
      for (const option of screen.getAllByRole("option")) {
        expect(option).toHaveAttribute("tabindex", "-1");
      }
    });

    it("marks the selected option", async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="Nuxt" />);
      await user.click(screen.getByRole("button"));

      expect(await screen.findByRole("option", { name: "Nuxt" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("option", { name: "Remix" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });
  });

  describe("filtering", () => {
    it("narrows the list as you type", async () => {
      const { user } = await open();
      expect(screen.getAllByRole("option")).toHaveLength(4);

      await user.keyboard("nu");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option", { name: "Nuxt" })).toBeInTheDocument();
    });

    it("matches hidden keywords as well as the visible value", async () => {
      const { user } = await open();

      await user.keyboard("vercel");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option", { name: "Next.js" })).toBeInTheDocument();
    });

    it("shows the empty state only when nothing matches", async () => {
      const { user } = await open();
      expect(screen.queryByText("No framework found.")).not.toBeInTheDocument();

      await user.keyboard("zzz");
      expect(screen.getByText("No framework found.")).toBeInTheDocument();
      expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("accepts a custom filter", async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          filter={(search, haystack) => haystack.some((entry) => entry.startsWith(search))}
        >
          <ComboboxTrigger />
          <ComboboxContent>
            <ComboboxInput aria-label="Search" />
            <ComboboxList>
              <ComboboxItem value="Alpha" />
              <ComboboxItem value="Beta" />
            </ComboboxList>
          </ComboboxContent>
        </Combobox>,
      );

      await user.click(screen.getByRole("button"));
      await user.keyboard("Al");
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });

    it("clears the search when reopened", async () => {
      const { user, input } = await open();
      await user.keyboard("nu");
      expect(screen.getAllByRole("option")).toHaveLength(1);

      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button"));
      const reopened = await screen.findByRole("combobox");
      expect(reopened).toHaveValue("");
      expect(screen.getAllByRole("option")).toHaveLength(4);
      expect(input).not.toBe(null);
    });
  });

  describe("keyboard", () => {
    it("moves down and up through the options", async () => {
      const { user, input } = await open();

      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "SvelteKit" }).id,
      );

      await user.keyboard("{ArrowUp}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Next.js" }).id,
      );
    });

    it("wraps at both ends", async () => {
      const { user, input } = await open();

      await user.keyboard("{ArrowUp}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Remix" }).id,
      );

      await user.keyboard("{ArrowDown}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Next.js" }).id,
      );
    });

    it("jumps to the ends with Home and End", async () => {
      const { user, input } = await open();

      await user.keyboard("{End}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Remix" }).id,
      );

      await user.keyboard("{Home}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Next.js" }).id,
      );
    });

    it("selects the active option with Enter", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button"));
      await screen.findByRole("combobox");
      await user.keyboard("{ArrowDown}{Enter}");

      expect(onValueChange).toHaveBeenCalledWith("Next.js");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("does nothing on Enter when no option is active", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button"));
      await screen.findByRole("combobox");
      await user.keyboard("{Enter}");

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("closes on Escape", async () => {
      const { user } = await open();
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("skips disabled options when navigating", async () => {
      const user = userEvent.setup();
      render(<Example disabledValue="SvelteKit" />);

      await user.click(screen.getByRole("button"));
      const input = await screen.findByRole("combobox");

      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "Nuxt" }).id,
      );
    });

    it("resets the active option when the search changes", async () => {
      const { user, input } = await open();

      await user.keyboard("{ArrowDown}");
      expect(input).toHaveAttribute("aria-activedescendant");

      await user.keyboard("n");
      expect(input).not.toHaveAttribute("aria-activedescendant");
    });
  });

  describe("selection", () => {
    it("selects on click and closes", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onValueChange={onValueChange} />);

      await user.click(screen.getByRole("button"));
      await user.click(await screen.findByRole("option", { name: "Nuxt" }));

      expect(onValueChange).toHaveBeenCalledWith("Nuxt");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
      expect(screen.getByRole("button")).toHaveTextContent("Nuxt");
    });

    it("ignores clicks on a disabled option", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onValueChange={onValueChange} disabledValue="Nuxt" />);

      await user.click(screen.getByRole("button"));
      await user.click(await screen.findByRole("option", { name: "Nuxt" }));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("works controlled", async () => {
      const user = userEvent.setup();

      function Controlled() {
        const [value, setValue] = useState("Nuxt");
        return (
          <Combobox value={value} onValueChange={setValue}>
            <ComboboxTrigger />
            <ComboboxContent>
              <ComboboxInput aria-label="Search" />
              <ComboboxList>
                <ComboboxItem value="Nuxt" />
                <ComboboxItem value="Remix" />
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        );
      }

      render(<Controlled />);
      expect(screen.getByRole("button")).toHaveTextContent("Nuxt");

      await user.click(screen.getByRole("button"));
      await user.click(await screen.findByRole("option", { name: "Remix" }));

      await waitFor(() => {
        expect(screen.getByRole("button")).toHaveTextContent("Remix");
      });
    });

    it("renders rich children while still matching on value", async () => {
      const user = userEvent.setup();
      render(
        <Combobox>
          <ComboboxTrigger />
          <ComboboxContent>
            <ComboboxInput aria-label="Search" />
            <ComboboxList>
              <ComboboxItem value="Nuxt">
                <span>Nuxt</span>
                <span className="text-muted-foreground">Vue</span>
              </ComboboxItem>
              <ComboboxItem value="Remix" />
            </ComboboxList>
          </ComboboxContent>
        </Combobox>,
      );

      await user.click(screen.getByRole("button"));
      await user.keyboard("nux");
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
  });

  it("throws a useful error if a part is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<ComboboxList />)).toThrow(
      /ComboboxList must be rendered inside <Combobox>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);

    await user.click(screen.getByRole("button"));
    await screen.findByRole("listbox");

    await expectNoA11yViolations(baseElement);
  });
});
