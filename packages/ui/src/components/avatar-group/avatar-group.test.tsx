import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AvatarGroup, type AvatarGroupItem } from "./avatar-group";

const PEOPLE: AvatarGroupItem[] = [
  { name: "Ada Lovelace", src: "/ada.png", href: "/people/ada" },
  { name: "Grace Hopper", src: "/grace.png" },
  { name: "Alan Turing" },
  { name: "Katherine Johnson", fallback: "KJ!" },
  { name: "Edsger Dijkstra" },
  { name: "Barbara Liskov" },
];

describe("AvatarGroup", () => {
  it("renders a list of named people, collapsing the rest into +N", () => {
    render(<AvatarGroup aria-label="Team" avatars={PEOPLE} />);
    const list = screen.getByRole("list", { name: "Team" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(screen.getByText("Ada Lovelace")).toHaveClass("sr-only");
    expect(screen.queryByText("Edsger Dijkstra")).toBeNull();
    expect(screen.getByText("+2")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("and 2 more")).toHaveClass("sr-only");
  });

  it("shows initials as a decorative fallback, or the given fallback", () => {
    render(<AvatarGroup avatars={PEOPLE} max={6} />);
    expect(screen.getByText("AL")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("AT")).toBeInTheDocument();
    expect(screen.getByText("KJ!")).toBeInTheDocument();
    expect(screen.getByText("ED")).toBeInTheDocument();
  });

  it("uses one letter for a single-word name", () => {
    render(<AvatarGroup avatars={[{ name: "cher" }]} />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("omits the overflow when everyone fits", () => {
    const { container } = render(<AvatarGroup avatars={PEOPLE.slice(0, 3)} />);
    expect(container.querySelector('[data-slot="avatar-group-overflow"]')).toBeNull();
  });

  it("clamps a negative max to zero, showing only the count", () => {
    render(<AvatarGroup avatars={PEOPLE} max={-1} />);
    expect(screen.getByText("+6")).toBeInTheDocument();
  });

  it("renders linked avatars as focusable links", async () => {
    const user = userEvent.setup();
    render(<AvatarGroup avatars={PEOPLE} />);
    const link = screen.getByRole("link", { name: "Ada Lovelace" });
    expect(link).toHaveAttribute("href", "/people/ada");
    await user.tab();
    expect(link).toHaveFocus();
    expect(link.className).toContain("focus-visible:ring-2");
  });

  it("stacks the first avatar on top and staggers the spread through the motion scale", () => {
    const { container } = render(<AvatarGroup avatars={PEOPLE} max={3} />);
    const items = container.querySelectorAll<HTMLElement>("li");
    expect(items[0]?.style.zIndex).toBe("4");
    expect(items[3]?.style.zIndex).toBe("1");
    expect(items[2]?.style.transitionDelay).toBe("calc(60ms * var(--motion-scale, 1))");
  });

  it("sets size and overlap as custom properties", () => {
    render(<AvatarGroup avatars={PEOPLE} size="xl" overlap={0.5} data-testid="group" />);
    const group = screen.getByTestId("group");
    expect(group.style.getPropertyValue("--avatar-group-size")).toBe("4rem");
    expect(group.style.getPropertyValue("--avatar-group-overlap")).toBe("0.5");
  });

  it("spreads on hover and focus by default, and not when expand is none", () => {
    const { rerender } = render(<AvatarGroup avatars={PEOPLE} data-testid="group" />);
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-expand", "hover");
    expect(group.className).toContain("hover:[--avatar-group-offset:0.25rem]");
    expect(group.querySelector("li")?.className).toContain(
      "group-hover/avatar-group:scale-105",
    );

    rerender(<AvatarGroup avatars={PEOPLE} expand="none" data-testid="group" />);
    expect(group.className).not.toContain("hover:[--avatar-group-offset");
    expect(group.querySelector("li")?.className).not.toContain("scale-105");
  });

  it("accepts a custom overflow label", () => {
    render(<AvatarGroup avatars={PEOPLE} overflowLabel={(n) => `plus ${String(n)} others`} />);
    expect(screen.getByText("plus 2 others")).toBeInTheDocument();
  });

  it("lets a consumer className win and merges style", () => {
    render(
      <AvatarGroup
        avatars={PEOPLE}
        className="items-start"
        style={{ opacity: 0.5 }}
        data-testid="group"
      />,
    );
    const group = screen.getByTestId("group");
    expect(group).toHaveClass("items-start");
    expect(group).not.toHaveClass("items-center");
    expect(group.style.opacity).toBe("0.5");
  });

  it("forwards a ref", () => {
    const ref = createRef<HTMLUListElement>();
    render(<AvatarGroup ref={ref} avatars={PEOPLE} />);
    expect(ref.current).toBe(screen.getByRole("list"));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<AvatarGroup aria-label="Team" avatars={PEOPLE} />);
    await expectNoA11yViolations(container);
  });
});
