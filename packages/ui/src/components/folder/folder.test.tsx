import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Folder } from "./folder";

function papers(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-slot="folder-paper"]'));
}

describe("Folder", () => {
  it("renders a collapsed button named by its label", () => {
    const { container } = render(<Folder label="Projects" />);
    const button = screen.getByRole("button", { name: "Projects" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("data-state", "closed");
    expect(container.querySelector('[data-slot="folder-art"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(papers(container)).toHaveLength(3);
  });

  it("defaults its name to Folder", () => {
    render(<Folder />);
    expect(screen.getByRole("button", { name: "Folder" })).toBeInTheDocument();
  });

  it("opens and closes on click", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Folder label="Projects" onOpenChange={onOpenChange} />);
    const button = screen.getByRole("button", { name: "Projects" });

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("data-state", "open");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("toggles with Enter and Space, and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Folder label="Projects" />);
    const button = screen.getByRole("button");
    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores Escape while closed and other keys while open", () => {
    const onOpenChange = vi.fn();
    render(<Folder defaultOpen onOpenChange={onOpenChange} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "a" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(button, { key: "Escape" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it("starts open without animating from closed", () => {
    render(<Folder defaultOpen />);
    expect(screen.getByRole("button")).toHaveAttribute("data-state", "open");
  });

  it("follows the controlled prop", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Folder label="Projects" open={open} onOpenChange={setOpen} />
          <output>{open ? "open" : "closed"}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Folder open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("respects a prevented click or keydown", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Folder
        defaultOpen
        onOpenChange={onOpenChange}
        onClick={(event) => {
          event.preventDefault();
        }}
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Folder disabled onOpenChange={onOpenChange} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("puts items on the sheets, back to front, and lines on the rest", () => {
    const { container } = render(
      <Folder
        items={[<span key="a">📁</span>, <img key="b" src="https://img.test/b.jpg" alt="" />]}
      />,
    );
    const [back, middle, front] = papers(container);
    expect(back).toHaveTextContent("📁");
    expect(middle?.querySelector("img")).not.toBeNull();
    expect(front?.textContent).toBe("");
    expect(front?.querySelectorAll(":scope > span > span")).toHaveLength(4);
  });

  it("keeps items out of the accessible name", () => {
    render(
      <Folder
        label="Photos"
        items={[<img key="a" src="https://img.test/a.jpg" alt="Beach" />]}
      />,
    );
    expect(screen.getByRole("button", { name: "Photos" })).toBeInTheDocument();
  });

  it("gives each sheet its three poses, mirrored by the direction flip", () => {
    const { container } = render(<Folder />);
    const back = papers(container)[0]!;
    expect(back.style.getPropertyValue("--folder-rest")).toBe(
      "translate(calc(-5% * var(--folder-flip, 1)), -1%) rotate(calc(-4deg * var(--folder-flip, 1)))",
    );
    expect(back.style.getPropertyValue("--folder-fan")).toContain("-15%");
    expect(back.style.getPropertyValue("--folder-lift")).toContain("-16deg");
    expect(back.style.getPropertyValue("--folder-delay-in")).toBe(
      "calc(0ms * var(--motion-scale, 1))",
    );
    expect(back.style.getPropertyValue("--folder-delay-out")).toBe(
      "calc(50ms * var(--motion-scale, 1))",
    );
  });

  it("hides the caption visually but keeps the name", () => {
    const { container } = render(<Folder label="Archive" hideLabel />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="folder-label"]')).toHaveClass("sr-only");
  });

  it.each([
    ["sm", "[--folder-scale:0.65]"],
    ["md", "[--folder-scale:1]"],
    ["lg", "[--folder-scale:1.35]"],
  ] as const)("scales the %s size", (size, className) => {
    render(<Folder size={size} />);
    expect(screen.getByRole("button")).toHaveClass(className);
  });

  it.each([
    [
      "neutral",
      "[--folder-front:color-mix(in_oklab,var(--color-muted-foreground)_24%,var(--color-muted))]",
    ],
    ["primary", "[--folder-front:var(--color-primary)]"],
    ["inverted", "[--folder-back:var(--color-foreground)]"],
  ] as const)("colours the %s tone from tokens", (tone, className) => {
    render(<Folder tone={tone} />);
    expect(screen.getByRole("button")).toHaveClass(className);
  });

  it("hoists one stylesheet", () => {
    render(
      <>
        <Folder label="A" />
        <Folder label="B" />
      </>,
    );
    const sheets = document.querySelectorAll("style[data-href='dowel-folder']");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.textContent).toContain("var(--ease-overshoot)");
    expect(sheets[0]?.textContent).toContain("var(--motion-scale,1)");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Folder
        ref={ref}
        className="rounded-none p-6"
        data-testid="folder"
        aria-controls="files"
        type="submit"
      />,
    );
    const button = screen.getByTestId("folder");
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("rounded-none", "p-6");
    expect(button).not.toHaveClass("rounded-2xl", "p-2");
    expect(button).toHaveAttribute("aria-controls", "files");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Folder
        label="Projects"
        items={[<img key="a" src="https://img.test/a.jpg" alt="Beach" />]}
      />,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});
