"use client";

import { Slot } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/sheet";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * The application's own navigation.
 *
 * Two states, not one. On a wide screen it collapses to a rail of icons and
 * stays in the page; on a narrow one it is an overlay, which needs a focus trap
 * and an Escape key and is therefore a Sheet rather than a div with a
 * transform. Building one behaviour and hiding it at a breakpoint gets the
 * mobile case wrong every time — the page behind stays reachable by Tab while
 * the menu covers it.
 *
 * The collapsed rail is where these usually fail. Hiding the label leaves a
 * button whose only content is an icon, and an icon has no accessible name. The
 * label here is not removed but visually hidden, so the control keeps its name
 * whether or not the text is on screen.
 */

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Id of the sidebar element, for the trigger's aria-controls. */
  sidebarId: string;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar(component: string): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <SidebarProvider>.`);
  }
  return context;
}

export interface SidebarProviderProps {
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function SidebarProvider({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  children,
}: SidebarProviderProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const sidebarId = useId();

  const value = useMemo<SidebarContextValue>(() => {
    const setOpen = (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    };

    return {
      open,
      setOpen,
      toggle: () => {
        setOpen(!open);
      },
      sidebarId,
    };
  }, [open, openProp, onOpenChange, sidebarId]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export interface SidebarProps extends ComponentPropsWithRef<"aside"> {
  /**
   * Names the navigation landmark.
   *
   * Required, not optional. A page has more than one navigation region — this,
   * a breadcrumb, a footer — and three landmarks all called "navigation" is a
   * list a screen reader user cannot choose from.
   */
  label: string;
  /** Title for the overlay on a narrow screen, where it is a dialog. */
  mobileTitle?: string;
}

export function Sidebar({ className, label, mobileTitle, children, ...props }: SidebarProps) {
  const { open, setOpen, sidebarId } = useSidebar("Sidebar");

  return (
    <>
      {/*
        The overlay, on a narrow screen. A Sheet rather than a styled div: it
        traps focus, closes on Escape and marks the rest of the page inert,
        none of which a transform does — and without them the page behind stays
        reachable by Tab while the menu covers it.
      */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          <SheetTitle className="sr-only">{mobileTitle ?? label}</SheetTitle>
          <nav aria-label={label} className="flex h-full flex-col gap-2 p-3">
            {children}
          </nav>
        </SheetContent>
      </Sheet>

      <aside
        id={sidebarId}
        data-slot="sidebar"
        data-state={open ? "expanded" : "collapsed"}
        className={cn(
          "hidden shrink-0 border-e border-border bg-background md:block",
          "transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          open ? "w-60" : "w-14",
          className,
        )}
        {...props}
      >
        <nav aria-label={label} className="flex h-full flex-col gap-2 p-3">
          {children}
        </nav>
      </aside>
    </>
  );
}

export function SidebarHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex min-h-9 items-center gap-2 px-1", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div data-slot="sidebar-footer" className={cn("mt-auto", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div data-slot="sidebar-group" className={cn("grid gap-1", className)} {...props} />;
}

/**
 * A heading for a group of links.
 *
 * Hidden rather than removed when the rail is collapsed, so the grouping
 * survives for anyone not reading the layout visually.
 */
export function SidebarGroupLabel({ className, ...props }: ComponentPropsWithRef<"div">) {
  const { open } = useSidebar("SidebarGroupLabel");

  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        !open && "sr-only",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentPropsWithRef<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("grid gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: ComponentPropsWithRef<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("min-w-0", className)} {...props} />;
}

export interface SidebarMenuButtonProps extends ComponentPropsWithRef<"a"> {
  /** Render the child as the control, for a router's own link or a button. */
  asChild?: boolean;
  /** The page currently being shown. */
  isActive?: boolean;
}

/**
 * One entry in the navigation.
 *
 * `aria-current="page"` when active, not merely a background colour: which page
 * you are on is information, and a highlight conveys it to exactly one kind of
 * reader.
 */
export function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const Component = asChild ? Slot.Root : "a";

  return (
    <Component
      data-slot="sidebar-menu-button"
      data-active={isActive || undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm",
        "transition-colors duration-[var(--duration-fast)]",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        isActive
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * The text of a menu entry.
 *
 * Visually hidden rather than removed when the rail is collapsed. Removing it
 * leaves a control whose only content is an icon, and an icon has no accessible
 * name — which is how a collapsed sidebar becomes a column of buttons all
 * announced as "link".
 */
export function SidebarMenuLabel({ className, ...props }: ComponentPropsWithRef<"span">) {
  const { open } = useSidebar("SidebarMenuLabel");

  return (
    <span
      data-slot="sidebar-menu-label"
      className={cn("min-w-0 truncate", !open && "sr-only", className)}
      {...props}
    />
  );
}

export interface SidebarTriggerProps extends ComponentPropsWithRef<"button"> {
  /** Overrides the label, which otherwise says what pressing it will do. */
  label?: string;
}

export function SidebarTrigger({ className, label, ...props }: SidebarTriggerProps) {
  const { open, toggle, sidebarId } = useSidebar("SidebarTrigger");

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-expanded={open}
      aria-controls={sidebarId}
      // Says what pressing it does, not what the state currently is. "Collapse
      // navigation" while it is expanded is the useful half.
      aria-label={label ?? (open ? "Collapse navigation" : "Expand navigation")}
      onClick={toggle}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
        focusRing,
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M9 4v16" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

/** The region the sidebar sits beside. */
export function SidebarInset({ className, ...props }: ComponentPropsWithRef<"main">) {
  return (
    <main data-slot="sidebar-inset" className={cn("min-w-0 flex-1", className)} {...props} />
  );
}
