"use client";

// Original design.
import { useId, type ReactNode } from "react";

import { Button } from "@/components/button";
import {
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarContent,
  NavbarMobileMenu,
  NavbarSkipLink,
  type NavbarProps,
} from "@/components/navbar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/navigation-menu";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A whole site header from data: brand, a navigation bar whose groups open
 * as menus — with an optional featured card — sign-in and a call to action,
 * and the same navigation as a grouped list in the mobile menu.
 *
 * Built from Navbar (behaviour, the mobile disclosure, the skip link) and
 * NavigationMenu (hover intent, keyboard, the shared viewport). One `items`
 * list drives both the desktop menus and the mobile list, so they cannot
 * drift apart. Each nav is a landmark with its own name.
 */

export interface SiteHeaderLink {
  label: string;
  href: string;
  description?: string;
}

export interface SiteHeaderGroup {
  label: string;
  links: SiteHeaderLink[];
  /** A highlighted card beside the links in the desktop menu. */
  featured?: SiteHeaderLink;
}

export type SiteHeaderItem = SiteHeaderLink | SiteHeaderGroup;

const isGroup = (item: SiteHeaderItem): item is SiteHeaderGroup => "links" in item;

export interface SiteHeaderBlockProps extends Omit<NavbarProps, "children"> {
  /** The brand: a logo and name. */
  brand?: ReactNode;
  brandHref?: string;
  items?: SiteHeaderItem[];
  /** The quiet action, e.g. sign in. `null` hides it. */
  signIn?: { label: string; href: string } | null;
  /** The call to action. `null` hides it. */
  cta?: { label: string; href: string } | null;
  /** Where the skip link goes. `null` leaves it out. */
  skipTo?: string | null;
}

const DEFAULT_ITEMS: SiteHeaderItem[] = [
  {
    label: "Product",
    featured: {
      label: "What's new",
      href: "#",
      description: "Voice input, workflow graphs and a new set of backgrounds.",
    },
    links: [
      {
        label: "Components",
        href: "#",
        description: "Accessible building blocks you own as source.",
      },
      { label: "Blocks", href: "#", description: "Whole sections and application screens." },
      { label: "Backgrounds", href: "#", description: "WebGL, canvas and CSS backdrops." },
      { label: "Themes", href: "#", description: "Presets, tokens and dark mode." },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
  { label: "Pricing", href: "#" },
];

/** A data-driven site header: menus on desktop, a grouped list on mobile. */
export function SiteHeaderBlock({
  brand = (
    <>
      <span aria-hidden="true" className="size-6 rounded-lg bg-primary" />
      Acme
    </>
  ),
  brandHref = "/",
  items = DEFAULT_ITEMS,
  signIn = { label: "Sign in", href: "#" },
  cta = { label: "Get started", href: "#" },
  skipTo = "#content",
  ...props
}: SiteHeaderBlockProps) {
  const mobileId = useId();

  return (
    <Navbar data-block="site-header" {...props}>
      {skipTo ? <NavbarSkipLink href={skipTo} /> : null}
      <NavbarBrand href={brandHref}>{brand}</NavbarBrand>

      <NavbarContent>
        <NavigationMenu aria-label="Main">
          <NavigationMenuList>
            {items.map((item) =>
              isGroup(item) ? (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div
                      className={cn(
                        "grid gap-1 p-1",
                        item.featured ? "w-[38rem] grid-cols-[13rem_1fr]" : "w-64",
                      )}
                    >
                      {item.featured ? (
                        <NavigationMenuLink
                          href={item.featured.href}
                          className="row-span-4 flex flex-col justify-end gap-1 bg-linear-to-b from-primary/10 to-primary/[0.02] p-4"
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {item.featured.label}
                          </span>
                          {item.featured.description ? (
                            <span className="text-sm text-muted-foreground">
                              {item.featured.description}
                            </span>
                          ) : null}
                        </NavigationMenuLink>
                      ) : null}
                      <ul className="grid gap-1">
                        {item.links.map((link) => (
                          <li key={link.label}>
                            <NavigationMenuLink href={link.href}>
                              <span className="block font-medium">{link.label}</span>
                              {link.description ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {link.description}
                                </span>
                              ) : null}
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuLink href={item.href} className={navigationMenuTriggerStyle()}>
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </NavbarContent>

      <NavbarActions>
        {signIn ? (
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={signIn.href}>{signIn.label}</a>
          </Button>
        ) : null}
        {cta ? (
          <Button asChild size="sm">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        ) : null}
        <NavbarMobileMenu>
          <nav
            aria-label="Main mobile"
            className="flex max-h-[70dvh] flex-col gap-5 overflow-y-auto"
          >
            {items.map((item) =>
              isGroup(item) ? (
                <div key={item.label} className="flex flex-col gap-1">
                  <p
                    id={`${mobileId}-${item.label}`}
                    className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {item.label}
                  </p>
                  <ul aria-labelledby={`${mobileId}-${item.label}`} className="grid gap-0.5">
                    {[...(item.featured ? [item.featured] : []), ...item.links].map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent",
                            focusRing,
                          )}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent",
                    focusRing,
                  )}
                >
                  {item.label}
                </a>
              ),
            )}
            {signIn ? (
              <a
                href={signIn.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent sm:hidden",
                  focusRing,
                )}
              >
                {signIn.label}
              </a>
            ) : null}
          </nav>
        </NavbarMobileMenu>
      </NavbarActions>
    </Navbar>
  );
}
