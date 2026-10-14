import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ModelViewer } from "./model-viewer";

// Counts any attempt to load three.js: without WebGL there should be none.
const imported = vi.hoisted(() => ({ count: 0 }));
vi.mock("three", () => {
  imported.count += 1;
  return {};
});
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => {
  imported.count += 1;
  return {};
});

describe("ModelViewer", () => {
  beforeEach(() => {
    imported.count = 0;
    // No WebGL here, as in a browser without it.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the poster with its alt text, and says the picture stands in without WebGL", async () => {
    const { container } = render(
      <ModelViewer src="/chair.glb" poster="/chair.png" alt="An oak chair with a woven seat" />,
    );
    expect(screen.getByRole("img", { name: "An oak chair with a woven seat" })).toHaveAttribute(
      "src",
      "/chair.png",
    );
    expect(
      await screen.findByText(/3D isn't available here — showing a picture instead/),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3D isn't available in this browser");
    expect(container.firstElementChild).toHaveAttribute("data-phase", "unsupported");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("never fetches three.js without WebGL", async () => {
    render(<ModelViewer src="/chair.glb" alt="A chair" />);
    await screen.findByText(/3D isn't available here/);
    expect(imported.count).toBe(0);
  });

  it("waits to be asked with reveal=interaction", async () => {
    const { container } = render(
      <ModelViewer src="/chair.glb" poster="/chair.png" alt="A chair" reveal="interaction" />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-phase", "poster");
    expect(screen.queryByText(/isn't available/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View in 3D" }));
    expect(await screen.findByText(/3D isn't available here/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View in 3D" })).not.toBeInTheDocument();
  });

  it("keeps the alt text for screen readers without a poster", () => {
    render(<ModelViewer src="/chair.glb" alt="A chair" reveal="interaction" />);
    expect(screen.getByText("A chair")).toHaveClass("sr-only");
  });
});
