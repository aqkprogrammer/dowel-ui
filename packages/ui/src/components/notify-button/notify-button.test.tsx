import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NotifyButton } from "./notify-button";

afterEach(() => {
  vi.restoreAllMocks();
});

function bell(button: HTMLElement) {
  return button.querySelector('[data-slot="notify-button-bell"]');
}

describe("NotifyButton", () => {
  it("renders an unpressed toggle named by its resting label", () => {
    render(<NotifyButton />);
    const button = screen.getByRole("button", { name: "Notify me" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(bell(button)).not.toHaveAttribute("data-ring");
  });

  it("turns on with a ring and an announcement, keeping its name", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<NotifyButton onPressedChange={onPressedChange} />);
    const button = screen.getByRole("button", { name: "Notify me" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-state", "on");
    expect(bell(button)).toHaveAttribute("data-ring");
    expect(screen.getByRole("status")).toHaveTextContent("You’ll be notified");
    expect(onPressedChange).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(bell(button)).not.toHaveAttribute("data-ring");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<NotifyButton />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("does not ring on first paint when it starts pressed", () => {
    render(<NotifyButton defaultPressed />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(bell(button)).not.toHaveAttribute("data-ring");
  });

  it("follows the controlled prop", async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return <NotifyButton pressed={on} onPressedChange={setOn} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<NotifyButton pressed={false} onPressedChange={onPressedChange} />);
    await user.click(screen.getByRole("button"));
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("respects a prevented click", async () => {
    const user = userEvent.setup();
    render(
      <NotifyButton
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("uses custom labels, icon and announcement", async () => {
    const user = userEvent.setup();
    render(
      <NotifyButton
        label="Watch"
        activeLabel={<b>Watching</b>}
        icon={<svg data-testid="eye" />}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Watch" }));
    expect(screen.getByTestId("eye")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("On");
  });

  it("prefers an explicit announcement", async () => {
    const user = userEvent.setup();
    render(<NotifyButton announcement="Subscribed to updates" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toHaveTextContent("Subscribed to updates");
  });

  it("sizes the label clip to the label on show", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(62);
    const user = userEvent.setup();
    render(<NotifyButton />);
    const clip = screen.getByRole("button").querySelector('[data-slot="notify-button-label"]');
    expect((clip as HTMLElement).style.width).toBe("62px");
    await user.click(screen.getByRole("button"));
    expect((clip as HTMLElement).style.width).toBe("62px");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <NotifyButton ref={ref} className="h-9 bg-primary" data-testid="notify" stroke={false} />,
    );
    const button = screen.getByTestId("notify");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("h-9", "bg-primary");
    expect(button).not.toHaveClass("h-11", "bg-card");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<NotifyButton />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});
