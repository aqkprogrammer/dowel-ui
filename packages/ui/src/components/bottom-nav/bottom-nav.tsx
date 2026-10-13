// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A tab bar for phones: the app's top destinations along the bottom of the
 * screen, within reach of a thumb.
 *
 * A nav landmark of links, each with an icon and a visible label — icons
 * alone are guesswork. The current one is marked aria-current="page" and lit
 * with a pill behind its icon. It sits clear of the home indicator on phones
 * with one (safe-area padding) and hides from `md` up by default, where a
 * sidebar or navbar takes over.
 */

const bottomNavVariants = cva(
  "z-(--z-sticky) border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
  {
    variants: {
      /** Where it hides: from `md` or `lg` up, or never. */
      hideFrom: {
        md: "md:hidden",
        lg: "lg:hidden",
        never: "",
      },
      /** Fixed to the bottom of the screen, or in the flow where it is placed. */
      position: {
        fixed: "fixed inset-x-0 bottom-0",
        static: "relative",
      },
    },
    defaultVariants: { hideFrom: "md", position: "fixed" },
  },
);

export interface BottomNavProps
  extends ComponentPropsWithRef<"nav">, VariantProps<typeof bottomNavVariants> {
  /** Names the navigation for screen readers. Default "Primary". */
  label?: string;
}

/** A tab bar along the bottom of the screen on phones. */
export function BottomNav({
  label = "Primary",
  hideFrom,
  position,
  className,
  children,
  ...props
}: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      data-slot="bottom-nav"
      className={cn(bottomNavVariants({ hideFrom, position }), className)}
      {...props}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">{children}</ul>
    </nav>
  );
}

export interface BottomNavItemProps extends ComponentPropsWithRef<"a"> {
  /** The icon. Decorative: the label names the destination. */
  icon: ReactNode;
  /** The visible label. Keep it to a word. */
  label: string;
  /** This is the current page. Sets aria-current="page". */
  active?: boolean;
  /** A count or a dot on the icon: a number, or true for a dot. */
  badge?: number | boolean;
  /** What the badge means, spoken after the label, e.g. "unread". Default "new". */
  badgeLabel?: string;
  /** Render your router's link component instead of an <a>. */
  asChild?: boolean;
}

/** One destination: an icon over a label, lit when it is the current page. */
export function BottomNavItem({
  icon,
  label,
  active = false,
  badge,
  badgeLabel = "new",
  asChild = false,
  className,
  children,
  ...props
}: BottomNavItemProps) {
  const Comp = asChild ? Slot.Root : "a";
  const count = typeof badge === "number" && badge > 0 ? badge : undefined;
  const dot = badge === true;

  return (
    <li className="flex flex-1">
      <Comp
        aria-current={active ? "page" : undefined}
        data-slot="bottom-nav-item"
        data-active={active || undefined}
        className={cn(
          "group/bottom-nav flex flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-medium",
          "text-muted-foreground transition-colors hover:text-foreground data-[active]:text-foreground",
          focusRing,
          className,
        )}
        {...props}
      >
        <Slot.Slottable>{children}</Slot.Slottable>
        <span
          aria-hidden="true"
          className={cn(
            "relative grid h-7 w-14 place-items-center rounded-full transition-colors duration-(--duration-normal) [&_svg]:size-5",
            "group-data-[active]/bottom-nav:bg-primary/15 group-data-[active]/bottom-nav:text-primary",
          )}
        >
          {icon}
          {count !== undefined || dot ? (
            <span
              data-slot="bottom-nav-badge"
              className={cn(
                "absolute end-2 top-0 grid place-items-center rounded-full bg-destructive text-[0.625rem] leading-none font-semibold text-destructive-foreground",
                dot ? "size-2" : "h-4 min-w-4 px-1",
              )}
            >
              {count !== undefined ? (count > 99 ? "99+" : String(count)) : null}
            </span>
          ) : null}
        </span>
        <span>
          {label}
          {count !== undefined ? (
            <span className="sr-only">{`, ${String(count)} ${badgeLabel}`}</span>
          ) : dot ? (
            <span className="sr-only">{`, ${badgeLabel}`}</span>
          ) : null}
        </span>
      </Comp>
    </li>
  );
}

export { bottomNavVariants };
