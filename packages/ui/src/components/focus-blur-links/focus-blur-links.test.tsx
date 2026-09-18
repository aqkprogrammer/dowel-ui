import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FocusBlurLink, FocusBlurLinks, type FocusBlurLinksProps } from "./focus-blur-links";

function Row(props: Partial<FocusBlurLinksProps>) {
  return (
    <FocusBlurLinks {...props}>
      <FocusBlurLink href="/x">@X</FocusBlurLink>
      <FocusBlurLink href="/threads">@Threads</FocusBlurLink>
      <FocusBlurLink href="/github">@GitHub</FocusBlurLink>
    </FocusBlurLinks>
  );
}

function states() {
  return screen.getAllByRole("link").map((link) => link.getAttribute("data-state"));
}

describe("FocusBlurLinks", () => {
  it("renders real links with their hrefs", () => {
    render(<Row />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(screen.getByRole("link", { name: "@Threads" })).toHaveAttribute("href", "/threads");
    expect(states()).toEqual(["idle", "idle", "idle"]);
  });

  it("emphasises the hovered link and dims the others", async () => {
    const user = userEvent.setup();
    const { container } = render(<Row />);
    await user.hover(screen.getByRole("link", { name: "@Threads" }));
    expect(states()).toEqual(["dimmed", "active", "dimmed"]);
    expect(container.firstElementChild).toHaveAttribute("data-state", "focused");

    await user.unhover(screen.getByRole("link", { name: "@Threads" }));
    expect(states()).toEqual(["idle", "idle", "idle"]);
    expect(container.firstElementChild).toHaveAttribute("data-state", "idle");
  });

  it("gives keyboard focus the same effect as hover", async () => {
    const user = userEvent.setup();
    render(<Row />);
    await user.tab();
    expect(states()).toEqual(["active", "dimmed", "dimmed"]);
    await user.tab();
    expect(states()).toEqual(["dimmed", "active", "dimmed"]);
    await user.tab();
    await user.tab();
    expect(states()).toEqual(["idle", "idle", "idle"]);
  });

  it("lets the pointer take precedence, and falls back to the focused link", async () => {
    const user = userEvent.setup();
    render(<Row />);
    await user.tab();
    await user.hover(screen.getByRole("link", { name: "@GitHub" }));
    expect(states()).toEqual(["dimmed", "dimmed", "active"]);
    await user.unhover(screen.getByRole("link", { name: "@GitHub" }));
    expect(states()).toEqual(["active", "dimmed", "dimmed"]);
  });

  it("does not hold the effect after a click once the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<Row />);
    const link = screen.getByRole("link", { name: "@X" });
    link.addEventListener("click", (event) => {
      event.preventDefault();
    });
    await user.click(link);
    expect(link).toHaveFocus();
    await user.unhover(link);
    expect(states()).toEqual(["idle", "idle", "idle"]);
  });

  it("carries blur and opacity as custom properties", () => {
    const { container } = render(<Row blurAmount={6} dimOpacity={0.25} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--focus-blur-amount")).toBe("6px");
    expect(root.style.getPropertyValue("--focus-blur-opacity")).toBe("0.25");
    expect(screen.getAllByRole("link")[0]).toHaveClass(
      "data-[state=dimmed]:blur-[var(--focus-blur-amount)]",
    );
  });

  it("draws brackets by default, decoratively, and omits them on request", () => {
    const { container, rerender } = render(<Row />);
    const brackets = container.querySelectorAll('[data-slot="focus-blur-bracket"]');
    expect(brackets).toHaveLength(3);
    expect(brackets[0]).toHaveAttribute("aria-hidden", "true");

    rerender(<Row showBrackets={false} />);
    expect(container.querySelector('[data-slot="focus-blur-bracket"]')).toBeNull();
  });

  it.each([
    ["sm", "text-sm"],
    ["md", "text-lg"],
    ["lg", "text-2xl"],
  ] as const)("applies the %s size", (size, expected) => {
    const { container } = render(<Row size={size} />);
    expect(container.firstElementChild).toHaveClass(expected);
  });

  it("renders a consumer link element with asChild", async () => {
    const user = userEvent.setup();
    render(
      <FocusBlurLinks>
        <FocusBlurLink asChild>
          <a href="/docs" data-router="true">
            Docs
          </a>
        </FocusBlurLink>
        <FocusBlurLink href="/blog">Blog</FocusBlurLink>
      </FocusBlurLinks>,
    );
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("data-router", "true");
    expect(docs.querySelector('[data-slot="focus-blur-bracket"]')).toBeInTheDocument();
    await user.hover(docs);
    expect(docs).toHaveAttribute("data-state", "active");
  });

  it("passes consumer handlers through", async () => {
    const handlers = {
      onPointerEnter: vi.fn(),
      onPointerLeave: vi.fn(),
      onPointerDown: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <FocusBlurLinks>
        <FocusBlurLink href="#a" {...handlers}>
          A
        </FocusBlurLink>
      </FocusBlurLinks>,
    );
    const link = screen.getByRole("link");
    await user.click(link);
    await user.unhover(link);
    await user.tab();
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });

  it("throws when a link is used outside the row", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<FocusBlurLink href="#">Orphan</FocusBlurLink>)).toThrow(
      /inside FocusBlurLinks/,
    );
    vi.restoreAllMocks();
  });

  it("lets consumer classNames override conflicting utilities", () => {
    const { container } = render(
      <FocusBlurLinks className="gap-2">
        <FocusBlurLink href="#" className="rounded-none">
          A
        </FocusBlurLink>
      </FocusBlurLinks>,
    );
    expect(container.firstElementChild).toHaveClass("gap-2");
    expect(container.firstElementChild).not.toHaveClass("gap-6");
    expect(screen.getByRole("link")).toHaveClass("rounded-none");
    expect(screen.getByRole("link")).not.toHaveClass("rounded-sm");
  });

  it("forwards refs to the root and to each link", () => {
    const rootRef = createRef<HTMLDivElement>();
    const linkRef = createRef<HTMLAnchorElement>();
    render(
      <FocusBlurLinks ref={rootRef} data-testid="row">
        <FocusBlurLink ref={linkRef} href="#">
          A
        </FocusBlurLink>
      </FocusBlurLinks>,
    );
    expect(rootRef.current).toBe(screen.getByTestId("row"));
    expect(linkRef.current).toBe(screen.getByRole("link"));
  });

  it("has no accessibility violations, idle or focused", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <nav aria-label="Social">
        <Row />
      </nav>,
    );
    await expectNoA11yViolations(container);
    await user.tab();
    await expectNoA11yViolations(container);
  });
});
