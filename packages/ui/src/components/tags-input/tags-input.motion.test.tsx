import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TagsInput, type TagsInputProps } from "./tags-input";

function Example({
  initial = [],
  ...rest
}: Partial<TagsInputProps> & { initial?: string[] } = {}) {
  const [value, setValue] = useState<string[]>(initial);
  return <TagsInput label="Labels" value={value} onValueChange={setValue} {...rest} />;
}

function tagElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-slot='tags-input-tag']")];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("TagsInput motion", () => {
  it("ships its keyframes, timed by duration tokens", () => {
    render(<Example />);
    const css =
      document.head.querySelector("style[data-href='dowel-tags-input']")?.textContent ?? "";
    expect(css).toContain("@keyframes dowel-tags-input-in");
    expect(css).toContain("var(--duration-normal)");
    expect(css).not.toMatch(/\d+ms/);
  });

  it("does not play an entrance for tags present on first render", () => {
    const { container } = render(<Example initial={["a", "b"]} />);
    for (const tag of tagElements(container)) expect(tag).not.toHaveAttribute("data-enter");
  });

  it("plays an entrance for a tag added later, and only for that one", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example initial={["a"]} />);
    await user.type(screen.getByRole("textbox"), "b{Enter}");
    const [first, second] = tagElements(container);
    expect(first).not.toHaveAttribute("data-enter");
    expect(second).toHaveAttribute("data-enter");
  });

  it("keeps later tags mounted when an earlier one is removed", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example initial={["a", "b", "c"]} />);
    const c = tagElements(container)[2];
    await user.click(screen.getByRole("button", { name: "Remove b" }));
    // Same node: an index key would have remounted it and replayed its entrance.
    expect(tagElements(container)[1]).toBe(c);
    expect(c).not.toHaveAttribute("data-enter");
  });

  it("removes a tag immediately by default", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example initial={["a", "b"]} />);
    await user.click(screen.getByRole("button", { name: "Remove a" }));
    expect(tagElements(container)).toHaveLength(1);
    expect(screen.queryByText("a")).not.toBeInTheDocument();
  });

  it("gives the remove button a press response on duration tokens", () => {
    render(<Example initial={["a"]} />);
    expect(screen.getByRole("button", { name: "Remove a" })).toHaveClass(
      "active:scale-90",
      "duration-[var(--duration-fast)]",
    );
  });

  describe("with animateExit", () => {
    it("keeps a hidden, inert copy of a removed tag in its old place", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a", "b", "c"]} animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove b" }));

      const all = tagElements(container);
      expect(all.map((tag) => tag.firstChild?.textContent)).toEqual(["a", "b", "c"]);
      const leaving = all[1];
      expect(leaving).toHaveAttribute("data-state", "closed");
      expect(leaving).toHaveAttribute("aria-hidden", "true");
      expect(leaving).toHaveAttribute("inert");
      // Assistive technology sees only the live tags.
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.queryByRole("button", { name: "Remove b" })).not.toBeInTheDocument();
    });

    it("drops the copy when its exit animation ends", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a", "b"]} animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a" }));
      const leaving = container.querySelector<HTMLElement>("[data-state='closed']")!;
      fireEvent.animationEnd(leaving.querySelector("button")!);
      expect(leaving).toBeInTheDocument();
      fireEvent.animationEnd(leaving);
      expect(container.querySelector("[data-state='closed']")).toBeNull();
      expect(tagElements(container)).toHaveLength(1);
    });

    it("falls back to a timer when no animation runs", () => {
      vi.useFakeTimers();
      const { container } = render(<Example initial={["a", "b"]} animateExit />);
      fireEvent.click(screen.getByRole("button", { name: "Remove b" }));
      expect(container.querySelector("[data-state='closed']")).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector("[data-state='closed']")).toBeNull();
    });

    it("removes the last tag with Backspace and still lets it leave", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a", "b"]} animateExit />);
      await user.click(screen.getByRole("textbox"));
      await user.keyboard("{Backspace}");
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
      expect(container.querySelector("[data-state='closed']")?.firstChild?.textContent).toBe(
        "b",
      );
    });

    it("cancels the departure when the same tag comes straight back", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a"]} animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a" }));
      await user.keyboard("a{Enter}");
      expect(container.querySelector("[data-state='closed']")).toBeNull();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("keeps the group visible while the last tag leaves", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a"]} animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a" }));
      expect(container.querySelector("ul")).not.toBeNull();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });

    it("has no accessibility violations mid-exit", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["a", "b"]} animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a" }));
      await expectNoA11yViolations(container);
    });
  });
});
