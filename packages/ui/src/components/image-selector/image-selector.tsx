"use client";

// Ported from SmoothUI Interactive Image Selector (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useId, useState, type ComponentPropsWithRef } from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A photo grid with a Select mode, as in a phone's gallery: enter it, tick
 * photos, then share or delete them from a bar that rises from the bottom.
 *
 * Each photo in Select mode is a real checkbox (a visually hidden native
 * input wrapping the image), so Tab reaches each one and Space ticks it; the
 * image's alt text is its name. The count is a polite live region. Delete
 * keeps focus on its button — it becomes aria-disabled rather than disabled
 * when nothing is left selected, so focus is never dropped to the page.
 *
 * `motion` is used for one thing: when photos are deleted the rest reflow
 * into their new cells, a shared-layout animation between DOM positions
 * (ADR 0014). Everything else — the tick popping in, the bar rising, the
 * Reset wiggle — is CSS. Under reduced motion the grid simply re-lays out.
 */

const PREFIX = "dowel-image-selector";

const STYLES = `
@keyframes ${PREFIX}-rise {
  from { opacity: 0; translate: 0 1.25rem; }
}
@keyframes ${PREFIX}-wiggle {
  25% { rotate: 5deg; scale: 1.1; }
  75% { rotate: -5deg; }
}
[data-slot="image-selector-toolbar"] {
  animation: ${PREFIX}-rise calc(250ms * var(--motion-scale)) var(--ease-out-quint) both;
}
[data-slot="image-selector-reset"] [data-state="reset"] {
  display: inline-block;
  animation: ${PREFIX}-wiggle calc(300ms * var(--motion-scale)) var(--ease-out-quint);
}
`;

const imageSelectorVariants = cva("grid gap-1", {
  variants: {
    columns: {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
    },
  },
  defaultVariants: {
    columns: 3,
  },
});

export interface SelectableImage {
  id: string;
  src: string;
  /** Names the checkbox in Select mode, so it must describe the photo. */
  alt: string;
}

export interface ImageSelectorProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof imageSelectorVariants> {
  images: SelectableImage[];
  /** Selected image ids (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Whether Select mode is on (controlled). */
  selecting?: boolean;
  defaultSelecting?: boolean;
  onSelectingChange?: (selecting: boolean) => void;
  /** Called with the ids being deleted. They are also hidden until Reset. */
  onDelete?: (ids: string[]) => void;
  /** Shows a Share button in the bar, called with the selected ids. */
  onShare?: (ids: string[]) => void;
  /** Show a Reset button that restores deleted photos and leaves Select mode. */
  showReset?: boolean;
  /** Accessible name of the photo group. */
  label?: string;
  gridClassName?: string;
}

/** A photo grid with a Select mode, a selection count and share/delete actions. */
export function ImageSelector({
  className,
  columns,
  images,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  selecting: selectingProp,
  defaultSelecting = false,
  onSelectingChange,
  onDelete,
  onShare,
  showReset = true,
  label = "Photos",
  gridClassName,
  ...props
}: ImageSelectorProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledSelecting, setUncontrolledSelecting] = useState(defaultSelecting);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [resets, setResets] = useState(0);
  const selected = valueProp ?? uncontrolledValue;
  const selecting = selectingProp ?? uncontrolledSelecting;
  const labelId = useId();
  const visible = images.filter((image) => !removed.has(image.id));
  const count = selected.length;

  function setSelected(next: string[]) {
    if (valueProp === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  function setSelecting(next: boolean) {
    if (selectingProp === undefined) setUncontrolledSelecting(next);
    onSelectingChange?.(next);
    if (!next && count > 0) setSelected([]);
  }

  function toggle(id: string) {
    setSelected(
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    );
  }

  function remove() {
    if (count === 0) return;
    onDelete?.(selected);
    setRemoved(new Set([...removed, ...selected]));
    setSelected([]);
  }

  function reset() {
    setRemoved(new Set());
    setResets(resets + 1);
    setSelecting(false);
  }

  const pill = "h-8 rounded-full px-3 font-semibold backdrop-blur-xl";

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="image-selector"
        data-selecting={selecting ? "" : undefined}
        className={cn("relative flex w-full flex-col gap-3", className)}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <div
          data-slot="image-selector-header"
          className="flex items-center justify-between gap-2"
        >
          <span id={labelId} className="text-sm font-medium">
            {label}
          </span>
          <div className="flex gap-2">
            {showReset ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-slot="image-selector-reset"
                className={pill}
                onClick={reset}
              >
                <span key={resets} data-state={resets > 0 ? "reset" : undefined}>
                  Reset
                </span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant={selecting ? "primary" : "secondary"}
              size="sm"
              aria-pressed={selecting}
              data-slot="image-selector-toggle"
              className={pill}
              onClick={() => setSelecting(!selecting)}
            >
              Select
            </Button>
          </div>
        </div>

        <ul
          aria-labelledby={labelId}
          data-slot="image-selector-grid"
          className={cn(imageSelectorVariants({ columns }), gridClassName)}
        >
          <AnimatePresence initial={false}>
            {visible.map((image) => {
              const checked = selecting && selected.includes(image.id);
              const picture = (
                <img
                  src={image.src}
                  alt={image.alt}
                  draggable={false}
                  loading="lazy"
                  className={cn(
                    "size-full rounded-lg object-cover transition-[opacity,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                    checked && "scale-95 opacity-75",
                  )}
                />
              );
              return (
                <motion.li
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  data-slot="image-selector-item"
                  data-state={checked ? "checked" : "unchecked"}
                  className="relative aspect-square"
                >
                  {selecting ? (
                    <label className="group/tile block size-full cursor-pointer rounded-lg">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(image.id)}
                        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                      {picture}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-ring/55 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                      />
                      <span
                        aria-hidden="true"
                        data-slot="image-selector-check"
                        className={cn(
                          "pointer-events-none absolute end-2 bottom-2 grid size-6 place-items-center rounded-full border-2 border-background shadow-sm",
                          "transition-[scale,background-color] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
                          checked
                            ? "scale-100 bg-primary text-primary-foreground"
                            : "scale-90 bg-background/40",
                        )}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className={cn("size-3.5", !checked && "opacity-0")}
                        >
                          <path
                            d="M20 6 9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </label>
                  ) : (
                    picture
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {selecting ? (
          <div
            data-slot="image-selector-toolbar"
            className="sticky bottom-2 mx-auto flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-border bg-background/80 p-2 shadow-lg backdrop-blur-md"
          >
            {onShare ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Share selected"
                aria-disabled={count === 0 || undefined}
                data-slot="image-selector-share"
                className="rounded-full text-primary"
                onClick={() => {
                  if (count > 0) onShare(selected);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            ) : (
              <span className="size-9" />
            )}
            <span role="status" aria-live="polite" className="text-sm tabular-nums">
              {count} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete selected"
              aria-disabled={count === 0 || undefined}
              data-slot="image-selector-delete"
              className="rounded-full text-destructive"
              onClick={remove}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        ) : null}
      </div>
    </MotionConfig>
  );
}

export { imageSelectorVariants };
