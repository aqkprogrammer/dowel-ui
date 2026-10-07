"use client";

// Original design (pattern inspired by Animate UI Toggle Group; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { createContext, useContext, useId, useState, type ComponentPropsWithRef } from "react";

import { toggleVariants } from "@/components/toggle";
import { cn } from "@/lib/utils";

/*
 * A row of toggles where the highlight has somewhere to go.
 *
 * - `type="single"`: one pill, shared between the items through a `motion`
 *   layoutId, slides from the old choice to the new one on a spring. The id is
 *   scoped to the group with useId, so two groups on a page never trade pills.
 * - `type="multiple"`: every pressed item grows its own highlight from the
 *   centre on a spring, and shrinks it away when released.
 *
 * Moving between two DOM positions is the shared-layout case ADR 0014 keeps
 * `motion` for. The tree is wrapped in `MotionConfig reducedMotion="user"`, so
 * under reduced motion the pill jumps and the highlights appear at once. No
 * highlight animates on first paint.
 *
 * Underneath it is Radix ToggleGroup: arrow keys move between items (roving
 * focus), and each item is a button with aria-pressed — or, in single mode, a
 * radio in a radiogroup. The highlight is an aria-hidden layer behind the label.
 */

const SPRING: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.9 };
const POP: Transition = { type: "spring", stiffness: 600, damping: 26 };

const toggleGroupVariants = cva("isolate inline-flex w-fit items-center gap-1 rounded-lg", {
  variants: {
    variant: {
      default: "",
      outline: "border border-input bg-background p-0.5 shadow-xs",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const toggleGroupHighlightVariants = cva(
  "pointer-events-none absolute inset-0 -z-10 rounded-[inherit]",
  {
    variants: {
      variant: {
        default: "bg-accent",
        outline: "bg-accent shadow-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type Size = VariantProps<typeof toggleVariants>["size"];
type Variant = VariantProps<typeof toggleGroupVariants>["variant"];

interface ToggleGroupContextValue {
  type: "single" | "multiple";
  selected: readonly string[];
  layoutId: string;
  variant: Variant;
  size: Size;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function toList(value: string | string[] | undefined): string[] {
  if (value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export type ToggleGroupProps = ComponentPropsWithRef<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupVariants> &
  Pick<VariantProps<typeof toggleVariants>, "size">;

/** A set of toggles whose highlight slides between choices (single) or springs in per item (multiple). */
export function ToggleGroup(allProps: ToggleGroupProps) {
  // `onValueChange` stays on `allProps` and is called through it, so the
  // single/multiple narrowing reaches the call. The rest spreads onto the root
  // first and `selection` overrides it.
  const { className, variant, size, type, value, defaultValue, ...props } = allProps;
  const layoutId = `${useId()}-toggle-group-highlight`;
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => toList(defaultValue));
  const controlled = value !== undefined;
  const selected = controlled ? toList(value) : uncontrolled;

  function commit(next: string[]) {
    if (!controlled) setUncontrolled(next);
  }

  const selection =
    allProps.type === "single"
      ? {
          type: allProps.type,
          value: selected[0] ?? "",
          onValueChange: (next: string) => {
            commit(toList(next));
            allProps.onValueChange?.(next);
          },
        }
      : {
          type: allProps.type,
          value: selected,
          onValueChange: (next: string[]) => {
            commit(next);
            allProps.onValueChange?.(next);
          },
        };

  return (
    <MotionConfig reducedMotion="user">
      <ToggleGroupContext value={{ type, selected, layoutId, variant, size }}>
        <ToggleGroupPrimitive.Root
          data-slot="toggle-group"
          data-variant={variant ?? "default"}
          className={cn(toggleGroupVariants({ variant }), className)}
          {...props}
          {...selection}
        />
      </ToggleGroupContext>
    </MotionConfig>
  );
}

export type ToggleGroupItemProps = Omit<
  ComponentPropsWithRef<typeof ToggleGroupPrimitive.Item>,
  "asChild"
>;

/** One choice in a ToggleGroup. Takes its size and variant from the group. */
export function ToggleGroupItem({
  className,
  value,
  children,
  ...props
}: ToggleGroupItemProps) {
  const group = useContext(ToggleGroupContext);
  if (!group) {
    throw new Error("ToggleGroupItem must be rendered inside a ToggleGroup.");
  }
  const pressed = group.selected.includes(value);
  const highlight = toggleGroupHighlightVariants({ variant: group.variant });

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      value={value}
      className={cn(
        toggleVariants({ variant: "default", size: group.size }),
        // The pill travels between items, so an item must neither clip it nor
        // trap it in its own stacking context: it paints in the group's, under
        // every label. The pill is the "on" surface, so the chosen item drops
        // its own hover fill rather than covering it.
        "isolation-auto overflow-visible data-[state=on]:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      {group.type === "single" ? (
        pressed ? (
          <motion.span
            data-slot="toggle-group-highlight"
            aria-hidden="true"
            layoutId={group.layoutId}
            transition={SPRING}
            className={highlight}
          />
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {pressed ? (
            <motion.span
              key="highlight"
              data-slot="toggle-group-highlight"
              aria-hidden="true"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.14 } }}
              transition={POP}
              className={highlight}
            />
          ) : null}
        </AnimatePresence>
      )}
      <span
        data-slot="toggle-group-item-content"
        className="inline-flex items-center gap-[inherit]"
      >
        {children}
      </span>
    </ToggleGroupPrimitive.Item>
  );
}

export { toggleGroupHighlightVariants, toggleGroupVariants };
