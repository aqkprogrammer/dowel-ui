// Ported from SmoothUI Book (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A 3D book drawn entirely in CSS: a front cover, a block of page edges turned
 * 90° along the fore-edge, and a back cover pushed back by the book's depth.
 * Hover or keyboard focus tilts it (`effect="tilt"`, the source's behaviour) or
 * swings the cover open on its spine to show `inside` (`effect="open"`).
 *
 * No JavaScript: the source read useReducedMotion only to drop the hover
 * transition, which the motion scale and a `motion-safe:` variant do here.
 * The tilt is decoration, so under reduced motion it does not happen at all;
 * opening reveals content, so it still happens — instantly.
 *
 * The book is a physical object with its spine on the left, like the source,
 * so its transforms are physical rather than logical.
 */

/** Spine binding: two soft light bands over a darker crease. Tokens only. */
const SPINE_SHADING =
  "linear-gradient(90deg, transparent 0%, transparent 12%, color-mix(in oklab, var(--color-card) 25%, transparent) 29.25%, transparent 50.5%, transparent 75.25%, color-mix(in oklab, var(--color-card) 25%, transparent) 91%, transparent 100%), " +
  "linear-gradient(90deg, color-mix(in oklab, var(--color-overlay) 6%, transparent) 0%, color-mix(in oklab, var(--color-overlay) 18%, transparent) 12%, transparent 30%, color-mix(in oklab, var(--color-overlay) 4%, transparent) 50%, color-mix(in oklab, var(--color-overlay) 36%, transparent) 73.5%, color-mix(in oklab, var(--color-overlay) 70%, transparent) 75.25%, color-mix(in oklab, var(--color-overlay) 26%, transparent) 85.25%, transparent 100%)";

const PAGE_EDGES =
  "linear-gradient(90deg, color-mix(in oklab, var(--color-foreground) 12%, var(--color-card)) 0%, transparent 70%), " +
  "linear-gradient(var(--color-card), color-mix(in oklab, var(--color-foreground) 3%, var(--color-card)))";

const DEPTH = "29cqw";
const RADIUS = "6px 4px 4px 6px";

/*
 * What hover and focus do to the book body. Written out in full, per state,
 * because Tailwind only generates classes it can read literally.
 */
const bookVariants = cva(
  cn(
    "[container-type:inline-size] relative block w-fit [transform-style:preserve-3d]",
    "transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  ),
  {
    variants: {
      effect: {
        /** Decoration only, so it waits for motion to be welcome. */
        tilt: cn(
          "motion-safe:group-hover/book:[transform:rotateY(-20deg)_scale(1.066)_translateX(-8px)]",
          "motion-safe:group-focus-within/book:[transform:rotateY(-20deg)_scale(1.066)_translateX(-8px)]",
        ),
        /** Turns the book a little so the opening cover has room. */
        open: cn(
          "group-hover/book:[transform:rotateY(-12deg)_translateX(10%)]",
          "group-focus-within/book:[transform:rotateY(-12deg)_translateX(10%)]",
        ),
        none: "",
      },
    },
    defaultVariants: {
      effect: "tilt",
    },
  },
);

const OPEN_COVER = cn(
  "group-hover/book:[transform:rotateY(-115deg)]",
  "group-focus-within/book:[transform:rotateY(-115deg)]",
);

const bookCoverVariants = cva(
  "absolute inset-y-0 start-0 flex flex-col overflow-hidden shadow-md [backface-visibility:hidden]",
  {
    variants: {
      variant: {
        /** A colour band with an optional illustration over a plain body. */
        stripe: "bg-card",
        /** The whole cover in the book's colour. */
        simple: "bg-(--book-color)",
      },
    },
    defaultVariants: {
      variant: "stripe",
    },
  },
);

export interface BookProps
  extends
    Omit<ComponentPropsWithRef<"div">, "title">,
    VariantProps<typeof bookVariants>,
    VariantProps<typeof bookCoverVariants> {
  /** The title on the cover. */
  title: ReactNode;
  /** Cover colour. Any CSS colour; defaults to the primary token. */
  color?: string;
  /** Title colour. Defaults to the foreground token (stripe) or primary-foreground (simple). */
  textColor?: string;
  /** Width in pixels; the height follows at 60:49. */
  width?: number;
  /** Artwork for the colour band of the `stripe` variant. */
  illustration?: ReactNode;
  /** A mark at the foot of the cover. */
  logo?: ReactNode;
  /** What the open cover reveals, for `effect="open"`. */
  inside?: ReactNode;
  /**
   * Renders the child element as the book — typically a link. The book then
   * takes keyboard focus itself, and focus opens or tilts it like hover does.
   */
  asChild?: boolean;
}

/** A 3D book cover that tilts, or opens, on hover and keyboard focus. */
export function Book({
  className,
  title,
  variant = "stripe",
  effect = "tilt",
  color,
  textColor,
  width = 196,
  illustration,
  logo,
  inside,
  asChild = false,
  style,
  children,
  ...props
}: BookProps) {
  const Comp = asChild ? Slot.Root : "div";
  const vars = {
    "--book-color": color ?? "var(--color-primary)",
    "--book-text":
      textColor ??
      (variant === "simple" ? "var(--color-primary-foreground)" : "var(--color-foreground)"),
    "--book-width": `${String(width)}px`,
    ...style,
  } as CSSProperties;

  return (
    <Comp
      data-slot="book"
      data-effect={effect}
      className={cn(
        "group/book inline-block w-fit rounded-md [perspective:900px]",
        asChild && focusRing,
        className,
      )}
      style={vars}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      <span
        data-slot="book-body"
        className={bookVariants({ effect })}
        style={{ aspectRatio: "49 / 60", minWidth: "var(--book-width)" }}
      >
        {effect === "open" ? (
          <span
            data-slot="book-inside"
            className="absolute inset-y-0 start-0 flex w-(--book-width) flex-col overflow-hidden bg-card p-[8%] text-card-foreground shadow-sm"
            style={{ borderRadius: RADIUS, transform: "translateZ(-1px)" }}
          >
            {inside}
          </span>
        ) : null}

        <span
          data-slot="book-cover"
          className={cn(
            "absolute inset-y-0 start-0 block w-(--book-width) [transform-style:preserve-3d]",
            "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
            effect === "open" && OPEN_COVER,
          )}
          style={{ transformOrigin: "0 50%", borderRadius: RADIUS }}
        >
          <span
            className={cn(bookCoverVariants({ variant }), "w-full")}
            style={{ borderRadius: RADIUS }}
          >
            {variant === "stripe" ? (
              <StripeCover title={title} illustration={illustration} logo={logo} />
            ) : (
              <SimpleCover title={title} logo={logo} />
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 border border-border"
              style={{ borderRadius: "inherit" }}
            />
          </span>
          {effect === "open" ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-(--book-color) [backface-visibility:hidden]"
              style={{ borderRadius: RADIUS, transform: "rotateY(180deg)" }}
            >
              <span
                className="absolute inset-0 opacity-30"
                style={{ background: SPINE_SHADING }}
              />
            </span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          data-slot="book-pages"
          className="pointer-events-none absolute top-[3px] block h-[calc(100%-6px)]"
          style={{
            background: PAGE_EDGES,
            width: `calc(${DEPTH} - 2px)`,
            transform: `translateX(calc(var(--book-width) - ${DEPTH} / 2 - 3px)) rotateY(90deg) translateX(calc(${DEPTH} / 2))`,
          }}
        />
        <span
          aria-hidden="true"
          data-slot="book-back"
          className={cn(
            "pointer-events-none absolute inset-y-0 start-0 block w-(--book-width)",
            variant === "simple" ? "bg-(--book-color)" : "bg-card",
          )}
          style={{ borderRadius: RADIUS, transform: `translateZ(calc(-1 * ${DEPTH}))` }}
        />
      </span>
    </Comp>
  );
}

function CoverTitle({ title, size }: { title: ReactNode; size: string }) {
  return (
    <span
      data-slot="book-title"
      className="leading-[1.25em] font-semibold tracking-[-0.02em] text-balance text-(--book-text)"
      style={{ fontSize: size }}
    >
      {title}
    </span>
  );
}

function StripeCover({
  title,
  illustration,
  logo,
}: {
  title: ReactNode;
  illustration?: ReactNode;
  logo?: ReactNode;
}) {
  return (
    <>
      <span className="relative flex w-full flex-1 overflow-hidden bg-(--book-color)">
        <span className="flex-1 *:size-full *:object-cover">{illustration}</span>
        <span
          aria-hidden="true"
          className="absolute inset-0 mix-blend-overlay"
          style={{ background: SPINE_SHADING }}
        />
      </span>
      <span className="flex">
        <span
          aria-hidden="true"
          className="min-w-[8.2%] opacity-20"
          style={{ background: SPINE_SHADING }}
        />
        <span
          className="[container-type:inline-size] flex w-full flex-col justify-between gap-[12cqw]"
          style={{ padding: "6.1%" }}
        >
          <CoverTitle title={title} size="10.5cqw" />
          {logo ? <span data-slot="book-logo">{logo}</span> : null}
        </span>
      </span>
    </>
  );
}

function SimpleCover({ title, logo }: { title: ReactNode; logo?: ReactNode }) {
  return (
    <span className="flex size-full">
      <span
        aria-hidden="true"
        className="min-w-[8.2%] mix-blend-overlay"
        style={{ background: SPINE_SHADING }}
      />
      <span
        className="[container-type:inline-size] flex w-full flex-col justify-between gap-[8cqw]"
        style={{ padding: "6.1%" }}
      >
        <CoverTitle title={title} size="12cqw" />
        {logo ? <span data-slot="book-logo">{logo}</span> : null}
      </span>
    </span>
  );
}

export { bookCoverVariants, bookVariants };
