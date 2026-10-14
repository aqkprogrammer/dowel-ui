import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Globe, type GlobeArc, type GlobeMarker } from "./globe";
import {
  facing,
  fibonacciSphere,
  greatCircle,
  rotate,
  rotation,
  toLatLng,
  toVector,
} from "./globe-math";

const markers: GlobeMarker[] = [
  { label: "London", lat: 51.5, lng: -0.1 },
  { label: "New York", lat: 40.7, lng: -74 },
  { label: "Singapore", lat: 1.35, lng: 103.8 },
];
const arcs: GlobeArc[] = [
  { from: markers[0] as GlobeMarker, to: markers[1] as GlobeMarker },
  {
    from: markers[0] as GlobeMarker,
    to: markers[2] as GlobeMarker,
    label: "London–Singapore cable",
  },
];

describe("globe math", () => {
  it("round-trips latitude and longitude through the sphere", () => {
    const back = toLatLng(toVector({ lat: 35.7, lng: 139.7 }));
    expect(back.lat).toBeCloseTo(35.7);
    expect(back.lng).toBeCloseTo(139.7);
    expect(toVector({ lat: 0, lng: 0 })).toEqual([0, 0, 1]);
    expect(toVector({ lat: 90, lng: 0 })[1]).toBeCloseTo(1);
  });

  it("spreads dots evenly over the sphere", () => {
    const points = fibonacciSphere(2000);
    expect(points).toHaveLength(2000);
    const north = points.filter((p) => p.lat > 0).length;
    expect(Math.abs(north - 1000)).toBeLessThan(5);
  });

  it("arcs between two places along a great circle, lifted in the middle", () => {
    const path = greatCircle({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }, 10, 0.4);
    expect(path).toHaveLength(11);
    expect(path[0]?.[2]).toBeCloseTo(1);
    expect(path[10]?.[0]).toBeCloseTo(1);
    const middle = path[5] ?? [0, 0, 0];
    expect(Math.hypot(...middle)).toBeCloseTo(1 + 0.4 * 0.5);
  });

  it("turns a place to face the viewer", () => {
    const tokyo = { lat: 35.7, lng: 139.7 };
    const { yaw, pitch } = facing(tokyo);
    const [x, y, z] = rotate(rotation(yaw, pitch), toVector(tokyo));
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });
});

describe("Globe", () => {
  beforeEach(() => {
    // No WebGL here, as in a browser without it.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every place and route for screen readers inside a named region", async () => {
    const { container } = render(<Globe label="Our regions" markers={markers} arcs={arcs} />);
    const region = screen.getByRole("region", { name: "Our regions" });
    expect(region).toHaveAttribute("tabindex", "0");
    const places = within(region).getByRole("list", { name: "Places" });
    expect(
      within(places)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["London", "New York", "Singapore"]);
    const routes = within(region).getByRole("list", { name: "Routes" });
    expect(
      within(routes)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["London to New York", "London–Singapore cable"]);
    await expectNoA11yViolations(container);
  });

  it("stands in an SVG of the same view without WebGL, showing the places that face the viewer", () => {
    const { container } = render(
      <Globe label="Regions" markers={markers} center={{ lat: 45, lng: -40 }} />,
    );
    expect(container.querySelector('[data-slot="globe-canvas"]')).toBeNull();
    const svg = container.querySelector('[data-slot="globe-fallback"]');
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // London and New York face the viewer from mid-Atlantic; Singapore is round the back.
    expect(svg?.querySelectorAll("circle")).toHaveLength(1 + 2);
  });
});
