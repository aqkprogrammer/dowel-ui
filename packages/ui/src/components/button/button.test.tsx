import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children inside a button element", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("applies the default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary");
    expect(button).toHaveClass("h-9");
  });

  it.each([
    ["secondary", "bg-secondary"],
    ["outline", "border-input"],
    ["ghost", "hover:bg-accent"],
    ["destructive", "bg-destructive"],
    ["link", "underline-offset-4"],
  ] as const)("applies the %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>Action</Button>);
    expect(screen.getByRole("button")).toHaveClass(expectedClass);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
    ["icon", "size-9"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    render(
      <Button size={size} aria-label="Action">
        A
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveClass(expectedClass);
  });

  it("drops box sizing for the link variant so it aligns with surrounding text", () => {
    render(
      <Button variant="link" size="md">
        Read more
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-auto");
    expect(button).not.toHaveClass("h-9");
  });

  it("lets a consumer className override a conflicting variant utility", () => {
    render(<Button className="h-20 bg-card">Tall</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-20", "bg-card");
    expect(button).not.toHaveClass("h-9");
    expect(button).not.toHaveClass("bg-primary");
  });

  it("forwards a ref to the underlying element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("forwards arbitrary props", () => {
    render(
      <Button type="submit" data-testid="submit">
        Submit
      </Button>,
    );
    expect(screen.getByTestId("submit")).toHaveAttribute("type", "submit");
  });

  it("calls onClick when activated with a pointer", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Enter and Space from the keyboard", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  describe("disabled", () => {
    it("sets the disabled attribute and blocks activation", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button disabled onClick={onClick}>
          Save
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("loading", () => {
    it("exposes a busy, disabled state to assistive technology", () => {
      render(<Button loading>Save</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("renders a spinner alongside the label", () => {
      const { container } = render(<Button loading>Save</Button>);
      expect(container.querySelector("svg")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("blocks activation", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );

      await user.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("scales the spinner with the button size", () => {
      const { container: large } = render(
        <Button loading size="lg">
          Save
        </Button>,
      );
      expect(large.querySelector("svg")).toHaveClass("size-5");

      const { container: small } = render(
        <Button loading size="sm">
          Save
        </Button>,
      );
      expect(small.querySelector("svg")).toHaveClass("size-3.5");
    });

    it("stays focusable, so the user's keyboard position is not lost", async () => {
      const user = userEvent.setup();
      render(<Button loading>Save</Button>);

      await user.tab();
      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("does not submit the form it belongs to", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading>
            Save
          </Button>
        </form>,
      );

      await user.click(screen.getByRole("button"));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("asChild", () => {
    it("renders the child element instead of a button", () => {
      render(
        <Button asChild>
          <a href="/pricing">Pricing</a>
        </Button>,
      );

      const link = screen.getByRole("link", { name: "Pricing" });
      expect(link).toHaveAttribute("href", "/pricing");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("passes its styles down to the child", () => {
      render(
        <Button asChild variant="destructive">
          <a href="/delete">Delete</a>
        </Button>,
      );
      expect(screen.getByRole("link")).toHaveClass("bg-destructive");
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button variant="outline" loading>
          Loading
        </Button>
        <Button size="icon" aria-label="Close">
          x
        </Button>
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
