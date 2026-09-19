import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AppStack, type AppStackItem } from "./app-stack";

const APPS: AppStackItem[] = [
  { id: "code", name: "Code", icon: "/code.png" },
  { id: "design", name: "Design", icon: <svg data-testid="design-icon" /> },
  { id: "browse", name: "Browse", icon: "/browse.png" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const trigger = () => screen.getByRole("button", { name: "Choose from Starter kit" });

describe("AppStack", () => {
  it("renders a collapsed stack button with decorative icons", () => {
    const { container } = render(<AppStack apps={APPS} title="Starter kit" />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByTestId("design-icon")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="app-stack-float"]')[1]).toHaveStyle({
      "--app-stack-delay": "calc(200ms * var(--motion-scale, 1))",
    });
  });

  it("opens into toggles, moving focus to the header, and closes back to the stack", async () => {
    const user = userEvent.setup();
    render(<AppStack apps={APPS} title="Starter kit" />);
    await user.click(trigger());
    const header = screen.getByRole("button", { name: /Starter kit/ });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(header).toHaveFocus();
    expect(screen.getByRole("button", { name: "Code", pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download selected" })).toBeDisabled();

    await user.click(header);
    expect(trigger()).toHaveFocus();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<AppStack apps={APPS} title="Starter kit" />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
  });

  it("toggles apps cumulatively and counts the selection", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<AppStack apps={APPS} defaultExpanded onSelectedChange={onSelectedChange} />);
    await user.click(screen.getByRole("button", { name: "Code" }));
    await user.click(screen.getByRole("button", { name: "Design" }));
    expect(onSelectedChange).toHaveBeenLastCalledWith(["code", "design"]);
    await user.click(screen.getByRole("button", { name: "Code" }));
    expect(onSelectedChange).toHaveBeenLastCalledWith(["design"]);
    expect(screen.getByRole("button", { name: "Design" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Apps/ })).toHaveTextContent("1 selected");
    expect(screen.getByRole("button", { name: "Download selected" })).toBeEnabled();
  });

  it("supports controlled expanded and selected", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    function Controlled() {
      const [selected, setSelected] = useState<string[]>(["browse"]);
      return (
        <AppStack
          apps={APPS}
          expanded
          onExpandedChange={onExpandedChange}
          selected={selected}
          onSelectedChange={setSelected}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("button", { name: "Browse" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Design" }));
    expect(screen.getByRole("button", { name: "Design" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /Apps/ }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    // Still open: the parent decides.
    expect(screen.getByRole("button", { name: "Design" })).toBeInTheDocument();
  });

  it("shows progress while the download promise is pending, then completes and resets", async () => {
    let resolve: () => void = () => {};
    const onDownload = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    const user = userEvent.setup();
    const { container } = render(
      <AppStack
        apps={APPS}
        title="Starter kit"
        defaultExpanded
        onDownload={onDownload}
        resetAfter={50}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Code" }));
    await user.click(screen.getByRole("button", { name: "Download selected" }));

    expect(onDownload).toHaveBeenCalledWith(["code"]);
    expect(screen.getByRole("status")).toHaveTextContent("Downloading…");
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
    expect(trigger()).toHaveFocus();
    expect(container.querySelector('[data-slot="app-stack-shine"]')).toBeInTheDocument();

    await user.click(trigger());
    expect(screen.queryByRole("button", { name: "Code" })).toBeNull();

    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Download complete");
    expect(container.firstElementChild).toHaveAttribute("data-status", "complete");

    await act(async () => {
      await new Promise((done) => setTimeout(done, 60));
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(trigger()).not.toHaveAttribute("aria-disabled");
    await user.click(trigger());
    expect(screen.getByRole("button", { name: "Code" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("announces a failed download and keeps the selection", async () => {
    const user = userEvent.setup();
    render(
      <AppStack
        apps={APPS}
        title="Starter kit"
        defaultExpanded
        defaultSelected={["design"]}
        onDownload={() => Promise.reject(new Error("offline"))}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Download selected" }));
    expect(await screen.findByText("Download failed")).toBeInTheDocument();
    await user.click(trigger());
    expect(screen.getByRole("button", { name: "Design" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("completes without an onDownload handler, and ignores results after unmount", async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const { unmount } = render(
      <AppStack
        apps={APPS}
        defaultExpanded
        defaultSelected={["code"]}
        onDownload={() => new Promise<void>((done) => (resolve = done))}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Download selected" }));
    unmount();
    await act(async () => {
      resolve();
      await Promise.resolve();
    });

    render(<AppStack apps={APPS} defaultExpanded defaultSelected={["code"]} />);
    await user.click(screen.getByRole("button", { name: "Download selected" }));
    expect(await screen.findByText("Download complete")).toBeInTheDocument();
  });

  it("uses custom labels", async () => {
    const user = userEvent.setup();
    render(
      <AppStack
        apps={APPS}
        triggerLabel="Pick apps"
        downloadLabel="Install"
        defaultSelected={["code"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Pick apps" }));
    expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
  });

  it("lets a consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AppStack ref={ref} apps={APPS} className="gap-8" />);
    expect(ref.current).toHaveClass("gap-8");
    expect(ref.current).not.toHaveClass("gap-3");
  });

  it("has no accessibility violations collapsed or open", async () => {
    const { container, rerender } = render(<AppStack apps={APPS} />);
    await expectNoA11yViolations(container);
    rerender(<AppStack apps={APPS} expanded defaultSelected={["code"]} />);
    await expectNoA11yViolations(container);
  });
});
