import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LogoCloudSimpleBlock } from "./logo-cloud-simple";

describe("LogoCloudSimpleBlock", () => {
  it("is a section named by its heading", () => {
    render(<LogoCloudSimpleBlock />);
    expect(screen.getByRole("region", { name: "You're in good company" })).toBeVisible();
  });

  it("draws placeholder wordmarks by default", () => {
    render(<LogoCloudSimpleBlock />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Meridian")).toBeVisible();
  });

  it("names a supplied logo once and hides the graphic", () => {
    const { container } = render(
      <LogoCloudSimpleBlock logos={[{ name: "Example", logo: <svg data-testid="mark" /> }]} />,
    );
    expect(screen.getByText("Example")).toHaveClass("sr-only");
    expect(screen.getByTestId("mark").closest("[aria-hidden=true]")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(1);
  });

  it("links an entry that has an href", () => {
    render(
      <LogoCloudSimpleBlock
        logos={[{ name: "Example", href: "https://example.com" }, { name: "Plain" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.queryByRole("link", { name: "Plain" })).toBeNull();
  });

  it("re-levels its heading and takes copy from props", () => {
    render(<LogoCloudSimpleBlock heading="Customers" description={null} headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Customers" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(<LogoCloudSimpleBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-5xl");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <LogoCloudSimpleBlock logos={[{ name: "Example", href: "#" }, { name: "Plain" }]} />,
    );
    await expectNoA11yViolations(container);
  });
});
