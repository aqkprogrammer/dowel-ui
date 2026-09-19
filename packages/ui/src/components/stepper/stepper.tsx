"use client";

// Ported from SmoothUI Animated Stepper (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A wizard's progress as what it is: an ordered list of steps, the current one
 * marked with aria-current="step". Steps are only buttons when there is
 * somewhere to go — by default a stepper is an indicator the wizard drives,
 * and a row of buttons that do nothing is worse than none.
 *
 * When steps are navigable they share one tab stop: arrow keys (mirrored in
 * RTL, vertical in a vertical stepper), Home and End move focus between them,
 * and Enter or Space goes to the focused step. Focus and selection are kept
 * apart, as in a toolbar, so walking the list does not throw away the page.
 *
 * The source animated with `motion`; everything here is a transition or a
 * keyframe: the connector fills, the number crossfades into a check that
 * draws itself, the current step pulses once, and the content slides in from
 * the side it is coming from. All of it is decoration and stops under reduced
 * motion.
 */

const PREFIX = "dowel-stepper";

const STYLES = `
@keyframes ${PREFIX}-pulse{from{opacity:.5;transform:scale(1)}to{opacity:0;transform:scale(1.6)}}
@keyframes ${PREFIX}-enter{from{opacity:0;transform:translateX(calc(var(--${PREFIX}-from) * var(--${PREFIX}-flip, 1)))}}
[data-slot=stepper-pulse]{animation:${PREFIX}-pulse calc(600ms * var(--motion-scale)) var(--ease-out-quint) both}
[data-slot=stepper-panel]{animation:${PREFIX}-enter calc(250ms * var(--motion-scale)) var(--ease-out-quint) both}
[data-slot=stepper-panel]:dir(rtl){--${PREFIX}-flip:-1}
[data-slot=stepper-connector-fill]{transform-origin:left}
[data-slot=stepper-connector-fill]:dir(rtl){transform-origin:right}
[data-orientation=vertical] [data-slot=stepper-connector-fill]{transform-origin:top}
`;

const stepperVariants = cva("flex", {
  variants: {
    orientation: {
      horizontal: "flex-row items-start",
      vertical: "flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

/** The round marker for a step, by its state. */
const stepperIndicatorVariants = cva(
  cn(
    "relative grid size-10 shrink-0 place-items-center rounded-full border-2 text-sm font-medium",
    "transition-[background-color,border-color,color,scale] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  ),
  {
    variants: {
      state: {
        complete: "border-primary bg-primary text-primary-foreground",
        current: "border-primary bg-primary text-primary-foreground",
        upcoming: "border-border bg-background text-muted-foreground",
      },
    },
    defaultVariants: {
      state: "upcoming",
    },
  },
);

export type StepperStepState = "complete" | "current" | "upcoming";

export interface StepperStep {
  label: ReactNode;
  description?: ReactNode;
  /** Shown in the marker instead of the step number, until the step is complete. */
  icon?: ReactNode;
  /** Rendered below the list while this step is current. */
  content?: ReactNode;
  disabled?: boolean;
}

export interface StepperProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, VariantProps<typeof stepperVariants> {
  steps: StepperStep[];
  /** Controlled current step, zero-based. */
  step?: number;
  /** Initial step when uncontrolled. */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /**
   * Which steps can be chosen directly.
   *
   * - `none` (default): an indicator only; the wizard's own buttons move it.
   * - `completed`: finished steps can be revisited, as most wizards allow.
   * - `all`: any step, as in the source's `allowClickNavigation`.
   */
  navigation?: "none" | "completed" | "all";
  /** Names the list. */
  label?: string;
  /** Appended to a finished step's name for assistive technology. */
  completedLabel?: string;
}

function isRightToLeft(element: Element): boolean {
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="col-start-1 row-start-1 size-5 group-data-[state=current]/step:opacity-0 group-data-[state=upcoming]/step:opacity-0"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="transition-[stroke-dashoffset] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)] [stroke-dasharray:1] group-data-[state=current]/step:[stroke-dashoffset:1] group-data-[state=upcoming]/step:[stroke-dashoffset:1]"
      />
    </svg>
  );
}

/** A multi-step wizard's progress, with optional per-step content. */
export function Stepper({
  className,
  steps,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  orientation = "horizontal",
  navigation = "none",
  label = "Progress",
  completedLabel = "completed",
  ...props
}: StepperProps) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultStep);
  const current = Math.max(0, Math.min(stepProp ?? uncontrolled, steps.length - 1));
  const [shown, setShown] = useState(current);
  const [direction, setDirection] = useState(1);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const vertical = orientation === "vertical";

  // Which way the content slides: forward comes in from the end side.
  if (shown !== current) {
    setDirection(current > shown ? 1 : -1);
    setShown(current);
  }

  const navigable = (index: number) =>
    !steps[index]?.disabled &&
    (navigation === "all" || (navigation === "completed" && index <= current));

  function go(index: number) {
    if (index === current || !navigable(index)) return;
    if (stepProp === undefined) setUncontrolled(index);
    onStepChange?.(index);
  }

  const stops = steps.map((_, index) => index).filter(navigable);
  const tabStop = stops.includes(focusIndex ?? -1)
    ? focusIndex
    : stops.includes(current)
      ? current
      : (stops[stops.length - 1] ?? null);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (stops.length === 0 || tabStop === null) return;
    const rtl = isRightToLeft(event.currentTarget);
    const nextKey = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const previousKey = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const at = stops.indexOf(tabStop);
    const target = {
      [nextKey]: stops[Math.min(at + 1, stops.length - 1)],
      [previousKey]: stops[Math.max(at - 1, 0)],
      Home: stops[0],
      End: stops[stops.length - 1],
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setFocusIndex(target);
    buttons.current[target]?.focus();
  }

  const content = steps[current]?.content;

  return (
    <div
      data-slot="stepper"
      data-orientation={orientation}
      className={cn("flex w-full gap-6", vertical ? "flex-row" : "flex-col", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <ol
        aria-label={label}
        data-slot="stepper-list"
        className={cn(stepperVariants({ orientation }), vertical ? "shrink-0" : "w-full")}
      >
        {steps.map((step, index) => {
          const state: StepperStepState =
            index < current ? "complete" : index === current ? "current" : "upcoming";
          const last = index === steps.length - 1;
          const base = `${id}-${String(index)}`;
          const inner = (
            <>
              <span
                aria-hidden="true"
                data-slot="stepper-indicator"
                className={stepperIndicatorVariants({ state })}
              >
                {state === "current" ? (
                  <span
                    key={current}
                    data-slot="stepper-pulse"
                    className="absolute -inset-0.5 rounded-full border-2 border-primary"
                  />
                ) : null}
                <span className="grid place-items-center">
                  <span className="col-start-1 row-start-1 transition-[opacity,scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)] group-data-[state=complete]/step:scale-50 group-data-[state=complete]/step:opacity-0 [&_svg]:size-4">
                    {step.icon ?? index + 1}
                  </span>
                  <Check />
                </span>
              </span>
              <span
                className={cn("grid gap-0.5 text-start", !vertical && "sr-only sm:not-sr-only")}
              >
                <span
                  id={`${base}-label`}
                  data-slot="stepper-label"
                  className="text-sm font-medium text-muted-foreground transition-colors duration-[var(--duration-normal)] group-data-[state=current]/step:text-foreground"
                >
                  {step.label}
                </span>
                {state === "complete" ? (
                  <span id={`${base}-status`} className="sr-only">
                    {completedLabel}
                  </span>
                ) : null}
                {step.description != null ? (
                  <span
                    id={`${base}-description`}
                    data-slot="stepper-description"
                    className="text-xs text-muted-foreground"
                  >
                    {step.description}
                  </span>
                ) : null}
              </span>
            </>
          );
          const shared = {
            "data-slot": "stepper-trigger",
            "aria-current": state === "current" ? ("step" as const) : undefined,
            className: cn("flex items-center gap-3 rounded-md", vertical && "items-start"),
          };

          return (
            <li
              key={index}
              data-slot="stepper-item"
              data-state={state}
              className={cn(
                "group/step relative flex",
                vertical ? "flex-col pb-6 last:pb-0" : "items-center",
                !vertical && !last && "flex-1",
              )}
            >
              {navigable(index) ? (
                <button
                  {...shared}
                  ref={(node) => {
                    buttons.current[index] = node;
                  }}
                  type="button"
                  tabIndex={tabStop === index ? 0 : -1}
                  aria-labelledby={
                    state === "complete" ? `${base}-label ${base}-status` : `${base}-label`
                  }
                  aria-describedby={
                    step.description != null ? `${base}-description` : undefined
                  }
                  className={cn(
                    shared.className,
                    "cursor-pointer [&:active_[data-slot=stepper-indicator]]:scale-90",
                    focusRing,
                  )}
                  onFocus={() => {
                    setFocusIndex(index);
                  }}
                  onKeyDown={handleKeyDown}
                  onClick={() => {
                    go(index);
                  }}
                >
                  {inner}
                </button>
              ) : (
                <div {...shared} data-disabled={step.disabled ? "" : undefined}>
                  {inner}
                </div>
              )}
              {!last ? (
                <span
                  aria-hidden="true"
                  data-slot="stepper-connector"
                  className={cn(
                    "overflow-hidden rounded-full bg-muted",
                    vertical
                      ? "absolute start-5 top-12 bottom-2 w-0.5 -translate-x-1/2 rtl:translate-x-1/2"
                      : "mx-2 h-0.5 flex-1",
                  )}
                >
                  <span
                    data-slot="stepper-connector-fill"
                    className={cn(
                      "block size-full bg-primary transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                      state !== "complete" && (vertical ? "scale-y-0" : "scale-x-0"),
                    )}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {content != null ? (
        <div
          key={current}
          role="group"
          aria-labelledby={`${id}-${String(current)}-label`}
          data-slot="stepper-panel"
          style={{ [`--${PREFIX}-from`]: `${String(direction * 20)}px` } as CSSProperties}
          className="min-w-0 flex-1"
        >
          {content}
        </div>
      ) : null}
    </div>
  );
}

export { stepperIndicatorVariants, stepperVariants };
