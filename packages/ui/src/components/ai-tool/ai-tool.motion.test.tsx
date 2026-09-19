import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Tool, ToolContent, ToolHeader, ToolPayload, type ToolStatus } from "./ai-tool";

const STATUSES: ToolStatus[] = ["pending", "running", "success", "error"];

function Ring({ status, summary }: { status: ToolStatus; summary?: string }) {
  return (
    <Tool status={status}>
      <ToolHeader name="search_web" status={status} indicator="ring" summary={summary} />
      <ToolContent>
        <ToolPayload label="Result">{"{}"}</ToolPayload>
      </ToolContent>
    </Tool>
  );
}

function ring(container: HTMLElement) {
  const svg = container.querySelector<SVGElement>("[data-slot='tool-ring']");
  if (!svg) throw new Error("no ring");
  return svg;
}

describe("ToolHeader indicator='ring'", () => {
  it("keeps exactly one circle, the same node, through the whole lifecycle", () => {
    const { container, rerender } = render(<Ring status="pending" />);
    const circle = container.querySelector("circle");
    for (const status of STATUSES) {
      rerender(<Ring status={status} />);
      expect(container.querySelectorAll("circle")).toHaveLength(1);
      expect(container.querySelector("circle")).toBe(circle);
      expect(ring(container)).toHaveAttribute("data-status", status);
    }
  });

  it("draws a check only on success and two cross strokes only on error", () => {
    const { container, rerender } = render(<Ring status="running" />);
    expect(container.querySelectorAll("[data-part='glyph']")).toHaveLength(0);

    rerender(<Ring status="success" />);
    const check = container.querySelectorAll("[data-part='glyph']");
    expect(check).toHaveLength(1);
    expect(check[0]).toHaveAttribute("d", "M 8.5 12.2 L 11 14.8 L 15.8 9.6");
    expect(check[0]).toHaveAttribute("pathLength", "1");

    rerender(<Ring status="error" />);
    const cross = container.querySelectorAll("[data-stroke='cross']");
    expect(cross).toHaveLength(2);
    expect(container.querySelector("[data-stroke='check']")).toBeNull();
  });

  it("changes tone with status and is hidden from assistive technology", () => {
    const { container, rerender } = render(<Ring status="running" />);
    expect(ring(container)).toHaveClass("text-info");
    expect(ring(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<Ring status="success" />);
    expect(ring(container)).toHaveClass("text-success");
    rerender(<Ring status="error" />);
    expect(ring(container)).toHaveClass("text-destructive");
  });

  it("spins only while running, and runs through --motion-scale", () => {
    render(<Ring status="running" />);
    const sheet = document.querySelector("style[data-href='dowel-ai-tool']")?.textContent ?? "";
    expect(sheet).toMatch(
      /\[data-slot=tool-ring\]\[data-status=running\] \[data-part=spin\]\{animation:dowel-ai-tool-ring-spin calc\(900ms \* var\(--motion-scale,1\)\)/,
    );
    expect(sheet).toContain("[data-slot=tool-ring][data-status=pending] [data-part=track]");
    expect(sheet).not.toContain("indicator");
  });

  it("keeps the status word visible for every status", () => {
    for (const status of STATUSES) {
      const { unmount } = render(<Ring status={status} />);
      const word = {
        pending: "Queued",
        running: "Running",
        success: "Completed",
        error: "Failed",
      }[status];
      expect(screen.getByText(word)).toBeVisible();
      expect(screen.getByRole("button")).toHaveAccessibleName(expect.stringContaining(word));
      unmount();
    }
  });

  it("lets an icon win over the ring", () => {
    const { container } = render(
      <Tool>
        <ToolHeader name="x" indicator="ring" icon={<span data-testid="custom" />} />
      </Tool>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='tool-ring']")).toBeNull();
  });

  it("keeps today's icons by default", () => {
    const { container } = render(
      <Tool status="success">
        <ToolHeader name="x" status="success" />
      </Tool>,
    );
    expect(container.querySelector("[data-slot='tool-ring']")).toBeNull();
    expect(container.querySelector("path[d='m5 13 4 4L19 7']")).not.toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Ring status="running" summary="3 sources" />);
    await expectNoA11yViolations(container);
  });
});

describe("ToolHeader summary", () => {
  it("renders before the status and takes over the push to the end", () => {
    const { container } = render(<Ring status="success" summary="1.2s" />);
    const summary = container.querySelector("[data-slot='tool-summary']");
    const status = container.querySelector("[data-slot='tool-status']");
    expect(summary).toHaveTextContent("1.2s");
    expect(summary).toHaveClass("ms-auto", "tabular-nums");
    expect(status).not.toHaveClass("ms-auto");
    expect(summary?.nextElementSibling).toBe(status);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      expect.stringMatching(/1\.2s\s*Completed/),
    );
  });

  it("leaves the layout as it was without one", () => {
    const { container } = render(<Ring status="success" />);
    expect(container.querySelector("[data-slot='tool-summary']")).toBeNull();
    expect(container.querySelector("[data-slot='tool-status']")).toHaveClass("ms-auto");
  });
});
