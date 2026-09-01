import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("renders every part", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Projects group your deployments.</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByText("Projects group your deployments.")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders the title as a level 3 heading by default", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Title");
  });

  it("exposes slot attributes for styling hooks", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(container.querySelector("[data-slot='card']")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='card-header']")).toBeInTheDocument();
  });

  it("merges a consumer className on every part", () => {
    const { container } = render(<Card className="max-w-sm">Content</Card>);
    const card = container.querySelector("[data-slot='card']");
    expect(card).toHaveClass("max-w-sm", "bg-card");
  });

  it("forwards arbitrary props", () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Projects group your deployments.</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    await expectNoA11yViolations(container);
  });
});
