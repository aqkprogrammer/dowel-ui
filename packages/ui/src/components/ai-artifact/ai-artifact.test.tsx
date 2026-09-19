import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Artifact } from "./ai-artifact";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="artifact"]');
}

describe("Artifact", () => {
  it("is a group named by its title", () => {
    render(<Artifact title="utils.ts" preview={<p>rendered</p>} />);
    expect(screen.getByRole("group", { name: "utils.ts" })).toBeInTheDocument();
  });

  it("renders tabs only when both panes exist", () => {
    const { unmount } = render(<Artifact title="t" preview={<p>rendered</p>} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByText("rendered")).toBeInTheDocument();
    unmount();
    render(<Artifact title="t" code="source" preview={<p>rendered</p>} />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("makes a lone code pane a focusable named region", () => {
    render(<Artifact title="data.json" code="{}" />);
    const region = screen.getByRole("region", { name: "data.json" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveTextContent("{}");
  });

  it("switches panes by click and arrow keys, and only animates after a switch", async () => {
    const user = userEvent.setup();
    const onPaneChange = vi.fn();
    const { container } = render(
      <Artifact
        title="t"
        code="source"
        preview={<p>rendered</p>}
        onPaneChange={onPaneChange}
      />,
    );
    expect(root(container)).not.toHaveAttribute("data-switched");
    await user.click(screen.getByRole("tab", { name: "Code" }));
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("source");
    expect(onPaneChange).toHaveBeenLastCalledWith("code");
    expect(root(container)).toHaveAttribute("data-switched");
    expect(root(container)).toHaveAttribute("data-pane", "code");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("slides code in from the inline end and preview from the start", async () => {
    const user = userEvent.setup();
    render(<Artifact title="t" code="source" preview={<p>rendered</p>} />);
    await user.click(screen.getByRole("tab", { name: "Code" }));
    expect(screen.getByRole("tabpanel").style.getPropertyValue("--artifact-from")).toBe("24px");
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-ai-artifact-in{");
    expect(css).toContain(":dir(rtl){--artifact-dir:-1}");
    expect(css).toContain("var(--duration-normal)");
  });

  it("honours defaultPane, controlled pane and custom labels", () => {
    const { unmount } = render(
      <Artifact title="t" code="source" preview={<p>r</p>} defaultPane="code" />,
    );
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    unmount();
    render(
      <Artifact
        title="t"
        code="source"
        preview={<p>r</p>}
        pane="code"
        labels={{ code: "Source" }}
      />,
    );
    expect(screen.getByRole("tab", { name: "Source" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("falls back to the pane it has", () => {
    render(<Artifact title="t" preview={<p>only</p>} defaultPane="code" />);
    expect(screen.getByText("only")).toBeInTheDocument();
  });

  it("copies through Copy Button, and hides it without a value", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(
      <Artifact title="t" code="source" copyValue="source" actions={<span>extra</span>} />,
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("source");
    await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
    expect(screen.getByText("extra")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("has no copy action without copyValue", () => {
    render(<Artifact title="t" preview={<p>r</p>} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Artifact
        ref={ref}
        title="t"
        code="c"
        preview="p"
        className="rounded-none"
        data-testid="a"
      />,
    );
    expect(root(container)).toHaveClass("rounded-none");
    expect(root(container)).not.toHaveClass("rounded-xl");
    expect(ref.current).toBe(root(container));
    expect(screen.getByTestId("a")).toBe(root(container));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Artifact title="utils.ts" code="source" preview={<p>rendered</p>} copyValue="source" />
        <Artifact title="data.json" code="{}" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
