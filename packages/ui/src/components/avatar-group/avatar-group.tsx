// Ported from SmoothUI Animated Avatar Group (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage, avatarVariants } from "@/components/avatar";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The source springs each avatar's margin with `motion`. Nothing here carries
 * gesture velocity, so it is a CSS transition instead (ADR 0014): the root owns
 * one custom property, the per-item offset, and hovering or keyboard-focusing
 * the group swaps an overlap of a fraction of the avatar for a small gap.
 * Every item's margin-inline-start follows, staggered by an inline delay that
 * runs through --motion-scale, so under reduced motion the group simply snaps.
 *
 * `hover:` in Tailwind 4 only applies on devices that can hover, which is the
 * source's `(hover: hover)` check without a matchMedia subscription.
 */

/** Avatar edge length per size, mirroring `avatarVariants`. */
const SIZE_REM = { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 } as const;

const avatarGroupVariants = cva(
  cn(
    "group/avatar-group flex items-center",
    "[--avatar-group-offset:calc(var(--avatar-group-size)*var(--avatar-group-overlap)*-1)]",
  ),
  {
    variants: {
      /** Whether hovering or keyboard-focusing the group spreads the avatars apart. */
      expand: {
        hover:
          "hover:[--avatar-group-offset:0.25rem] has-[:focus-visible]:[--avatar-group-offset:0.25rem]",
        none: "",
      },
    },
    defaultVariants: {
      expand: "hover",
    },
  },
);

/** One stacked item: overlaps the previous one, and spreads with the group. */
const itemClass = cn(
  "relative ms-[var(--avatar-group-offset)] first:ms-0",
  "transition-[margin-inline-start,scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
);

const expandedItemClass =
  "group-hover/avatar-group:scale-105 group-has-[:focus-visible]/avatar-group:scale-105";

export interface AvatarGroupItem {
  /** The person's name: the image's alt text and the fallback's accessible name. */
  name: string;
  /** Image URL. Without it (or while it loads, or if it fails) the fallback shows. */
  src?: string;
  /** Makes the avatar a link, e.g. to a profile. */
  href?: string;
  /** Shown when there is no image. Defaults to the name's initials. */
  fallback?: ReactNode;
}

export interface AvatarGroupProps
  extends
    Omit<ComponentPropsWithRef<"ul">, "children">,
    VariantProps<typeof avatarGroupVariants> {
  /** The people to show, in order. The first is drawn on top. */
  avatars: AvatarGroupItem[];
  /** How many avatars to show before collapsing the rest into "+N". */
  max?: number;
  /** Avatar size, as `Avatar`'s `size`. */
  size?: keyof typeof SIZE_REM;
  /** How much each avatar overlaps the previous one, as a fraction of its width. */
  overlap?: number;
  /** Screen-reader text for the overflow count. */
  overflowLabel?: (hidden: number) => string;
}

/** The first letters of the first and last words: "Ada Lovelace" → "AL". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word?.[0]?.toUpperCase() ?? "").join("");
}

function Person({ item, size }: { item: AvatarGroupItem; size: keyof typeof SIZE_REM }) {
  const avatar = (
    <Avatar size={size} className="ring-2 ring-background">
      {item.src ? <AvatarImage src={item.src} alt={item.name} draggable={false} /> : null}
      <AvatarFallback>
        <span aria-hidden="true">{item.fallback ?? initials(item.name)}</span>
        <span className="sr-only">{item.name}</span>
      </AvatarFallback>
    </Avatar>
  );

  if (!item.href) return avatar;
  return (
    <a
      href={item.href}
      data-slot="avatar-group-link"
      className={cn("block rounded-full", focusRing)}
    >
      {avatar}
    </a>
  );
}

/** Overlapping avatars that spread apart on hover or keyboard focus, with a "+N" overflow. */
export function AvatarGroup({
  className,
  style,
  avatars,
  max = 4,
  size = "md",
  overlap = 0.3,
  expand = "hover",
  overflowLabel = (hidden) => `and ${String(hidden)} more`,
  ...props
}: AvatarGroupProps) {
  const visible = avatars.slice(0, Math.max(0, max));
  const hidden = avatars.length - visible.length;
  const total = visible.length + (hidden > 0 ? 1 : 0);

  const delay = (index: number): CSSProperties => ({
    transitionDelay: `calc(${String(index * 30)}ms * var(--motion-scale, 1))`,
    zIndex: total - index,
  });

  return (
    <ul
      data-slot="avatar-group"
      data-expand={expand}
      className={cn(avatarGroupVariants({ expand }), className)}
      style={
        {
          "--avatar-group-size": `${String(SIZE_REM[size])}rem`,
          "--avatar-group-overlap": String(overlap),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {visible.map((item, index) => (
        <li
          key={`${item.name}-${String(index)}`}
          data-slot="avatar-group-item"
          className={cn(itemClass, expand === "hover" && expandedItemClass)}
          style={delay(index)}
        >
          <Person item={item} size={size} />
        </li>
      ))}
      {hidden > 0 ? (
        <li
          data-slot="avatar-group-overflow"
          className={cn(itemClass, expand === "hover" && expandedItemClass)}
          style={delay(visible.length)}
        >
          <span
            className={cn(
              avatarVariants({ size }),
              "items-center justify-center font-medium text-muted-foreground ring-2 ring-background",
            )}
          >
            <span aria-hidden="true">+{hidden}</span>
            <span className="sr-only">{overflowLabel(hidden)}</span>
          </span>
        </li>
      ) : null}
    </ul>
  );
}

export { avatarGroupVariants };
