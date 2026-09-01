import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "./popover";

function Example() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Open settings</Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby="dimensions-heading">
        <p id="dimensions-heading">Dimensions</p>
        <PopoverClose>Done</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("is closed until the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(screen.queryByText("Dimensions")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open settings" }));
    expect(await screen.findByText("Dimensions")).toBeInTheDocument();
  });

  it("reports its state on the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Open settings" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Dimensions")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);
    await screen.findByText("Dimensions");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Dimensions")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("closes from PopoverClose", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open settings" }));
    await screen.findByText("Dimensions");

    await user.click(screen.getByText("Done"));
    await waitFor(() => {
      expect(screen.queryByText("Dimensions")).not.toBeInTheDocument();
    });
  });

  it("merges a consumer className", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="w-96" aria-label="Details" data-testid="content">
          Content
        </PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText("Open"));
    const content = await screen.findByTestId("content");
    expect(content).toHaveClass("w-96");
    expect(content).not.toHaveClass("w-72");
  });

  it("warns in development when the content has no accessible name", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Unnamed</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText("Open"));
    await screen.findByText("Unnamed");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Missing accessible name"));
    warn.mockRestore();
  });

  it("does not warn when a name is supplied", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label="Details">Named</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText("Open"));
    await screen.findByText("Named");

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders an arrow that is hidden from assistive technology", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label="Details">
          Details
          <PopoverArrow />
        </PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText("Open"));
    await screen.findByText("Details");

    const arrow = baseElement.querySelector("[data-slot='popover-arrow']");
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveClass("fill-popover");
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open settings" }));
    await screen.findByText("Dimensions");

    await expectNoA11yViolations(baseElement);
  });
});
