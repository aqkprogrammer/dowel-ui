"use client";

// Ported from amicro (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A row of links where the one under the pointer — or under keyboard focus —
 * stays sharp and the rest blur and dim. The source tracked hover only; focus
 * drives the same state here, because a keyboard user deserves the same
 * emphasis. Pointer takes precedence while it is over a link, and keyboard
 * focus holds the effect once the pointer has gone.
 *
 * The blur is decoration: it never hides a link from assistive technology,
 * and the transition stops under reduced motion (the blur itself remains, as
 * it is a state, not movement).
 */

interface FocusBlurContextValue {
  activeId: string | null;
  setHovered: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  showBrackets: boolean;
}

const FocusBlurContext = createContext<FocusBlurContextValue | null>(null);

function useFocusBlur(): FocusBlurContextValue {
  const context = useContext(FocusBlurContext);
  if (!context) throw new Error("FocusBlurLink must be used inside FocusBlurLinks.");
  return context;
}

const focusBlurLinksVariants = cva("flex flex-wrap items-center justify-center font-semibold", {
  variants: {
    size: {
      sm: "gap-4 text-sm",
      md: "gap-6 text-lg",
      lg: "gap-8 text-2xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface FocusBlurLinksProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof focusBlurLinksVariants> {
  /** Blur applied to the other links, in pixels. */
  blurAmount?: number;
  /** Opacity of the other links, from 0 to 1. */
  dimOpacity?: number;
  /** Draws a dashed bracket around the emphasised link. */
  showBrackets?: boolean;
}

/** A row of links that blurs every link but the one being pointed at or focused. */
export function FocusBlurLinks({
  className,
  size,
  blurAmount = 4,
  dimOpacity = 0.4,
  showBrackets = true,
  style,
  children,
  ...props
}: FocusBlurLinksProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const activeId = hovered ?? focused;

  const value = useMemo(
    () => ({ activeId, setHovered, setFocused, showBrackets }),
    [activeId, showBrackets],
  );

  return (
    <FocusBlurContext value={value}>
      <div
        data-slot="focus-blur-links"
        data-state={activeId ? "focused" : "idle"}
        className={cn(focusBlurLinksVariants({ size }), className)}
        style={
          {
            "--focus-blur-amount": `${String(blurAmount)}px`,
            "--focus-blur-opacity": String(dimOpacity),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </FocusBlurContext>
  );
}

export interface FocusBlurLinkProps extends ComponentPropsWithRef<"a"> {
  /** Renders the child element — a router `Link`, say — instead of an `<a>`. */
  asChild?: boolean;
}

/** One link in a `FocusBlurLinks` row. */
export function FocusBlurLink({
  className,
  asChild = false,
  children,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: FocusBlurLinkProps) {
  const { activeId, setHovered, setFocused, showBrackets } = useFocusBlur();
  const id = useId();
  // A click focuses the link too; only keyboard focus should hold the effect
  // after the pointer leaves, so the origin of focus is tracked by hand.
  const pressing = useRef(false);
  const Comp = asChild ? Slot.Root : "a";
  const state = activeId === id ? "active" : activeId ? "dimmed" : "idle";

  return (
    <Comp
      data-slot="focus-blur-link"
      data-state={state}
      className={cn(
        "group/link relative rounded-sm no-underline select-none",
        "transition-[filter,opacity,color] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
        "data-[state=active]:text-primary",
        "data-[state=dimmed]:opacity-[var(--focus-blur-opacity)] data-[state=dimmed]:blur-[var(--focus-blur-amount)]",
        focusRing,
        className,
      )}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event);
        setHovered(id);
      }}
      onPointerLeave={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerLeave?.(event);
        setHovered(null);
      }}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);
        pressing.current = true;
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event);
        if (!pressing.current) setFocused(id);
        pressing.current = false;
      }}
      onBlur={(event: FocusEvent<HTMLAnchorElement>) => {
        onBlur?.(event);
        setFocused(null);
      }}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      {showBrackets ? (
        <span
          aria-hidden="true"
          data-slot="focus-blur-bracket"
          className={cn(
            "pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg border-2 border-dashed border-border",
            "scale-130 opacity-0 transition-[opacity,scale] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
            "group-data-[state=active]/link:scale-110 group-data-[state=active]/link:opacity-100",
          )}
        />
      ) : null}
    </Comp>
  );
}

export { focusBlurLinksVariants };
