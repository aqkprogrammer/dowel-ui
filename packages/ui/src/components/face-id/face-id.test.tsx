import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FaceId } from "./face-id";

describe("FaceId", () => {
  it("is a status named by its caption", () => {
    render(<FaceId />);
    expect(screen.getByRole("status")).toHaveTextContent("Face ID");
  });

  it("follows the status it is given", () => {
    const { rerender } = render(<FaceId status="scanning" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-status", "scanning");
    expect(status).toHaveTextContent("Scanning");

    rerender(<FaceId status="success" />);
    expect(status).toHaveTextContent("Unlocked");
    rerender(<FaceId status="error" />);
    expect(status).toHaveTextContent("Not recognized");
  });

  it("accepts custom labels", () => {
    render(<FaceId status="success" labels={{ success: "Welcome back" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Welcome back");
  });

  it("keeps a hidden label announced", () => {
    render(<FaceId status="scanning" hideLabel />);
    expect(screen.getByText("Scanning")).toHaveClass("sr-only");
  });

  it("hides the glyph from assistive technology", () => {
    render(<FaceId />);
    expect(screen.getByRole("status").querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("scales its motion through --motion-scale", () => {
    render(<FaceId />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("var(--motion-scale, 1)");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FaceId ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("custom", "inline-flex");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FaceId status="scanning" />);
    await expectNoA11yViolations(container);
  });
});
