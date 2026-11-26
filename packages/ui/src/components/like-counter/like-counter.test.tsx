import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LikeCounter } from "./like-counter";

function shown(button: HTMLElement) {
  return button.querySelector('[data-role="in"]')?.getAttribute("data-value");
}

describe("LikeCounter", () => {
  it("is an unpressed toggle named with its count", () => {
    render(<LikeCounter count={128} />);
    const button = screen.getByRole("button", { name: "Like, 128" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(shown(button)).toBe("128");
  });

  it("likes on click: fills, bursts and rolls the count up", async () => {
    const user = userEvent.setup();
    const onLikedChange = vi.fn();
    render(<LikeCounter count={128} onLikedChange={onLikedChange} />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(onLikedChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Like, 129");
    expect(button.querySelector('[data-part="heart"]')).toHaveAttribute("data-animate", "like");
    expect(button.querySelectorAll('[data-part="spark"]')).toHaveLength(8);
    expect(button.querySelector('[data-role="out"]')).toHaveAttribute("data-dir", "up");
    expect(shown(button)).toBe("129");
  });

  it("unlikes from the keyboard and rolls back down", async () => {
    const user = userEvent.setup();
    render(<LikeCounter count={129} defaultLiked />);
    const button = screen.getByRole("button", { name: "Like, 129" });
    expect(button.querySelector('[data-part="heart"]')).not.toHaveAttribute("data-animate");

    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(shown(button)).toBe("128");
    expect(button.querySelector('[data-role="out"]')).toHaveAttribute("data-dir", "down");
    expect(button.querySelector('[data-part="spark"]')).not.toBeInTheDocument();

    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a controlled count exactly as given", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [liked, setLiked] = useState(false);
      return <LikeCounter liked={liked} onLikedChange={setLiked} count={liked ? 11 : 10} />;
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAccessibleName("Like, 11");
  });

  it("does nothing when the click is prevented", async () => {
    const user = userEvent.setup();
    render(
      <LikeCounter
        count={1}
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("sets the accent, merges className and forwards its ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<LikeCounter ref={ref} count={3} accent="pink" className="mt-4" />);
    const button = screen.getByRole("button");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("mt-4");
    expect(button.style.getPropertyValue("--like-counter-accent")).toBe("pink");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<LikeCounter count={128} />);
    await expectNoA11yViolations(container);
  });
});
