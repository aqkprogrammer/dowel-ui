import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

function Example({ animated }: { animated?: boolean }) {
  return (
    <Breadcrumb>
      <BreadcrumbList animated={animated} data-testid="list">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Settings</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function stylesheet() {
  return document.querySelector<HTMLStyleElement>('style[data-href="dowel-breadcrumb"]');
}

describe("Breadcrumb motion", () => {
  it("is still by default", () => {
    render(<Example />);
    expect(screen.getByTestId("list")).not.toHaveAttribute("data-animated");
  });

  it("staggers its entries in when animated", () => {
    render(<Example animated />);
    expect(screen.getByTestId("list")).toHaveAttribute("data-animated", "true");

    const css = stylesheet()?.textContent ?? "";
    expect(css).toContain(
      "[data-slot=breadcrumb-list][data-animated]>li{animation:dowel-breadcrumb-in",
    );
    expect(css).toContain(
      "[data-slot=breadcrumb-list][data-animated]>li:nth-child(2){animation-delay:calc(40ms * var(--motion-scale))}",
    );
    expect(document.querySelectorAll('style[data-href="dowel-breadcrumb"]')).toHaveLength(1);
  });

  it("slides from the inline start, mirrored in RTL", () => {
    render(<Example animated />);
    const css = stylesheet()?.textContent ?? "";
    expect(css).toContain("translateX(calc(-4px * var(--dowel-breadcrumb-inline,1)))");
    expect(css).toContain("[data-slot=breadcrumb-list]:dir(rtl){--dowel-breadcrumb-inline:-1}");
    expect(css).toContain("[dir=rtl] [data-slot=breadcrumb-list]");
  });

  it("scales every duration and delay by --motion-scale, so reduced motion settles instantly", () => {
    render(<Example animated />);
    const timings = (stylesheet()?.textContent ?? "").match(/calc\(\d[^)]*\)/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) expect(timing).toContain("var(--motion-scale)");
  });

  it("keeps the semantics: current page, hidden separators, a named nav", async () => {
    const { container } = render(<Example animated />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
