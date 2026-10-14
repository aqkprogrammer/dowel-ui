import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DeviceMockup } from "./device-mockup";

describe("DeviceMockup", () => {
  it("is a figure whose screen keeps its content and whose frame is decoration", async () => {
    const { container } = render(
      <DeviceMockup caption="The dashboard on a phone">
        <img src="/shot.png" alt="Revenue dashboard" />
      </DeviceMockup>,
    );
    // Browsers name a figure from its figcaption; jsdom does not, so check the structure.
    const figure = screen.getByRole("figure");
    expect(figure.querySelector("figcaption")).toHaveTextContent("The dashboard on a phone");
    expect(screen.getByRole("img", { name: "Revenue dashboard" })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    await expectNoA11yViolations(container);
  });

  it("draws each device, and the browser shows its address", () => {
    for (const device of ["phone", "tablet", "laptop", "browser"] as const) {
      const { container, unmount } = render(
        <DeviceMockup device={device} url="app.example.com" />,
      );
      expect(container.firstElementChild).toHaveAttribute("data-device", device);
      unmount();
    }
    render(<DeviceMockup device="browser" url="app.example.com" />);
    expect(screen.getByText("app.example.com")).toBeInTheDocument();
  });

  it("keeps live UI inside reachable", () => {
    render(
      <DeviceMockup device="laptop" tilt="left">
        <button type="button">Try it</button>
      </DeviceMockup>,
    );
    expect(screen.getByRole("button", { name: "Try it" })).toBeVisible();
  });

  it("tilts, and straightens on hover and focus", () => {
    const { container } = render(<DeviceMockup tilt="right" />);
    const turned = container.querySelector('[class*="rotateY(-18deg)"]');
    expect(turned).not.toBeNull();
    expect(turned?.className).toContain("group-focus-within/device:[transform:none]");
  });

  it("turns a tablet on its side", () => {
    const { container } = render(<DeviceMockup device="tablet" orientation="landscape" />);
    expect(container.querySelector(".aspect-\\[4\\/3\\]")).not.toBeNull();
  });
});
