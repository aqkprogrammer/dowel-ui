import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LogoGridTooltipsBlock } from "./logo-grid-tooltips";

const LINKED = [
  { name: "Example", href: "https://example.com", logo: <svg data-testid="mark" /> },
  { name: "Plain" },
];

function list(container: HTMLElement) {
  return container.querySelector("[data-slot=logo-grid-tooltips-list]") as HTMLElement;
}

describe("LogoGridTooltipsBlock", () => {
  it("is a section named by its heading, with a list of logos", () => {
    render(<LogoGridTooltipsBlock />);
    expect(
      screen.getByRole("region", { name: "Trusted by innovative companies" }),
    ).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("names a supplied logo and hides the graphic", () => {
    render(<LogoGridTooltipsBlock logos={LINKED} />);
    expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByTestId("mark").closest("[aria-hidden=true]")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Plain" })).toBeNull();
  });

  it("names a linked logo in a tooltip on keyboard focus", async () => {
    const user = userEvent.setup();
    render(<LogoGridTooltipsBlock logos={LINKED} />);
    await user.tab();
    expect(screen.getByRole("link", { name: "Example" })).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Example");
  });

  it("names a logo in a tooltip on hover", async () => {
    const user = userEvent.setup();
    render(<LogoGridTooltipsBlock logos={LINKED} />);
    await user.hover(screen.getByText("Plain"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Plain");
  });

  it("sets its column count", () => {
    const { container, rerender } = render(<LogoGridTooltipsBlock />);
    expect(list(container)).toHaveClass("sm:grid-cols-4");
    rerender(<LogoGridTooltipsBlock columns={6} />);
    expect(list(container)).toHaveClass("lg:grid-cols-6");
    rerender(<LogoGridTooltipsBlock columns={3} />);
    expect(list(container)).toHaveClass("sm:grid-cols-3");
  });

  it("re-levels its heading, lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(
      <LogoGridTooltipsBlock ref={ref} headingLevel={3} description={null} className="py-2" />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(ref.current).toHaveClass("py-2");
    expect(ref.current).not.toHaveClass("py-16");
  });

  it("has no axe violations", async () => {
    const { container } = render(<LogoGridTooltipsBlock logos={LINKED} />);
    await expectNoA11yViolations(container);
  });
});
