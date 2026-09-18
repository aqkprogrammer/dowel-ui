"use client";

// Ported from SmoothUI Product Card (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Badge, type BadgeProps } from "@/components/badge";
import { MorphButton } from "@/components/morph-button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A shop card assembled from the library rather than re-drawn: the badges are
 * Badge, the add-to-cart confirmation is MorphButton's `transient` mode (it
 * morphs to "Added", announces it, and reverts on its own), and the wishlist
 * heart is MorphButton's `toggle` mode, exposed with aria-pressed.
 *
 * The source used `motion` for three things CSS does honestly: the entrance
 * (a keyframe, tied to scroll where the browser supports view timelines), the
 * image zoom and the button press. So there is no animation library here.
 */

const PREFIX = "dowel-product-card";

const STYLES = `
@keyframes ${PREFIX}-in{from{opacity:0;translate:0 20px;scale:.97}}
@keyframes ${PREFIX}-pop{from{opacity:0;scale:.6}}
[data-slot=product-card][data-animate]{animation:${PREFIX}-in calc(320ms * var(--motion-scale, 1)) var(--ease-out-quint) both}
[data-slot=product-card][data-animate] [data-slot=product-card-badge]{animation:${PREFIX}-pop calc(320ms * var(--motion-scale, 1)) var(--ease-overshoot) calc(250ms * var(--motion-scale, 1)) both}
@supports (animation-timeline:view()){
[data-slot=product-card][data-animate],[data-slot=product-card][data-animate] [data-slot=product-card-badge]{animation-timeline:view();animation-delay:0s}
[data-slot=product-card][data-animate]{animation-range:entry 0% entry 60%}
[data-slot=product-card][data-animate] [data-slot=product-card-badge]{animation-range:entry 30% entry 90%}
}
@media (prefers-reduced-motion:reduce){[data-slot=product-card][data-animate],[data-slot=product-card][data-animate] [data-slot=product-card-badge]{animation:none}}
`;

const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z";

function Star({ fill, gradient }: { fill: "full" | "half" | "empty"; gradient: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-3.5", fill === "empty" ? "text-border-strong" : "text-warning")}
    >
      {fill === "half" ? (
        <defs>
          <linearGradient id={gradient}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d={STAR}
        fill={fill === "full" ? "currentColor" : fill === "half" ? `url(#${gradient})` : "none"}
        stroke="currentColor"
        strokeWidth={fill === "full" ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Rounded to the nearest half star, as the source did. */
function Rating({ value }: { value: number }) {
  const gradient = `${PREFIX}-half-${useId().replace(/:/g, "")}`;
  const halves = Math.round(Math.min(Math.max(value, 0), 5) * 2);
  return (
    <div data-slot="product-card-rating" className="flex items-center gap-0.5">
      <span role="img" aria-label={`Rated ${String(value)} out of 5`} className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            gradient={gradient}
            fill={halves >= (i + 1) * 2 ? "full" : halves === i * 2 + 1 ? "half" : "empty"}
          />
        ))}
      </span>
      <span aria-hidden="true" className="ms-1 text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        d="M6 7h12l-1 13H7L6 7zm3 0V6a3 3 0 0 1 6 0v1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        d="M21 8.25c0-2.49-2.1-4.5-4.69-4.5-1.93 0-3.6 1.13-4.31 2.73-.72-1.6-2.38-2.73-4.31-2.73C5.1 3.75 3 5.76 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Sale" reads as destructive and "New" as success, as in the source; anything else is primary. */
function badgeTone(badge: ReactNode): BadgeProps["variant"] {
  const text = typeof badge === "string" ? badge.toLowerCase() : "";
  if (text === "sale") return "destructive";
  if (text === "new") return "success";
  return "default";
}

export interface ProductCardProps extends Omit<ComponentPropsWithRef<"article">, "title"> {
  /** Product name. Names the card, the cart button and the wishlist toggle. */
  title: string;
  /** Image URL. */
  image: string;
  /** Alt text for the image. Empty by default: the title beside it already names the product. */
  imageAlt?: string;
  /** Makes the title a link covering the whole card; the buttons stay on top of it. */
  href?: string;
  price: number;
  /** A higher earlier price. Shows struck through, with the discount. */
  originalPrice?: number;
  /** ISO 4217 code. */
  currency?: string;
  /** Locale for number formatting. Defaults to the reader's. */
  locale?: string;
  /** 0–5, shown to the nearest half star. */
  rating?: number;
  /** A label over the image — "Sale", "New", "Limited". */
  badge?: ReactNode;
  /** Overrides the badge colour chosen from its text. */
  badgeVariant?: BadgeProps["variant"];
  /** Called when "Add to cart" is pressed. The button confirms and reverts on its own. */
  onAddToCart?: () => void;
  /** Controlled wishlist state. */
  wishlisted?: boolean;
  /** Initial wishlist state when uncontrolled. */
  defaultWishlisted?: boolean;
  onWishlistChange?: (wishlisted: boolean) => void;
  /** Plays the entrance animation (tied to scrolling into view where supported). */
  animateIn?: boolean;
  /** Extra content under the price, before the button. */
  children?: ReactNode;
}

/** A product tile: image, name, rating, price, add-to-cart and wishlist. */
export function ProductCard({
  className,
  title,
  image,
  imageAlt = "",
  href,
  price,
  originalPrice,
  currency = "USD",
  locale,
  rating,
  badge,
  badgeVariant,
  onAddToCart,
  wishlisted,
  defaultWishlisted = false,
  onWishlistChange,
  animateIn = true,
  children,
  ...props
}: ProductCardProps) {
  const titleId = `${PREFIX}-${useId().replace(/:/g, "")}`;
  const [uncontrolledWish, setUncontrolledWish] = useState(defaultWishlisted);
  const wished = wishlisted ?? uncontrolledWish;
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  const discounted = originalPrice !== undefined && originalPrice > price;
  const discount = discounted ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <article
        aria-labelledby={titleId}
        data-slot="product-card"
        data-animate={animateIn || undefined}
        className={cn(
          "group/product relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
          "transition-shadow duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:shadow-xl",
          className,
        )}
        {...props}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={image}
            alt={imageAlt}
            draggable={false}
            className="size-full object-cover transition-transform duration-[var(--duration-slower)] ease-[var(--ease-out-quint)] group-hover/product:scale-105"
          />
          {badge != null ? (
            <Badge
              data-slot="product-card-badge"
              variant={badgeVariant ?? badgeTone(badge)}
              className="absolute start-3 top-3 shadow-sm"
            >
              {badge}
            </Badge>
          ) : null}
          <MorphButton
            data-slot="product-card-wishlist"
            aria-label={`Save ${title} to wishlist`}
            icon={<HeartIcon />}
            tone="destructive"
            fillOnActive
            size="icon-sm"
            active={wished}
            onActiveChange={(next) => {
              if (wishlisted === undefined) setUncontrolledWish(next);
              onWishlistChange?.(next);
            }}
            className="absolute end-3 top-3 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 id={titleId} className="line-clamp-1 text-sm font-semibold tracking-tight">
            {href ? (
              <a
                href={href}
                className={cn(
                  "rounded-sm after:absolute after:inset-0 after:content-['']",
                  focusRing,
                )}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h3>

          {rating !== undefined ? <Rating value={rating} /> : null}

          <p data-slot="product-card-price" className="flex flex-wrap items-baseline gap-2">
            <span className="sr-only">{discounted ? "Now " : "Price "}</span>
            <span className="text-xl font-bold tracking-tight">{format(price)}</span>
            {discounted ? (
              <>
                <span className="sr-only">, was </span>
                <s className="text-sm text-muted-foreground">{format(originalPrice)}</s>
                <Badge variant="destructive" size="sm" className="rounded-md">
                  <span aria-hidden="true">-{discount}%</span>
                  <span className="sr-only">, {discount}% off</span>
                </Badge>
              </>
            ) : null}
          </p>

          {children}

          <div className="mt-auto pt-2">
            <MorphButton
              data-slot="product-card-add"
              trigger="transient"
              variant="primary"
              icon={<CartIcon />}
              activeIcon={<CheckIcon />}
              label="Add to cart"
              activeLabel="Added"
              aria-label={`Add ${title} to cart`}
              announcement={`${title} added to cart`}
              onClick={() => onAddToCart?.()}
              className="relative z-10 w-full data-[state=active]:bg-success data-[state=active]:text-success-foreground"
            />
          </div>
        </div>
      </article>
    </>
  );
}
