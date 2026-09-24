import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LikeButton } from "./like-button";

function icon(button: HTMLElement) {
  return button.querySelector('[data-slot="like-button-icon"]');
}

function shownCount(button: HTMLElement) {
  return button.querySelector('[data-slot="like-button-count"]')?.getAttribute("data-value");
}

describe("LikeButton", () => {
  it("renders an unpressed toggle named with its count", () => {
    render(<LikeButton count={128} />);
    const button = screen.getByRole("button", { name: "Like, 128" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-state", "off");
    expect(shownCount(button)).toBe("128");
    expect(icon(button)?.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("likes with a pop and a burst, and unlikes with a quiet deflate", async () => {
    const user = userEvent.setup();
    const onLikedChange = vi.fn();
    render(<LikeButton count={128} onLikedChange={onLikedChange} />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Like, 129");
    expect(shownCount(button)).toBe("129");
    expect(icon(button)).toHaveAttribute("data-animate", "like");
    const burst = button.querySelector('[data-slot="like-button-burst"]');
    expect(burst?.querySelectorAll('[data-slot="like-button-spark"]')).toHaveLength(8);
    expect(burst?.querySelector('[data-slot="like-button-ring"]')).not.toBeNull();
    expect(onLikedChange).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAccessibleName("Like, 128");
    expect(icon(button)).toHaveAttribute("data-animate", "unlike");
    expect(button.querySelector('[data-slot="like-button-burst"]')).toBeNull();
    expect(onLikedChange).toHaveBeenLastCalledWith(false);
  });

  it("does not animate on first paint when it starts liked", () => {
    render(<LikeButton defaultLiked count={10} />);
    const button = screen.getByRole("button", { name: "Like, 10" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(icon(button)).not.toHaveAttribute("data-animate");
    expect(button.querySelector('[data-slot="like-button-burst"]')).toBeNull();
  });

  it("treats an uncontrolled count as the total at defaultLiked", async () => {
    const user = userEvent.setup();
    render(<LikeButton defaultLiked count={10} />);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(button).toHaveAccessibleName("Like, 9");
    await user.click(button);
    expect(button).toHaveAccessibleName("Like, 10");
  });

  it("never shows a negative count", async () => {
    const user = userEvent.setup();
    render(<LikeButton defaultLiked count={0} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAccessibleName("Like, 0");
  });

  it("shows a controlled count exactly as given", async () => {
    function Controlled() {
      const [state, setState] = useState({ liked: false, count: 41 });
      return (
        <LikeButton
          liked={state.liked}
          count={state.count}
          onLikedChange={(liked) => {
            setState((current) => ({ liked, count: current.count + (liked ? 1 : -1) }));
          }}
        />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAccessibleName("Like, 42");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onLikedChange = vi.fn();
    render(<LikeButton liked={false} count={5} onLikedChange={onLikedChange} />);
    await user.click(screen.getByRole("button"));
    expect(onLikedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button")).toHaveAccessibleName("Like, 5");
  });

  it("animates a change made by the owner of a controlled state", () => {
    const { rerender } = render(<LikeButton liked={false} />);
    rerender(<LikeButton liked />);
    expect(icon(screen.getByRole("button"))).toHaveAttribute("data-animate", "like");
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<LikeButton />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("is a round icon button named by its label without a count", () => {
    const { rerender } = render(<LikeButton />);
    expect(screen.getByRole("button", { name: "Like" })).toHaveClass("aspect-square");
    rerender(<LikeButton count={3} showCount={false} label="Favourite" />);
    const button = screen.getByRole("button", { name: "Favourite" });
    expect(button.querySelector('[data-slot="like-button-count"]')).toBeNull();
  });

  it("formats the count, visibly and in the name", () => {
    render(<LikeButton count={1200} format={{ notation: "compact" }} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Like, 1.2K");
  });

  it("takes a custom icon and a consumer name", () => {
    render(
      <LikeButton
        icon={<svg data-testid="star" />}
        tone="warning"
        aria-label="Star this repository"
      />,
    );
    const button = screen.getByRole("button", { name: "Star this repository" });
    expect(screen.getByTestId("star")).toBeInTheDocument();
    expect(button).toHaveClass("data-[state=on]:text-warning");
  });

  it.each([
    ["sm", "h-7"],
    ["md", "h-9"],
    ["lg", "h-11"],
  ] as const)("applies the %s size", (size, height) => {
    render(<LikeButton size={size} count={1} />);
    expect(screen.getByRole("button")).toHaveClass(height);
  });

  it.each(["destructive", "primary", "warning", "success", "foreground"] as const)(
    "applies the %s tone while liked",
    (tone) => {
      render(<LikeButton tone={tone} defaultLiked />);
      expect(screen.getByRole("button")).toHaveClass(`data-[state=on]:text-${tone}`);
    },
  );

  it("respects a prevented click", async () => {
    const user = userEvent.setup();
    render(
      <LikeButton
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onLikedChange = vi.fn();
    render(<LikeButton disabled onLikedChange={onLikedChange} />);
    await user.click(screen.getByRole("button"));
    expect(onLikedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<LikeButton ref={ref} className="h-12 rounded-md" data-testid="like" count={2} />);
    const button = screen.getByTestId("like");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("h-12", "rounded-md");
    expect(button).not.toHaveClass("h-9", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<LikeButton count={12} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});
