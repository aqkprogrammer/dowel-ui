import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RichPopover, type RichPopoverProps } from "./rich-popover";

function Example(props: Partial<RichPopoverProps>) {
  return (
    <RichPopover
      trigger={<button type="button">Video</button>}
      heading="Introducing the model"
      description="A short description."
      meta="0:00–2:15"
      actionLabel="Watch"
      {...props}
    />
  );
}

function content() {
  return document.querySelector<HTMLElement>('[data-slot="rich-popover-content"]');
}

describe("RichPopover", () => {
  it("opens from a click into a dialog named by its heading", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Video" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Introducing the model" });
    expect(dialog).toHaveTextContent("A short description.");
    expect(dialog).toHaveTextContent("0:00–2:15");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens from the keyboard, closes on Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Video" });
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("calls onActionClick from a button action", async () => {
    const user = userEvent.setup();
    const onActionClick = vi.fn();
    render(<Example defaultOpen onActionClick={onActionClick} />);
    await user.click(await screen.findByRole("button", { name: "Watch" }));
    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it("renders heading and action as external links when given hrefs", async () => {
    render(
      <Example
        defaultOpen
        headingHref="https://example.com/a"
        actionHref="https://example.com/b"
      />,
    );
    const heading = await screen.findByRole("link", { name: "Introducing the model" });
    expect(heading).toHaveAttribute("href", "https://example.com/a");
    expect(heading).toHaveAttribute("target", "_blank");
    expect(heading).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Watch" })).toHaveAttribute(
      "href",
      "https://example.com/b",
    );
    expect(screen.queryByRole("button", { name: "Watch" })).not.toBeInTheDocument();
  });

  it("omits the footer without meta or action, and keeps it for an action alone", async () => {
    const { unmount } = render(
      <Example defaultOpen meta={undefined} actionLabel={undefined} description={undefined} />,
    );
    await screen.findByRole("dialog");
    expect(content()!.querySelector('[data-slot="rich-popover-meta"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Watch" })).not.toBeInTheDocument();
    unmount();

    render(<Example defaultOpen meta={undefined} />);
    expect(await screen.findByRole("button", { name: "Watch" })).toBeInTheDocument();
  });

  it("renders a decorative icon and custom action icon", async () => {
    render(
      <Example
        defaultOpen
        icon={<svg data-testid="brand" />}
        actionIcon={<svg data-testid="action-icon" />}
      />,
    );
    await screen.findByRole("dialog");
    expect(screen.getByTestId("brand").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("action-icon")).toBeInTheDocument();
  });

  it("supports controlled state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Video" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(content()).toBeNull();
    rerender(<Example open onOpenChange={onOpenChange} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("applies the inverted tone, a side, and lets className win", async () => {
    render(<Example defaultOpen tone="inverted" side="bottom" className="rounded-md" />);
    await screen.findByRole("dialog");
    expect(content()).toHaveClass("bg-foreground", "rounded-md");
    expect(content()).not.toHaveClass("rounded-2xl");
    expect(content()).toHaveAttribute("data-side", "bottom");
    expect(document.querySelector('[data-slot="popover-arrow"]')).toHaveClass(
      "fill-foreground",
    );
    expect(screen.getByRole("button", { name: "Watch" })).toHaveClass("bg-background");
  });

  it("forwards its ref to the content", async () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example defaultOpen ref={ref} />);
    await screen.findByRole("dialog");
    expect(ref.current).toBe(content());
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example headingHref="https://example.com" />);
    await user.click(screen.getByRole("button", { name: "Video" }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
