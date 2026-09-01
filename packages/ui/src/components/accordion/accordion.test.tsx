import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

function Single({ onValueChange }: { onValueChange?: (value: string) => void } = {}) {
  return (
    <Accordion type="single" collapsible onValueChange={onValueChange}>
      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>Ships in two days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>Thirty day returns.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("starts collapsed", () => {
    render(<Single />);
    expect(screen.queryByText("Ships in two days.")).not.toBeInTheDocument();
  });

  it("expands a section on click", async () => {
    const user = userEvent.setup();
    render(<Single />);

    await user.click(screen.getByRole("button", { name: "Shipping" }));
    expect(await screen.findByText("Ships in two days.")).toBeInTheDocument();
  });

  it("exposes each trigger as a button inside a heading", () => {
    render(<Single />);

    const heading = screen.getByRole("heading", { name: "Shipping" });
    expect(heading).toBeInTheDocument();
    expect(heading).toContainElement(screen.getByRole("button", { name: "Shipping" }));
  });

  it("reports expanded state on the trigger", async () => {
    const user = userEvent.setup();
    render(<Single />);

    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("closes the previous section in single mode", async () => {
    const user = userEvent.setup();
    render(<Single />);

    await user.click(screen.getByRole("button", { name: "Shipping" }));
    await screen.findByText("Ships in two days.");

    await user.click(screen.getByRole("button", { name: "Returns" }));
    await screen.findByText("Thirty day returns.");
    await waitFor(() => {
      expect(screen.queryByText("Ships in two days.")).not.toBeInTheDocument();
    });
  });

  it("collapses an open section when collapsible", async () => {
    const user = userEvent.setup();
    render(<Single />);

    const trigger = screen.getByRole("button", { name: "Shipping" });
    await user.click(trigger);
    await screen.findByText("Ships in two days.");

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByText("Ships in two days.")).not.toBeInTheDocument();
    });
  });

  it("keeps sections independent in multiple mode", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="multiple">
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>Panel A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>B</AccordionTrigger>
          <AccordionContent>Panel B</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "B" }));

    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.getByText("Panel B")).toBeInTheDocument();
  });

  it("moves between triggers with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Single />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Returns" })).toHaveFocus();
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Single />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Ships in two days.")).toBeInTheDocument();
  });

  it("reports value changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Single onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: "Shipping" }));
    expect(onValueChange).toHaveBeenCalledWith("shipping");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a" className="border-b-2" data-testid="item">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>Panel</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const item = screen.getByTestId("item");
    expect(item).toHaveClass("border-b-2");
    expect(item).not.toHaveClass("border-b");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Single />);
    await expectNoA11yViolations(container);
  });
});
