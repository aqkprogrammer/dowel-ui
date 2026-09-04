import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

function Section({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>
        <p>The details.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("starts closed, with the content out of the tree", () => {
    render(<Section />);

    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("The details.")).not.toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Section />);

    const trigger = screen.getByRole("button", { name: "Details" });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("The details.")).toBeInTheDocument();
  });

  it("closes again", async () => {
    const user = userEvent.setup();
    render(<Section defaultOpen />);

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.queryByText("The details.")).not.toBeInTheDocument();
  });

  it("points the trigger at the region it controls", () => {
    render(<Section defaultOpen />);

    const controls = screen
      .getByRole("button", { name: "Details" })
      .getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it("gives the trigger no heading role, unlike an accordion of one", () => {
    render(<Section />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Section defaultOpen />);
    await expectNoA11yViolations(container);
  });
});
