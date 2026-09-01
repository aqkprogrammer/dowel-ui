import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

describe("Avatar", () => {
  it("shows the fallback while the image has not loaded", async () => {
    render(
      <Avatar>
        <AvatarImage src="/nope.png" alt="Ada Lovelace" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );

    await waitFor(() => {
      expect(screen.getByText("AL")).toBeInTheDocument();
    });
  });

  it("renders the fallback alone when there is no image", () => {
    render(
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it.each([
    ["xs", "size-6"],
    ["sm", "size-8"],
    ["md", "size-10"],
    ["lg", "size-12"],
    ["xl", "size-16"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    render(
      <Avatar size={size} data-testid="avatar">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toHaveClass(expectedClass);
  });

  it("lets a consumer className override the size", () => {
    render(
      <Avatar className="size-24" data-testid="avatar">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass("size-24");
    expect(avatar).not.toHaveClass("size-10");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    await expectNoA11yViolations(container);
  });
});
