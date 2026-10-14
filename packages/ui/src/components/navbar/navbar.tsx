"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A site header: brand on the start side, navigation in the middle, actions
 * on the end, and a menu button that takes over below `md`.
 *
 * Behaviour is a prop: `static` scrolls away with the page, `sticky` stays at
 * the top, `hide-on-scroll` slides away while the reader scrolls down and
 * comes back as soon as they scroll up. It never hides while it holds focus
 * or its mobile menu is open — a keyboard user tabbing through it must always
 * see where they are. `elevate` adds a border, a shadow and a blur once the
 * page has scrolled, so the bar is flat at the top and lifted over content.
 *
 * The mobile menu is a disclosure: a button with aria-expanded that shows a
 * panel under the bar. Escape and following a link close it, and focus goes
 * back to the button.
 */

interface NavbarContextValue {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  menuId: string;
}

const NavbarContext = createContext<NavbarContextValue | null>(null);

function useNavbar(part: string): NavbarContextValue {
  const context = useContext(NavbarContext);
  if (!context) throw new Error(`<${part}> must be used inside <Navbar>.`);
  return context;
}

const navbarVariants = cva(
  "z-(--z-sticky) w-full transition-[translate,background-color,box-shadow,border-color] duration-(--duration-normal) ease-(--ease-out-quint)",
  {
    variants: {
      /** How it looks: full-width, a floating rounded bar, or translucent glass. */
      variant: {
        default: "border-b border-transparent bg-background",
        floating: "px-3 pt-3",
        glass: "border-b border-transparent bg-background/70 backdrop-blur-md",
      },
      /** How it moves with the page. */
      behavior: {
        static: "relative",
        sticky: "sticky top-0",
        "hide-on-scroll": "sticky top-0 data-[hidden]:-translate-y-full",
      },
    },
    defaultVariants: { variant: "default", behavior: "sticky" },
  },
);

export interface NavbarProps
  extends ComponentPropsWithRef<"header">, VariantProps<typeof navbarVariants> {
  /** Lift the bar — border, shadow, blur — once the page has scrolled. Default true. */
  elevate?: boolean;
  /** Class for the inner row that holds the parts. */
  innerClassName?: string;
}

/** A site header with brand, navigation, actions and a mobile menu. */
export function Navbar({
  variant,
  behavior,
  elevate = true,
  className,
  innerClassName,
  children,
  onFocus,
  onBlur,
  ref,
  ...props
}: NavbarProps) {
  const look = variant ?? "default";
  const mode = behavior ?? "sticky";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [focused, setFocused] = useState(false);
  const menuId = useId();
  const header = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let last = window.scrollY;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      if (mode === "hide-on-scroll") {
        const height = header.current?.offsetHeight ?? 64;
        if (y > last + 4 && y > height) setHidden(true);
        else if (y < last - 4 || y <= height) setHidden(false);
      }
      last = y;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    return () => {
      window.removeEventListener("scroll", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode]);

  // Never out of sight while it holds focus or its menu is open.
  const concealed = mode === "hide-on-scroll" && hidden && !focused && !menuOpen;
  const lifted = elevate && scrolled;

  return (
    <NavbarContext.Provider value={{ menuOpen, setMenuOpen, menuId }}>
      <header
        ref={(node) => {
          header.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        data-slot="navbar"
        data-variant={look}
        data-scrolled={scrolled || undefined}
        data-hidden={concealed || undefined}
        className={cn(
          navbarVariants({ variant: look, behavior: mode }),
          lifted && look !== "floating" && "border-border shadow-sm",
          lifted && look === "default" && "bg-background/85 backdrop-blur-md",
          className,
        )}
        onFocus={(event: FocusEvent<HTMLElement>) => {
          onFocus?.(event);
          setFocused(true);
        }}
        onBlur={(event: FocusEvent<HTMLElement>) => {
          onBlur?.(event);
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        {...props}
      >
        <div
          data-slot="navbar-inner"
          className={cn(
            "relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6",
            look === "floating" &&
              cn(
                "h-14 rounded-2xl border border-border bg-background/80 backdrop-blur-md",
                lifted && "shadow-md",
              ),
            innerClassName,
          )}
        >
          {children}
        </div>
      </header>
    </NavbarContext.Provider>
  );
}

/** A "skip to content" link, out of sight until it is focused. Put it first. */
export function NavbarSkipLink({
  href = "#content",
  className,
  children = "Skip to content",
  ...props
}: ComponentPropsWithRef<"a">) {
  return (
    <a
      href={href}
      data-slot="navbar-skip-link"
      className={cn(
        "sr-only rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50",
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

/** The brand: a logo and a name, usually a link home. */
export function NavbarBrand({ className, children, ...props }: ComponentPropsWithRef<"a">) {
  return (
    <a
      data-slot="navbar-brand"
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-md font-semibold text-foreground",
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

/** The main navigation, from `md` up. Below that, NavbarMobileMenu takes its place. */
export function NavbarContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="navbar-content"
      className={cn("hidden flex-1 items-center justify-center md:flex", className)}
      {...props}
    />
  );
}

/** Actions on the end side: sign in, a call to action, a theme toggle. */
export function NavbarActions({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="navbar-actions"
      className={cn("ms-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export interface NavbarMobileMenuProps extends ComponentPropsWithRef<"div"> {
  /** Accessible name for the menu button. Default "Menu". */
  label?: string;
}

/**
 * A menu button below `md` and the panel it opens under the bar. Put the
 * mobile version of the navigation inside; following any link closes it.
 */
export function NavbarMobileMenu({
  label = "Menu",
  className,
  children,
  ...props
}: NavbarMobileMenuProps) {
  const { menuOpen, setMenuOpen, menuId } = useNavbar("NavbarMobileMenu");
  const button = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setMenuOpen(false);
    button.current?.focus();
  }, [setMenuOpen]);

  // Escape anywhere in the menu closes it; following a link in it does too.
  useEffect(() => {
    if (!menuOpen) return;
    const region = panel.current?.parentElement;
    if (!region) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    const onLink = (event: globalThis.MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("a[href]")) setMenuOpen(false);
    };
    region.addEventListener("keydown", onKey);
    panel.current?.addEventListener("click", onLink);
    const content = panel.current;
    return () => {
      region.removeEventListener("keydown", onKey);
      content?.removeEventListener("click", onLink);
    };
  }, [menuOpen, close, setMenuOpen]);

  return (
    <div data-slot="navbar-mobile-menu" className="md:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={label}
        data-slot="navbar-menu-button"
        className={cn(
          "grid size-9 place-items-center rounded-md text-foreground hover:bg-accent",
          focusRing,
        )}
        onClick={() => {
          setMenuOpen(!menuOpen);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
          className="size-5"
        >
          {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div
        ref={panel}
        id={menuId}
        hidden={!menuOpen}
        data-slot="navbar-mobile-panel"
        className={cn(
          "absolute inset-x-0 top-full border-b border-border bg-background px-4 py-4 shadow-md sm:px-6",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export { navbarVariants };
