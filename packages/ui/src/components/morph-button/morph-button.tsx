"use client";

// Ported from amicro (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * One mechanism for the whole amicro morph family (ADR 0014): an icon — and
 * optionally a label — that crossfades into a second one when the button is
 * active. The source swaps on hover; a library button has to reflect *state*,
 * so `active` is a real, controllable value and hover is only one of the ways
 * to drive it.
 *
 * Both layers are always mounted and stacked in one grid cell. Swapping is a
 * CSS transition on data-state, so there is no animation library, no
 * unmount-on-exit, and the global reduced-motion rule stops it outright:
 * this is decoration, never an indicator.
 */

/** Icon layers: how the resting icon leaves and the active one arrives. */
const morphButtonVariants = cva(
  cn(
    "col-start-1 row-start-1 flex items-center justify-center",
    "transition-[opacity,scale,translate,rotate,color,fill] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
    "data-[state=hidden]:opacity-0",
  ),
  {
    variants: {
      /** `scale` pops (0.5 → 1), `rise` slides vertically, `tilt` rocks ±15°. */
      morph: {
        scale: "data-[state=hidden]:scale-50",
        rise: "data-[state=hidden]:scale-80",
        tilt: "data-[state=hidden]:scale-80",
      },
      layer: {
        rest: "",
        active: "",
      },
    },
    compoundVariants: [
      // The resting icon leaves upward while the active one rises from below.
      { morph: "rise", layer: "rest", className: "data-[state=hidden]:-translate-y-[15px]" },
      { morph: "rise", layer: "active", className: "data-[state=hidden]:translate-y-[15px]" },
      { morph: "tilt", layer: "rest", className: "data-[state=hidden]:rotate-15" },
      { morph: "tilt", layer: "active", className: "data-[state=hidden]:-rotate-15" },
    ],
    defaultVariants: {
      morph: "scale",
      layer: "rest",
    },
  },
);

/** The colour the active icon takes. Semantic tokens only. */
const morphButtonToneVariants = cva("", {
  variants: {
    tone: {
      current: "",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    tone: "current",
  },
});

/** Label layers only crossfade: a scaled or rotated word is harder to read. */
const labelLayer = cn(
  "col-start-1 row-start-1 transition-[opacity,translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  "data-[state=hidden]:translate-y-1 data-[state=hidden]:opacity-0",
);

/** A spark or dot that pops in once the active layer is showing. */
const popIn = cn(
  "pointer-events-none absolute transition-[opacity,scale,rotate,translate] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
  "group-data-[state=hidden]/layer:scale-0 group-data-[state=hidden]/layer:opacity-0",
);

const SPARK_PATH = "M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.5-6.2 4.5 2.4-7.6L2 9.6h7.6z";

function Spark({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      data-slot="morph-button-spark"
      className={cn(popIn, className)}
    >
      <path d={SPARK_PATH} />
    </svg>
  );
}

export type MorphButtonTrigger = "toggle" | "transient" | "hover" | "manual";

export interface MorphButtonProps
  extends
    Omit<ButtonProps, "children" | "asChild">,
    Omit<VariantProps<typeof morphButtonVariants>, "layer">,
    VariantProps<typeof morphButtonToneVariants> {
  /** The resting icon. Decorative: it is hidden from assistive technology. */
  icon: ReactNode;
  /** The icon shown while active. Defaults to `icon`, for fill/colour-only morphs. */
  activeIcon?: ReactNode;
  /**
   * Visible text beside the icon. Without it the button is icon-only and
   * **must** be named with `aria-label` or `aria-labelledby`.
   */
  label?: ReactNode;
  /** Text shown while active, e.g. "Copied". Defaults to `label`. */
  activeLabel?: ReactNode;
  /** Controlled active state. */
  active?: boolean;
  /** Initial active state when uncontrolled. */
  defaultActive?: boolean;
  /** Called whenever the active state changes, from any trigger. */
  onActiveChange?: (active: boolean) => void;
  /**
   * What drives the active state.
   *
   * - `toggle` (default): each press flips it; exposed as `aria-pressed`.
   * - `transient`: a press activates it, and it reverts after `revertAfter`.
   *   The active label is announced through a polite live region.
   * - `hover`: active while hovered *or* focused, for parity with the demo.
   * - `manual`: only the `active` prop changes it.
   */
  trigger?: MorphButtonTrigger;
  /** Milliseconds before a `transient` button reverts. */
  revertAfter?: number;
  /** Announced when a `transient` button activates. Defaults to `activeLabel`. */
  announcement?: string;
  /** Fills the active icon with its stroke colour — bookmark, like, favourite. */
  fillOnActive?: boolean;
  /** Decoration that pops in with the active icon. */
  adornment?: "none" | "sparkle" | "dot";
}

/** A text representation of a node, when it has one. */
function textOf(node: ReactNode): string | undefined {
  return typeof node === "string" || typeof node === "number" ? String(node) : undefined;
}

/**
 * Warns, in development only, when an icon-only button has no name. It looks
 * perfect on screen and announces as an unlabelled "button".
 */
function useMissingNameWarning(hasLabel: boolean, ariaLabel?: string, ariaLabelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (hasLabel || ariaLabel || ariaLabelledBy) return;
    console.warn(
      "[MorphButton] An icon-only MorphButton has no accessible name. Pass aria-label or " +
        "aria-labelledby, or a visible label.",
    );
  }, [hasLabel, ariaLabel, ariaLabelledBy]);
}

/** A button whose icon, and optionally label, morphs when it becomes active. */
export function MorphButton({
  className,
  icon,
  activeIcon,
  label,
  activeLabel,
  active: activeProp,
  defaultActive = false,
  onActiveChange,
  trigger = "toggle",
  revertAfter = 2000,
  announcement,
  morph = "scale",
  tone = "current",
  fillOnActive = false,
  adornment = "none",
  variant = "secondary",
  size,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: MorphButtonProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultActive);
  const controlled = activeProp !== undefined;
  const active = controlled ? activeProp : uncontrolled;
  const [announced, setAnnounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether focus arrived from the keyboard rather than a click, tracked by
  // hand because :focus-visible is not queryable everywhere this runs.
  const pressing = useRef(false);
  const keyboardFocus = useRef(false);

  const setActive = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onActiveChange?.(next);
    },
    [controlled, onActiveChange],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useMissingNameWarning(label != null, props["aria-label"], props["aria-labelledby"]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (trigger === "toggle") {
      setActive(!active);
    } else if (trigger === "transient") {
      if (!active) setActive(true);
      setAnnounced(announcement ?? textOf(activeLabel) ?? textOf(label) ?? "Done");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setActive(false);
        setAnnounced("");
      }, revertAfter);
    }
  }

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    onPointerEnter?.(event);
    if (trigger === "hover" && !active) setActive(true);
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(event);
    // Keyboard focus keeps it active: the pointer leaving is not the user
    // leaving if they are still focused on it.
    if (trigger === "hover" && active && !keyboardFocus.current) setActive(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    pressing.current = true;
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    keyboardFocus.current = !pressing.current;
    pressing.current = false;
    if (trigger === "hover" && !active) setActive(true);
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    keyboardFocus.current = false;
    if (trigger === "hover" && active) setActive(false);
  }

  /*
   * Which label names the button. A toggle's name must not change with its
   * state — aria-pressed already says which state it is in, and "Mute,
   * pressed" becoming "Unmute, pressed" contradicts itself. Hover is
   * decoration. So in those modes the resting label stays in the
   * accessibility tree (merely transparent) and the active one is hidden.
   * In `transient` and `manual` modes the visible text *is* the news, so the
   * name follows it.
   */
  const nameFollowsState = trigger === "transient" || trigger === "manual";
  const morphsLabel = activeLabel !== undefined && activeLabel !== label;
  const state = (layerActive: boolean) => (layerActive ? "visible" : "hidden");

  return (
    <>
      <Button
        data-slot="morph-button"
        data-state={active ? "active" : "inactive"}
        data-trigger={trigger}
        aria-pressed={trigger === "toggle" ? active : undefined}
        variant={variant}
        size={size ?? (label == null ? "icon" : undefined)}
        className={cn(
          "transition-[background-color,border-color,color,box-shadow,scale] active:scale-[0.97]",
          className,
        )}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        <span
          data-slot="morph-button-icon"
          aria-hidden="true"
          className="relative grid shrink-0"
        >
          <span
            data-slot="morph-button-rest"
            data-state={state(!active)}
            className={morphButtonVariants({ morph, layer: "rest" })}
          >
            {icon}
          </span>
          <span
            data-slot="morph-button-active"
            data-state={state(active)}
            className={cn(
              "group/layer relative",
              morphButtonVariants({ morph, layer: "active" }),
              morphButtonToneVariants({ tone }),
              fillOnActive && "[&>svg]:fill-current",
            )}
          >
            {activeIcon ?? icon}
            {adornment === "sparkle" ? (
              <>
                <Spark
                  className={cn(
                    "-end-2 -top-3 size-2.5 delay-[var(--duration-instant)]",
                    "group-data-[state=hidden]/layer:translate-y-2.5 group-data-[state=hidden]/layer:-rotate-45",
                  )}
                />
                <Spark
                  className={cn(
                    "-start-3 -top-1 size-1.5 opacity-70 delay-[var(--duration-fast)]",
                    "group-data-[state=hidden]/layer:translate-x-2.5 group-data-[state=hidden]/layer:rotate-45",
                  )}
                />
              </>
            ) : null}
            {adornment === "dot" ? (
              <span
                data-slot="morph-button-dot"
                className={cn(
                  popIn,
                  "end-0 top-0 size-1.5 rounded-full bg-destructive delay-[var(--duration-fast)]",
                )}
              />
            ) : null}
          </span>
        </span>
        {label != null ? (
          <span data-slot="morph-button-label" className="grid">
            <span
              data-state={state(!morphsLabel || !active)}
              aria-hidden={nameFollowsState && morphsLabel && active ? true : undefined}
              className={labelLayer}
            >
              {label}
            </span>
            {morphsLabel ? (
              <span
                data-state={state(active)}
                aria-hidden={!nameFollowsState || !active ? true : undefined}
                className={labelLayer}
              >
                {activeLabel}
              </span>
            ) : null}
          </span>
        ) : null}
      </Button>
      {trigger === "transient" ? (
        <span role="status" aria-live="polite" className="sr-only">
          {announced}
        </span>
      ) : null}
    </>
  );
}

export { morphButtonToneVariants, morphButtonVariants };
