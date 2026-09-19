import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Book } from "./book";

function part(root: Element, slot: string) {
  return root.querySelector(`[data-slot="book-${slot}"]`);
}

describe("Book", () => {
  it("renders the title as text, with decorative 3D parts hidden", () => {
    const { container } = render(<Book title="The art of smooth interfaces" />);
    expect(screen.getByText("The art of smooth interfaces")).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(part(root, "pages")).toHaveAttribute("aria-hidden", "true");
    expect(part(root, "back")).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to the stripe variant and the tilt effect", () => {
    const { container } = render(<Book title="Stripe" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-effect", "tilt");
    expect(part(root, "body")?.className).toContain(
      "motion-safe:group-hover/book:[transform:rotateY(-20deg)_scale(1.066)_translateX(-8px)]",
    );
    expect(part(root, "body")?.className).toContain("motion-safe:group-focus-within/book:");
    expect(root.querySelector(".bg-card")).not.toBeNull();
    expect(part(root, "inside")).toBeNull();
  });

  it("takes the cover colour, text colour and width as custom properties", () => {
    const { container } = render(
      <Book
        title="Design Engineering Handbook"
        variant="simple"
        color="var(--color-info)"
        textColor="var(--color-background)"
        width={240}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--book-color")).toBe("var(--color-info)");
    expect(root.style.getPropertyValue("--book-text")).toBe("var(--color-background)");
    expect(root.style.getPropertyValue("--book-width")).toBe("240px");
  });

  it("uses tokens for the default colours", () => {
    const { container, rerender } = render(<Book title="A" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--book-color")).toBe("var(--color-primary)");
    expect(root.style.getPropertyValue("--book-text")).toBe("var(--color-foreground)");
    rerender(<Book title="A" variant="simple" />);
    expect(root.style.getPropertyValue("--book-text")).toBe("var(--color-primary-foreground)");
    expect(part(root, "back")).toHaveClass("bg-(--book-color)");
  });

  it("renders the illustration and logo slots", () => {
    render(
      <Book
        title="Illustrated"
        illustration={<span data-testid="art" />}
        logo={<span data-testid="logo" />}
      />,
    );
    expect(screen.getByTestId("art")).toBeInTheDocument();
    expect(screen.getByTestId("logo")).toBeInTheDocument();
  });

  it("renders a logo on the simple cover", () => {
    render(<Book title="Simple" variant="simple" logo={<span data-testid="logo" />} />);
    expect(screen.getByTestId("logo")).toBeInTheDocument();
  });

  it("opens to reveal its inside page with effect=open", () => {
    const { container } = render(
      <Book title="Chapter one" effect="open" inside={<p>It was a bright cold day.</p>} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-effect", "open");
    expect(screen.getByText("It was a bright cold day.")).toBeInTheDocument();
    expect(part(root, "cover")?.className).toContain(
      "group-hover/book:[transform:rotateY(-115deg)]",
    );
    expect(part(root, "cover")?.className).toContain("group-focus-within/book:");
  });

  it("has no hover transform with effect=none", () => {
    const { container } = render(<Book title="Still" effect="none" />);
    expect(part(container.firstElementChild as Element, "body")?.className).not.toContain(
      "group-hover",
    );
  });

  it("renders as a focusable link with asChild", async () => {
    const user = userEvent.setup();
    render(
      <Book asChild title="Building for the modern web">
        <a href="/books/modern-web" aria-label="Building for the modern web" />
      </Book>,
    );
    const link = screen.getByRole("link", { name: "Building for the modern web" });
    expect(link).toHaveAttribute("data-slot", "book");
    expect(link.className).toContain("focus-visible:ring-2");
    await user.tab();
    expect(link).toHaveFocus();
  });

  it("lets a consumer className win and forwards props and refs", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Book ref={ref} title="Ref" className="inline-flex" data-testid="book" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("inline-flex");
    expect(root).not.toHaveClass("inline-block");
    expect(root).toHaveAttribute("data-testid", "book");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Book title="Stripe" />
        <Book title="Open" effect="open" inside="Page one" variant="simple" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
