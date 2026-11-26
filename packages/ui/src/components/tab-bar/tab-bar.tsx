"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pill of icon tabs with a bright highlight that slides to the chosen one
 * and stretches, gooey, while it travels.
 *
 * The tabs share one width, so the highlight is one tab wide and its position
 * is a single `translate` of `index * 100%`, with nothing to measure. It
 * glides there on an overshooting curve while an inner layer plays a stretch
 * keyframe: it elongates along the direction of travel (further for a longer
 * jump), thins a little like a drop being pulled, then rebounds and settles.
 * The stretch replays on every change, keyed by a move counter, and never on
 * first paint. Durations are tokens on --motion-scale; under reduced motion
 * the highlight simply appears in its new place.
 *
 * Semantics are a Radix radio group, since the bar picks one of a few
 * sections: role="radiogroup", one radio per tab named by its `label` (the
 * icons are aria-hidden), roving focus with the arrow keys, a visible focus
 * ring. Wire `onValueChange` to your router; if each tab is a link to a page,
 * use bottom-nav instead. `--dir` flips the translation in right-to-left
 * layouts so the highlight follows the mirrored order.
 */

const PREFIX = "dowel-tab-bar";

const STYLES = `
@keyframes ${PREFIX}-goo{0%{transform:scale(1,1)}35%{transform:scale(var(--${PREFIX}-reach),.82)}65%{transform:scale(.94,1.06)}85%{transform:scale(1.02,.99)}100%{transform:scale(1,1)}}
.${PREFIX} [data-part=pill][data-moving]{animation:${PREFIX}-goo var(--duration-slower) var(--ease-out-quint)}
`;

const tabBarVariants = cva(
  cn(
    PREFIX,
    "relative isolate inline-grid shrink-0 auto-cols-fr grid-flow-col rounded-full bg-muted p-[0.3em]",
    "[--dir:1] rtl:[--dir:-1]",
  ),
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-base",
        lg: "text-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[1em]"
    >
      {children}
    </svg>
  );
}

/** The four tabs of the reference: home, search, saved and profile. */
const DEFAULT_ITEMS: TabBarItem[] = [
  {
    value: "home",
    label: "Home",
    icon: (
      <Icon>
        <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" />
      </Icon>
    ),
  },
  {
    value: "search",
    label: "Search",
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.4-4.4" />
      </Icon>
    ),
  },
  {
    value: "saved",
    label: "Saved",
    icon: (
      <Icon>
        <path d="M12 20s-7.5-4.5-7.5-10.1A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.7C19.5 15.5 12 20 12 20Z" />
      </Icon>
    ),
  },
  {
    value: "profile",
    label: "Profile",
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
      </Icon>
    ),
  },
];

export interface TabBarItem {
  value: string;
  /** The accessible name of the tab. Icons alone are not announced. */
  label: string;
  /** An aria-hidden glyph, sized to 1em. */
  icon: ReactNode;
  disabled?: boolean;
}

export interface TabBarProps
  extends
    Omit<
      ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>,
      "children" | "value" | "defaultValue" | "onValueChange" | "orientation"
    >,
    VariantProps<typeof tabBarVariants> {
  /** The tabs. Defaults to home, search, saved and profile. */
  items?: TabBarItem[];
  /** Controlled selection. */
  value?: string;
  /** Initial selection when uncontrolled. Defaults to the first tab. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

/** A pill of icon tabs with a gooey sliding highlight. */
export function TabBar({
  className,
  size,
  items = DEFAULT_ITEMS,
  value: valueProp,
  defaultValue,
  onValueChange,
  style,
  ...props
}: TabBarProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value ?? "");
  const value = valueProp ?? uncontrolled;
  const index = items.findIndex((item) => item.value === value);

  const [previous, setPrevious] = useState(index);
  const [move, setMove] = useState({ count: 0, distance: 0 });
  if (previous !== index) {
    setPrevious(index);
    if (previous !== -1 && index !== -1) {
      setMove({ count: move.count + 1, distance: Math.abs(index - previous) });
    }
  }

  return (
    <RadioGroupPrimitive.Root
      data-slot="tab-bar"
      orientation="horizontal"
      value={value}
      onValueChange={(next) => {
        if (valueProp === undefined) setUncontrolled(next);
        onValueChange?.(next);
      }}
      className={cn(tabBarVariants({ size }), className)}
      style={
        {
          "--n": items.length,
          "--i": Math.max(index, 0),
          [`--${PREFIX}-reach`]: 1 + Math.min(move.distance, 3) * 0.35,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-part="highlight"
        className={cn(
          "pointer-events-none absolute inset-y-[0.3em] start-[0.3em] -z-10",
          "w-[calc((100%-0.6em)/var(--n))]",
          "translate-x-[calc(var(--i)*100%*var(--dir))]",
          "transition-[translate] duration-[var(--duration-slower)] ease-[var(--ease-overshoot)]",
          index === -1 && "opacity-0",
        )}
      >
        <span
          key={move.count}
          data-part="pill"
          data-moving={move.count > 0 ? "" : undefined}
          className="block size-full rounded-full bg-foreground shadow-sm"
        />
      </span>
      {items.map((item) => (
        <RadioGroupPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          aria-label={item.label}
          data-slot="tab-bar-item"
          className={cn(
            "relative grid h-[2em] w-[2.75em] cursor-pointer place-items-center rounded-full",
            "text-muted-foreground transition-colors duration-[var(--duration-normal)]",
            "hover:text-foreground data-[state=checked]:text-background",
            "disabled:cursor-not-allowed disabled:opacity-55",
            focusRing,
          )}
        >
          {item.icon}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { tabBarVariants };
