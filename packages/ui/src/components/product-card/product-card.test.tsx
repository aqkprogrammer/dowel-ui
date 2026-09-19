import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ProductCard } from "./product-card";

const base = {
  title: "Nike Air Max",
  image: "/shoe.jpg",
  price: 129,
  locale: "en-US",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ProductCard", () => {
  it("is an article named by its title", () => {
    render(<ProductCard {...base} />);
    const article = screen.getByRole("article", { name: "Nike Air Max" });
    expect(article).toHaveAttribute("data-animate", "true");
    expect(screen.getByRole("heading", { name: "Nike Air Max" })).toBeInTheDocument();
    expect(article.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("formats the price as currency", () => {
    render(<ProductCard {...base} currency="EUR" locale="de-DE" price={89} />);
    expect(screen.getByText(/89,00/)).toBeInTheDocument();
  });

  it("shows a struck-through original price and the discount, in words for screen readers", () => {
    render(<ProductCard {...base} originalPrice={179} />);
    const price = screen.getByText("$179.00");
    expect(price.tagName).toBe("S");
    expect(screen.getByText("-28%")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(", 28% off")).toHaveClass("sr-only");
    expect(screen.getByText("Now")).toHaveClass("sr-only");
  });

  it("shows no discount when the original price is not higher", () => {
    render(<ProductCard {...base} originalPrice={100} />);
    expect(screen.queryByText("$100.00")).not.toBeInTheDocument();
    expect(screen.getByText("Price")).toHaveClass("sr-only");
  });

  it("describes the rating as one image, to the nearest half star", () => {
    const { container, rerender } = render(<ProductCard {...base} rating={4.5} />);
    expect(screen.getByRole("img", { name: "Rated 4.5 out of 5" })).toBeInTheDocument();
    const stars = () =>
      [...container.querySelectorAll('[data-slot="product-card-rating"] path')].map((path) =>
        path.getAttribute("fill"),
      );
    expect(stars().slice(0, 4)).toEqual(Array(4).fill("currentColor"));
    expect(stars()[4]).toMatch(/^url\(#/);

    rerender(<ProductCard {...base} rating={3} />);
    expect(stars()).toEqual(["currentColor", "currentColor", "currentColor", "none", "none"]);
  });

  it("colours the badge from its text, or as told", () => {
    const { rerender } = render(<ProductCard {...base} badge="Sale" />);
    expect(screen.getByText("Sale")).toHaveClass("bg-destructive");
    rerender(<ProductCard {...base} badge="New" />);
    expect(screen.getByText("New")).toHaveClass("bg-success");
    rerender(<ProductCard {...base} badge="Limited" />);
    expect(screen.getByText("Limited")).toHaveClass("bg-primary");
    rerender(<ProductCard {...base} badge="Sale" badgeVariant="info" />);
    expect(screen.getByText("Sale")).toHaveClass("bg-info");
  });

  it("confirms add-to-cart, announces it, and reverts", () => {
    vi.useFakeTimers();
    const onAddToCart = vi.fn();
    render(<ProductCard {...base} onAddToCart={onAddToCart} />);
    const button = screen.getByRole("button", { name: "Add Nike Air Max to cart" });

    fireEvent.click(button);
    expect(onAddToCart).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("status")).toHaveTextContent("Nike Air Max added to cart");
    expect(button).toBeEnabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button).toHaveAttribute("data-state", "inactive");
  });

  it("adds to cart from the keyboard", async () => {
    const onAddToCart = vi.fn();
    const user = userEvent.setup();
    render(<ProductCard {...base} onAddToCart={onAddToCart} />);
    await user.tab(); // wishlist
    await user.tab(); // add to cart
    expect(screen.getByRole("button", { name: "Add Nike Air Max to cart" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAddToCart).toHaveBeenCalledOnce();
  });

  it("toggles the wishlist as a pressed button, uncontrolled", async () => {
    const onWishlistChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductCard {...base} onWishlistChange={onWishlistChange} />);
    const heart = screen.getByRole("button", { name: "Save Nike Air Max to wishlist" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    await user.click(heart);
    expect(heart).toHaveAttribute("aria-pressed", "true");
    expect(onWishlistChange).toHaveBeenCalledWith(true);
  });

  it("starts wishlisted from defaultWishlisted", () => {
    render(<ProductCard {...base} defaultWishlisted />);
    expect(screen.getByRole("button", { name: /wishlist/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("follows a controlled wishlist", async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <>
          <ProductCard {...base} wishlisted={on} onWishlistChange={setOn} />
          <output>{on ? "saved" : "not saved"}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: /wishlist/ }));
    expect(screen.getByText("saved")).toBeInTheDocument();
  });

  it("does not change a controlled wishlist by itself", async () => {
    const user = userEvent.setup();
    render(<ProductCard {...base} wishlisted={false} />);
    const heart = screen.getByRole("button", { name: /wishlist/ });
    await user.click(heart);
    expect(heart).toHaveAttribute("aria-pressed", "false");
  });

  it("makes the title a link over the whole card with href", () => {
    render(<ProductCard {...base} href="/products/air-max" />);
    const link = screen.getByRole("link", { name: "Nike Air Max" });
    expect(link).toHaveAttribute("href", "/products/air-max");
    expect(link.className).toContain("after:inset-0");
  });

  it("renders extra content and can skip the entrance", () => {
    render(
      <ProductCard {...base} animateIn={false} imageAlt="A red running shoe">
        <p>Free returns</p>
      </ProductCard>,
    );
    expect(screen.getByText("Free returns")).toBeInTheDocument();
    expect(screen.getByRole("article")).not.toHaveAttribute("data-animate");
    expect(screen.getByRole("img", { name: "A red running shoe" })).toBeInTheDocument();
  });

  it("ships its entrance keyframes once, and drops them under reduced motion", () => {
    render(
      <>
        <ProductCard {...base} />
        <ProductCard {...base} title="Luxury Perfume" />
      </>,
    );
    const styles = document.querySelectorAll('style[data-href="dowel-product-card"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("calc(320ms * var(--motion-scale, 1))");
    expect(styles[0]?.textContent).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(<ProductCard {...base} ref={ref} className="rounded-none" data-testid="card" />);
    expect(ref.current).toBe(screen.getByTestId("card"));
    expect(ref.current).toHaveClass("rounded-none");
    expect(ref.current).not.toHaveClass("rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ProductCard {...base} originalPrice={179} rating={4.5} badge="Sale" href="/p" />,
    );
    await expectNoA11yViolations(container);
  });
});
