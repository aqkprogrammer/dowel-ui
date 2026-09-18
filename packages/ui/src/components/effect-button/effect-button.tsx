// Ported from amicro "Buttons" (MIT, © 2026 Syed Subhan Uddin) and the SmoothUI Clip Corners Button (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * One mechanism, eight effects (ADR 0014). Every effect is a response to the
 * button being hovered OR keyboard-focused — never hover alone, or a keyboard
 * user gets a flatter control than a mouse user.
 *
 * - Transitions are Tailwind `group-hover/effect:` + `group-focus-visible/effect:`
 *   pairs on the parts, so a consumer can restyle any of them.
 * - One-shot and looping motions (pulse, shake, glare, ring) are keyframes in
 *   the hoisted stylesheet, keyed on `[data-slot][data-effect]`. Their
 *   resting state is the "off" frame, so when the reduced-motion blanket
 *   collapses an animation to one instant iteration, the part simply rests.
 * - Nothing waits on a JavaScript timer: the effect is the CSS state.
 */

const PREFIX = "dowel-effect-button";

/** A duration scaled by --motion-scale: decoration stops under reduced motion. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** A rule that applies while the root is hovered (on hover devices) or focus-visible. */
function whenActive(effect: string, part: string, declarations: string): string {
  const root = `[data-slot=effect-button][data-effect=${effect}]`;
  const child = `>[data-slot=effect-button-${part}]`;
  return (
    `@media (hover:hover){${root}:hover${child}{${declarations}}}` +
    `${root}:focus-visible${child}{${declarations}}`
  );
}

const STYLES = `
@keyframes ${PREFIX}-pulse{0%,100%{scale:1}50%{scale:1.25}}
@keyframes ${PREFIX}-shake{0%,100%{translate:0 0;rotate:0deg}25%,75%{translate:0 -2px;rotate:-10deg}50%{translate:0 0;rotate:10deg}}
@keyframes ${PREFIX}-glare{0%{translate:-100% 0}46%,100%{translate:100% 0}}
@keyframes ${PREFIX}-ring{from{opacity:1;scale:1}to{opacity:0;scale:1.15}}
${whenActive("pulse", "icon", `animation:${PREFIX}-pulse ${scaled(400)} ease-in-out`)}
${whenActive("shake", "icon", `animation:${PREFIX}-shake ${scaled(400)} ease-in-out`)}
${whenActive("glare", "glare", `animation:${PREFIX}-glare ${scaled(1850)} ease-in-out infinite`)}
${whenActive("expand-ring", "ring", `animation:${PREFIX}-ring ${scaled(600)} ease-out`)}
`;

export const effectButtonEffects = [
  "slide-arrow",
  "pulse",
  "rotate",
  "shake",
  "glare",
  "text-reveal",
  "expand-ring",
  "clip-corners",
] as const;

export type EffectButtonEffect = (typeof effectButtonEffects)[number];

export type EffectButtonTone =
  "current" | "primary" | "success" | "warning" | "destructive" | "info";

const effectButtonVariants = cva("group/effect relative", {
  variants: {
    effect: {
      // The icons carry their own spacing so the leaving one can take its gap with it.
      "slide-arrow": "gap-0",
      pulse: "",
      rotate: "",
      shake: "",
      glare: "overflow-hidden",
      "text-reveal": "",
      "expand-ring": "",
      "clip-corners": "",
    },
  },
  defaultVariants: { effect: "slide-arrow" },
});

/** The colour a toned part takes while the button is active. Literal, so Tailwind can see it. */
const TONE: Record<EffectButtonTone, string> = {
  current: "",
  primary: "group-hover/effect:text-primary group-focus-visible/effect:text-primary",
  success: "group-hover/effect:text-success group-focus-visible/effect:text-success",
  warning: "group-hover/effect:text-warning group-focus-visible/effect:text-warning",
  destructive:
    "group-hover/effect:text-destructive group-focus-visible/effect:text-destructive",
  info: "group-hover/effect:text-info group-focus-visible/effect:text-info",
};

const settle = "duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]";
const fade = "duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]";

/** Classes for the leading icon wrapper, per effect. */
const ICON: Record<EffectButtonEffect, string> = {
  "slide-arrow": cn(
    "me-2 grid grid-cols-[1fr] transition-[grid-template-columns,margin,opacity,translate]",
    settle,
    "group-hover/effect:me-0 group-hover/effect:-translate-x-2.5 group-hover/effect:grid-cols-[0fr] group-hover/effect:opacity-0 group-hover/effect:rtl:translate-x-2.5",
    "group-focus-visible/effect:me-0 group-focus-visible/effect:-translate-x-2.5 group-focus-visible/effect:grid-cols-[0fr] group-focus-visible/effect:opacity-0 group-focus-visible/effect:rtl:translate-x-2.5",
  ),
  pulse: cn(
    "transition-colors [&_svg]:transition-[fill,color]",
    fade,
    "group-hover/effect:[&_svg]:fill-current group-focus-visible/effect:[&_svg]:fill-current",
  ),
  rotate: cn(
    "transition-[rotate]",
    settle,
    "group-hover/effect:rotate-180 group-focus-visible/effect:rotate-180",
  ),
  shake: cn("transition-colors", fade),
  glare: "",
  "text-reveal": cn(
    "transition-[rotate]",
    settle,
    "group-hover/effect:rotate-45 group-focus-visible/effect:rotate-45",
  ),
  "expand-ring": cn(
    "transition-[scale]",
    settle,
    "group-hover/effect:scale-110 group-focus-visible/effect:scale-110",
  ),
  "clip-corners": "",
};

const TRAILING = cn(
  "ms-0 grid translate-x-2.5 grid-cols-[0fr] opacity-0 transition-[grid-template-columns,margin,opacity,translate] rtl:-translate-x-2.5",
  settle,
  "group-hover/effect:ms-2 group-hover/effect:translate-x-0 group-hover/effect:grid-cols-[1fr] group-hover/effect:opacity-100 group-hover/effect:rtl:translate-x-0",
  "group-focus-visible/effect:ms-2 group-focus-visible/effect:translate-x-0 group-focus-visible/effect:grid-cols-[1fr] group-focus-visible/effect:opacity-100 group-focus-visible/effect:rtl:translate-x-0",
);

const REVEAL = cn(
  "block transition-[translate]",
  settle,
  "group-hover/effect:-translate-y-full group-focus-visible/effect:-translate-y-full",
);

/*
 * The corners move inward by animating their logical inset, so the travel
 * follows the reading direction without a per-direction translate. Each
 * triangle is drawn for LTR and mirrored in RTL, where start and end swap.
 */
const CORNER_MOVE = cn("transition-[top,bottom,inset-inline-start,inset-inline-end]", settle);
const CORNERS = [
  {
    name: "top-start",
    className:
      "top-1.5 start-1.5 [clip-path:polygon(0_0,100%_0,0_100%)] group-hover/effect:top-2.5 group-hover/effect:start-2.5 group-focus-visible/effect:top-2.5 group-focus-visible/effect:start-2.5",
  },
  {
    name: "top-end",
    className:
      "top-1.5 end-1.5 [clip-path:polygon(0_0,100%_0,100%_100%)] group-hover/effect:top-2.5 group-hover/effect:end-2.5 group-focus-visible/effect:top-2.5 group-focus-visible/effect:end-2.5",
  },
  {
    name: "bottom-start",
    className:
      "bottom-1.5 start-1.5 [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover/effect:bottom-2.5 group-hover/effect:start-2.5 group-focus-visible/effect:bottom-2.5 group-focus-visible/effect:start-2.5",
  },
  {
    name: "bottom-end",
    className:
      "bottom-1.5 end-1.5 [clip-path:polygon(100%_0,100%_100%,0_100%)] group-hover/effect:bottom-2.5 group-hover/effect:end-2.5 group-focus-visible/effect:bottom-2.5 group-focus-visible/effect:end-2.5",
  },
] as const;

export interface EffectButtonProps extends ButtonProps {
  /** The micro-interaction played while the button is hovered or keyboard-focused. */
  effect?: EffectButtonEffect;
  /** Leading icon. Decorative: the label (or `aria-label`) names the button. */
  icon?: ReactNode;
  /**
   * Icon that slides in at the end for `effect="slide-arrow"`. It is treated as
   * directional and mirrored in right-to-left layouts.
   */
  trailingIcon?: ReactNode;
  /** Colour the icon (`pulse`) or icon and label (`shake`) take while active. */
  tone?: EffectButtonTone;
}

/** A Button with a hover and focus micro-interaction on its icon or surface. */
export function EffectButton({
  effect = "slide-arrow",
  icon,
  trailingIcon,
  tone = "current",
  asChild = false,
  loading = false,
  className,
  children,
  ...props
}: EffectButtonProps) {
  // Pulse tones its icon; shake tones icon and label, as a warning of what the click does.
  const toned = effect === "pulse" || effect === "shake" ? TONE[tone] : "";
  const labelToned = effect === "shake" ? TONE[tone] : "";

  function inner(label: ReactNode): ReactNode {
    const hasLabel = label !== undefined && label !== null && label !== false && label !== "";
    return (
      <>
        {icon && !loading ? (
          <span
            data-slot="effect-button-icon"
            aria-hidden="true"
            className={cn("inline-flex shrink-0", ICON[effect], toned)}
          >
            {effect === "slide-arrow" ? (
              <span className="flex min-w-0 overflow-hidden">{icon}</span>
            ) : (
              icon
            )}
          </span>
        ) : null}
        {hasLabel ? (
          effect === "text-reveal" ? (
            <span
              data-slot="effect-button-label"
              className="relative inline-flex overflow-hidden"
            >
              <span className={REVEAL}>{label}</span>
              <span aria-hidden="true" className={cn("absolute start-0 top-full", REVEAL)}>
                {label}
              </span>
            </span>
          ) : (
            <span
              data-slot="effect-button-label"
              className={cn("transition-colors", fade, labelToned)}
            >
              {label}
            </span>
          )
        ) : null}
        {effect === "slide-arrow" && trailingIcon ? (
          <span data-slot="effect-button-trailing-icon" aria-hidden="true" className={TRAILING}>
            <span className={cn("flex min-w-0 overflow-hidden", mirrorForDirection)}>
              {trailingIcon}
            </span>
          </span>
        ) : null}
        {effect === "glare" ? (
          <span
            data-slot="effect-button-glare"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 -translate-x-full bg-[linear-gradient(110deg,transparent_35%,color-mix(in_oklab,currentColor_22%,transparent)_50%,transparent_65%)]"
          />
        ) : null}
        {effect === "expand-ring" ? (
          <span
            data-slot="effect-button-ring"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] border border-current/25 opacity-0"
          />
        ) : null}
        {effect === "clip-corners"
          ? CORNERS.map((corner) => (
              <span
                key={corner.name}
                data-slot="effect-button-corner"
                data-corner={corner.name}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute size-2 bg-current",
                  mirrorForDirection,
                  CORNER_MOVE,
                  corner.className,
                )}
              />
            ))
          : null}
      </>
    );
  }

  // With asChild the consumer's element becomes the button, so the parts go
  // inside it rather than beside it: Slot accepts exactly one child.
  let content: ReactNode;
  if (asChild && isValidElement<{ children?: ReactNode }>(children)) {
    const child = children as ReactElement<{ children?: ReactNode }>;
    content = cloneElement(child, undefined, inner(child.props.children));
  } else {
    content = inner(children);
  }

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Button
        data-slot="effect-button"
        data-effect={effect}
        asChild={asChild}
        loading={loading}
        className={cn(effectButtonVariants({ effect }), className)}
        {...props}
      >
        {content}
      </Button>
    </>
  );
}

export { effectButtonVariants };
