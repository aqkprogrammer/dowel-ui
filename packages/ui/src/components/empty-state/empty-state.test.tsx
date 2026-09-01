import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "./empty-state";

describe("EmptyState", () => {
  it("renders its parts", () => {
    render(
      <EmptyState>
        <EmptyStateIcon>
          <svg />
        </EmptyStateIcon>
        <EmptyStateTitle>No projects yet</EmptyStateTitle>
        <EmptyStateDescription>Create one to get started.</EmptyStateDescription>
        <EmptyStateActions>
          <Button>New project</Button>
        </EmptyStateActions>
      </EmptyState>,
    );

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByText("Create one to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("hides the icon from assistive technology", () => {
    const { container } = render(
      <EmptyState>
        <EmptyStateIcon>
          <svg />
        </EmptyStateIcon>
        <EmptyStateTitle>Nothing here</EmptyStateTitle>
      </EmptyState>,
    );

    expect(container.querySelector("[data-slot='empty-state-icon']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it.each([
    ["sm", "py-8"],
    ["md", "py-12"],
    ["lg", "py-20"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(
      <EmptyState size={size}>
        <EmptyStateTitle>Nothing</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.firstElementChild).toHaveClass(expectedClass);
  });

  it("can render a dashed border", () => {
    const { container } = render(
      <EmptyState bordered>
        <EmptyStateTitle>Nothing</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.firstElementChild).toHaveClass("border-dashed");
  });

  it("lets a consumer className override a conflicting utility", () => {
    const { container } = render(
      <EmptyState className="py-2">
        <EmptyStateTitle>Nothing</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.firstElementChild).toHaveClass("py-2");
    expect(container.firstElementChild).not.toHaveClass("py-12");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EmptyState bordered>
        <EmptyStateIcon>
          <svg />
        </EmptyStateIcon>
        <EmptyStateTitle>No results</EmptyStateTitle>
        <EmptyStateDescription>Try a different search.</EmptyStateDescription>
        <EmptyStateActions>
          <Button variant="outline">Clear filters</Button>
        </EmptyStateActions>
      </EmptyState>,
    );
    await expectNoA11yViolations(container);
  });
});
