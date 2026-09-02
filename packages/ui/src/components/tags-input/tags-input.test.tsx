import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TagsInput, type TagsInputProps } from "./tags-input";

function Example({
  initial = [],
  ...rest
}: Partial<TagsInputProps> & { initial?: string[] } = {}) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <TagsInput
      label="Invite by email"
      value={value}
      onValueChange={setValue}
      placeholder="name@example.com"
      {...rest}
    />
  );
}

function field(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>("textbox", { name: "Invite by email" });
}

function tags(): string[] {
  return screen
    .queryAllByRole("listitem")
    .map((item) => item.textContent?.replace(/, invalid:.*$/, "").trim() ?? "");
}

const isEmail = (tag: string) => (tag.includes("@") ? true : "not an email address");

describe("TagsInput", () => {
  it("commits a tag on Enter", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.type(field(), "ana@acme.test{Enter}");

    expect(tags()).toEqual(["ana@acme.test"]);
    expect(field()).toHaveValue("");
  });

  it("does not submit the surrounding form when committing", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Example />
      </form>,
    );

    await user.type(field(), "ana@acme.test{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("commits on a delimiter as it is typed", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.type(field(), "one,two;");

    expect(tags()).toEqual(["one", "two"]);
  });

  it("ignores an empty entry", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.type(field(), "   {Enter}");
    expect(tags()).toEqual([]);
  });

  it("commits what was typed but not entered when focus leaves", async () => {
    // Otherwise a reader who types a value and tabs away loses it silently.
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">After</button>
      </>,
    );

    await user.type(field(), "ana@acme.test");
    await user.tab();

    expect(tags()).toEqual(["ana@acme.test"]);
  });

  it("splits a draft that already holds a delimiter", () => {
    // Autofill, an IME commit or a programmatic set can deliver a value with a
    // delimiter already in it. A token containing a comma is never intended.
    const onValueChange = vi.fn();
    render(<TagsInput label="Tags" value={[]} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "one,two" } });
    fireEvent.blur(input);

    expect(onValueChange).toHaveBeenCalledWith(["one", "two"]);
  });

  describe("paste", () => {
    it("splits a pasted list into separate tags", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(field());
      await user.paste("ana@acme.test, bo@acme.test; cy@acme.test");

      expect(tags()).toEqual(["ana@acme.test", "bo@acme.test", "cy@acme.test"]);
    });

    it("leaves a single pasted value editable rather than committing it", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(field());
      await user.paste("ana@acme.test");

      expect(tags()).toEqual([]);
      expect(field()).toHaveValue("ana@acme.test");
    });
  });

  describe("invalid entries stay visible", () => {
    it("keeps an invalid tag instead of refusing or dropping it", async () => {
      // The behaviour this component exists for. Every surveyed library either
      // blocks the entry or discards it, leaving nothing to correct.
      const user = userEvent.setup();
      render(<Example validate={isEmail} />);

      await user.type(field(), "not-an-email{Enter}");

      expect(tags()).toEqual(["not-an-email"]);
    });

    it("marks it, so it is distinguishable at a glance", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example validate={isEmail} />);

      await user.type(field(), "not-an-email{Enter}");

      expect(container.querySelector("[data-slot='tags-input-tag']")).toHaveAttribute(
        "data-invalid",
      );
    });

    it("carries the reason inside the tag, not as a detached error", async () => {
      const user = userEvent.setup();
      render(<Example validate={isEmail} />);

      await user.type(field(), "not-an-email{Enter}");

      const item = screen.getByRole("listitem");
      expect(within(item).getByText(/not an email address/)).toBeInTheDocument();
    });

    it("leaves valid tags unmarked alongside invalid ones", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example validate={isEmail} />);

      await user.type(field(), "ana@acme.test{Enter}bad{Enter}");

      const items = [...container.querySelectorAll("[data-slot='tags-input-tag']")];
      expect(items.map((item) => item.hasAttribute("data-invalid"))).toEqual([false, true]);
    });

    it("reports invalid tags to the consumer through the value", async () => {
      // value holds every token, so the consumer runs the same validate to
      // decide whether the field is submittable.
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(
        <TagsInput label="Tags" value={[]} onValueChange={onValueChange} validate={isEmail} />,
      );

      await user.type(screen.getByRole("textbox", { name: "Tags" }), "bad{Enter}");

      expect(onValueChange).toHaveBeenCalledWith(["bad"]);
    });
  });

  describe("refusals are announced, never silent", () => {
    it("says a duplicate was already added", async () => {
      const user = userEvent.setup();
      render(<Example initial={["ana@acme.test"]} />);

      await user.type(field(), "ana@acme.test{Enter}");

      expect(tags()).toEqual(["ana@acme.test"]);
      expect(screen.getByText(/is already added/)).toBeInTheDocument();
    });

    it("allows duplicates when asked to", async () => {
      const user = userEvent.setup();
      render(<Example initial={["tag"]} allowDuplicates />);

      await user.type(field(), "tag{Enter}");
      expect(tags()).toEqual(["tag", "tag"]);
    });

    it("says why a tag was refused at the limit", async () => {
      const user = userEvent.setup();
      render(<Example initial={["a", "b"]} max={2} />);

      await user.type(field(), "c{Enter}");

      expect(tags()).toEqual(["a", "b"]);
      expect(screen.getByText(/limit of 2 reached/)).toBeInTheDocument();
    });

    it("announces additions as well as refusals", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example />);

      await user.type(field(), "ana@acme.test{Enter}");

      const live = container.querySelector("[aria-live='polite']");
      expect(live?.textContent).toContain("Added ana@acme.test");
    });

    it("uses a polite region so it does not interrupt typing", () => {
      const { container } = render(<Example />);
      expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
    });
  });

  describe("removal", () => {
    it("removes a tag from its own button", async () => {
      const user = userEvent.setup();
      render(<Example initial={["one", "two"]} />);

      await user.click(screen.getByRole("button", { name: "Remove one" }));
      expect(tags()).toEqual(["two"]);
    });

    it("names the tag in the button, so the buttons are distinguishable", () => {
      render(<Example initial={["one", "two"]} />);

      expect(screen.getByRole("button", { name: "Remove one" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove two" })).toBeInTheDocument();
    });

    it("removes the last tag on Backspace in an empty field", async () => {
      const user = userEvent.setup();
      render(<Example initial={["one", "two"]} />);

      await user.click(field());
      await user.keyboard("{Backspace}");

      expect(tags()).toEqual(["one"]);
    });

    it("does not remove a tag while the field still has text", async () => {
      const user = userEvent.setup();
      render(<Example initial={["one"]} />);

      await user.type(field(), "ab");
      await user.keyboard("{Backspace}");

      expect(tags()).toEqual(["one"]);
      expect(field()).toHaveValue("a");
    });

    it("returns focus to the field after removing", async () => {
      const user = userEvent.setup();
      render(<Example initial={["one", "two"]} />);

      await user.click(screen.getByRole("button", { name: "Remove one" }));
      expect(field()).toHaveFocus();
    });

    it("announces the removal", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example initial={["one"]} />);

      await user.click(screen.getByRole("button", { name: "Remove one" }));
      expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Removed one");
    });
  });

  describe("disabled", () => {
    it("disables the field and every remove button", () => {
      render(<Example initial={["one"]} disabled />);

      expect(field()).toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove one" })).toBeDisabled();
    });
  });

  it("labels the group so the tokens are read as belonging to the field", () => {
    render(<Example initial={["one"]} />);
    expect(screen.getByRole("group", { name: "Invite by email" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Example initial={["ana@acme.test", "bad"]} validate={isEmail} />,
    );
    await expectNoA11yViolations(container);
  });
});
