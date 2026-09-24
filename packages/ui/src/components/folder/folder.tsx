"use client";

// Original design (pattern inspired by Rare UI Folder component; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A folder drawn from four layers of DOM: the back panel with its tab, three
 * sheets of paper tucked inside, and the front flap. Hover or keyboard focus
 * fans the sheets out of the pocket; pressing it opens the folder, tipping the
 * flap toward the viewer in 3D and lifting the sheets clear.
 *
 * How it moves
 *
 * Every layer travels between three known poses — rest, fanned, open — so this
 * is CSS transitions, not springs: `--ease-overshoot` carries each sheet a
 * little past its pose and back, and the sheets are staggered so they peel out
 * one after another. Returning to rest uses a shorter ease-out, because an exit
 * is the reader already moving on. Each sheet's three poses are custom
 * properties on the sheet, and the hoisted stylesheet picks one by state; the
 * horizontal travel and rotation are multiplied by a direction flip, so the
 * fan mirrors in right-to-left layouts along with the tab. Under reduced
 * motion the poses still apply, instantly.
 *
 * Everything is sized in `em` against the artwork's font size, which the size
 * variant scales, so sm / md / lg are one set of numbers at 0.65×, 1× and 1.35×.
 *
 * Colour
 *
 * Tones set four custom properties — back, front, paper and a rim highlight —
 * from semantic tokens only. The front flap is the lighter of the two panels
 * in both modes (in dark mode "nearer" reads as lighter), which is why the
 * neutral and inverted tones swap their mix under `.dark`.
 *
 * Accessibility
 *
 * The whole folder is one native button with aria-expanded. "Expanded" is the
 * word a screen reader already has for a container that is open, and a folder
 * that opens is what the illustration shows; aria-pressed would announce a
 * setting being switched on, which is not the metaphor. When opening the
 * folder reveals real content elsewhere, point `aria-controls` at it. The
 * artwork, including anything passed as `items`, is aria-hidden: a button's
 * content is flattened into its name, so previews on the sheets would be read
 * as part of the label. The accessible name is `label`, which is also the
 * visible caption (or visually hidden with `hideLabel`). Escape closes an open
 * folder.
 */

const PREFIX = "dowel-folder";

const STYLES = `
[data-slot=folder]{--folder-flip:1}
[dir=rtl] [data-slot=folder]{--folder-flip:-1}
[data-slot=folder]:dir(rtl){--folder-flip:-1}
[data-slot=folder]:dir(ltr){--folder-flip:1}
[data-slot=folder-paper]{transform:var(--folder-rest);transition:transform calc(320ms * var(--motion-scale,1)) var(--ease-out-quint) var(--folder-delay-out)}
[data-slot=folder-front]{transform:rotateX(0deg);transition:transform calc(320ms * var(--motion-scale,1)) var(--ease-out-quint),box-shadow calc(320ms * var(--motion-scale,1)) var(--ease-out-quint)}
@media (hover:hover){
[data-slot=folder]:hover [data-slot=folder-paper]{transform:var(--folder-fan);transition-duration:calc(560ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot);transition-delay:var(--folder-delay-in)}
[data-slot=folder]:hover [data-slot=folder-front]{transform:rotateX(-16deg);transition-duration:calc(560ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot)}
}
[data-slot=folder]:focus-visible [data-slot=folder-paper]{transform:var(--folder-fan);transition-duration:calc(560ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot);transition-delay:var(--folder-delay-in)}
[data-slot=folder]:focus-visible [data-slot=folder-front]{transform:rotateX(-16deg);transition-duration:calc(560ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot)}
[data-slot=folder][data-state=open] [data-slot=folder-paper]{transform:var(--folder-lift);transition-duration:calc(640ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot);transition-delay:var(--folder-delay-in)}
[data-slot=folder][data-state=open] [data-slot=folder-front]{transform:rotateX(-44deg);transition-duration:calc(640ms * var(--motion-scale,1));transition-timing-function:var(--ease-overshoot);box-shadow:inset 0 1px 0 var(--folder-shine),inset 0 -0.75em 1.25em -0.75em var(--shadow-color),0 -0.5em 1em -0.25em var(--shadow-color)}
`;

/** The button: the artwork and its caption, scaled as one by `size`. */
const folderVariants = cva(
  cn(
    "group/folder inline-flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl p-2 text-foreground select-none",
    "[--folder-paper:var(--color-card)]",
    "[--folder-shine:color-mix(in_oklab,var(--folder-front)_55%,var(--color-background))]",
    "dark:[--folder-shine:color-mix(in_oklab,var(--folder-front)_55%,var(--color-foreground))]",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      /** Colour of the panels. The sheets are always the card surface. */
      tone: {
        neutral: cn(
          "[--folder-back:color-mix(in_oklab,var(--color-muted-foreground)_50%,var(--color-muted))]",
          "[--folder-front:color-mix(in_oklab,var(--color-muted-foreground)_24%,var(--color-muted))]",
          "dark:[--folder-back:color-mix(in_oklab,var(--color-muted-foreground)_18%,var(--color-muted))]",
          "dark:[--folder-front:color-mix(in_oklab,var(--color-muted-foreground)_40%,var(--color-muted))]",
        ),
        primary:
          "[--folder-back:var(--color-primary-active)] [--folder-front:var(--color-primary)]",
        inverted: cn(
          "[--folder-back:var(--color-foreground)]",
          "[--folder-front:color-mix(in_oklab,var(--color-foreground)_82%,var(--color-background))]",
          "dark:[--folder-back:color-mix(in_oklab,var(--color-foreground)_82%,var(--color-background))]",
          "dark:[--folder-front:var(--color-foreground)]",
        ),
      },
      /** Overall scale: 0.65×, 1× and 1.35×. */
      size: {
        sm: "[--folder-scale:0.65]",
        md: "[--folder-scale:1]",
        lg: "[--folder-scale:1.35]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

interface Pose {
  /** Percent of the sheet's width, toward the inline end. */
  x: number;
  /** Percent of the sheet's height, downward. */
  y: number;
  /** Degrees, clockwise in left-to-right layouts. */
  r: number;
}

/** Back sheet, middle sheet, front sheet — at rest, fanned and lifted. */
const POSES: { rest: Pose; fan: Pose; lift: Pose }[] = [
  {
    rest: { x: -5, y: -1, r: -4 },
    fan: { x: -15, y: -13, r: -10 },
    lift: { x: -24, y: -27, r: -16 },
  },
  { rest: { x: 0, y: 2, r: 0.5 }, fan: { x: 1, y: -20, r: -1 }, lift: { x: 1, y: -40, r: -2 } },
  { rest: { x: 5, y: 5, r: 3 }, fan: { x: 16, y: -10, r: 9 }, lift: { x: 25, y: -23, r: 14 } },
];

const FLIP = "var(--folder-flip, 1)";

function transform({ x, y, r }: Pose): string {
  return (
    `translate(calc(${String(x)}% * ${FLIP}), ${String(y)}%) ` +
    `rotate(calc(${String(r)}deg * ${FLIP}))`
  );
}

function paperStyle(pose: (typeof POSES)[number], index: number): CSSProperties {
  return {
    "--folder-rest": transform(pose.rest),
    "--folder-fan": transform(pose.fan),
    "--folder-lift": transform(pose.lift),
    // Opening deals from the back sheet; closing gathers from the front one.
    "--folder-delay-in": `calc(${String(index * 40)}ms * var(--motion-scale, 1))`,
    "--folder-delay-out": `calc(${String((POSES.length - 1 - index) * 25)}ms * var(--motion-scale, 1))`,
  } as CSSProperties;
}

/** Faint lines of "text" on a sheet with nothing else on it. */
function Lines() {
  return (
    <span className="flex flex-col gap-[0.35em] p-[0.7em]">
      <span className="h-[0.4em] w-1/2 rounded-full bg-muted-foreground/45" />
      <span className="h-[0.3em] w-[85%] rounded-full bg-muted-foreground/20" />
      <span className="h-[0.3em] w-[70%] rounded-full bg-muted-foreground/20" />
      <span className="h-[0.3em] w-[78%] rounded-full bg-muted-foreground/20" />
    </span>
  );
}

export interface FolderProps
  extends
    Omit<ComponentPropsWithRef<"button">, "children">,
    VariantProps<typeof folderVariants> {
  /** The folder's name: its visible caption and its accessible name. */
  label?: ReactNode;
  /** Keeps `label` as the accessible name but hides the caption visually. */
  hideLabel?: boolean;
  /**
   * Previews for the sheets, back to front — thumbnails, emoji, icons. Up to
   * three are shown; sheets without one show faint lines. Decorative: they
   * are hidden from assistive technology, so describe the contents elsewhere.
   */
  items?: ReactNode[];
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when a click, Enter, Space or Escape opens or closes the folder. */
  onOpenChange?: (open: boolean) => void;
}

/** A folder illustration whose sheets fan out on hover and lift out when it is opened. */
export function Folder({
  className,
  tone,
  size,
  label = "Folder",
  hideLabel = false,
  items,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClick,
  onKeyDown,
  type = "button",
  ...props
}: FolderProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    setOpen(!open);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || !open) return;
    setOpen(false);
  }

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <button
        type={type}
        data-slot="folder"
        data-state={open ? "open" : "closed"}
        aria-expanded={open}
        className={cn(folderVariants({ tone, size }), className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="folder-art"
          className={cn(
            "relative mt-[2.4em] block h-[7.5em] w-[10em] perspective-[36em]",
            "text-[length:calc(1rem*var(--folder-scale,1))]",
            "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
            "motion-safe:group-active/folder:scale-[0.97]",
          )}
        >
          <span
            data-slot="folder-back"
            className={cn(
              "absolute inset-0 rounded-[0.75em] rounded-ss-none bg-[var(--folder-back)]",
              "shadow-[inset_0_1px_0_var(--folder-shine),0_0.25em_0.75em_-0.25em_var(--shadow-color)]",
            )}
          >
            <span
              data-slot="folder-tab"
              className={cn(
                "absolute start-0 bottom-[calc(100%-1px)] h-[0.875em] w-[42%] rounded-t-[0.5em] bg-[var(--folder-back)]",
                "[clip-path:polygon(0_0,82%_0,100%_100%,0_100%)] rtl:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]",
              )}
            />
          </span>
          {POSES.map((pose, index) => (
            <span
              key={index}
              data-slot="folder-paper"
              style={paperStyle(pose, index)}
              className={cn(
                "absolute start-[8%] bottom-[7%] block h-[84%] w-[84%] origin-bottom overflow-hidden",
                "rounded-[0.5em] border border-border bg-[var(--folder-paper)] shadow-sm",
              )}
            >
              {items?.[index] === undefined ? (
                <Lines />
              ) : (
                <span className="grid size-full place-items-center text-[2.25em] [&>img]:size-full [&>img]:object-cover">
                  {items[index]}
                </span>
              )}
            </span>
          ))}
          <span
            data-slot="folder-front"
            className={cn(
              "absolute inset-x-0 bottom-0 block h-[76%] origin-bottom rounded-[0.75em] bg-[var(--folder-front)]",
              "shadow-[inset_0_1px_0_var(--folder-shine),inset_0_-0.75em_1.25em_-0.75em_var(--shadow-color),0_-0.125em_0.375em_-0.125em_var(--shadow-color)]",
            )}
          />
        </span>
        <span
          data-slot="folder-label"
          className={cn(
            hideLabel
              ? "sr-only"
              : "max-w-[calc(10rem*var(--folder-scale,1))] truncate text-sm font-medium",
          )}
        >
          {label}
        </span>
      </button>
    </>
  );
}

export { folderVariants };
