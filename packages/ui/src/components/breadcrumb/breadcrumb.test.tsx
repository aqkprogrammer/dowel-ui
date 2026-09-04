import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

function Trail() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Settings</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("is a named navigation landmark", () => {
    render(<Trail />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("is an ordered list, because the order is the meaning", () => {
    render(<Trail />);
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("does not make the current page a link", () => {
    render(<Trail />);

    // A link to the page you are already on does nothing, and in a list of
    // links it is indistinguishable from the ones that go somewhere.
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.getByText("Settings").tagName).toBe("SPAN");
  });

  it("marks the current page so it is not only bolder", () => {
    render(<Trail />);
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
  });

  it("links every ancestor", () => {
    render(<Trail />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  });

  it("hides the separators, so they are not read as punctuation", () => {
    const { container } = render(<Trail />);

    const separators = container.querySelectorAll('[data-slot="breadcrumb-separator"]');
    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    }

    // "Home slash Projects slash Settings" is the design leaking into content.
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(3);
  });

  it("takes a custom separator without exposing it either", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const separator = container.querySelector('[data-slot="breadcrumb-separator"]');
    expect(separator).toHaveTextContent("/");
    expect(separator).toHaveAttribute("aria-hidden", "true");
  });

  it("names the ellipsis, because it is content rather than decoration", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // A bare "…" announces as nothing at all.
    expect(screen.getByText("Intermediate levels")).toBeInTheDocument();
  });

  it("renders a router's own link through asChild", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/custom" data-router="yes">
                Home
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("data-router", "yes");
    expect(link).toHaveAttribute("href", "/custom");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Trail />);
    await expectNoA11yViolations(container);
  });
});
