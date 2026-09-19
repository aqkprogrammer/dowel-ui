"use client";

// Ported from SmoothUI Image Metadata Preview (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * An image with a row of actions under it and a details button that opens a
 * metadata panel in place of the row; the image lifts to make room.
 *
 * It is a disclosure: the toggle has aria-expanded and aria-controls, the
 * panel is a labelled region. Opening hides the toggle, so focus moves to the
 * panel's close button, and closing (the button or Escape) returns it to the
 * toggle. Whichever of row and panel is not showing is inert.
 *
 * The source measured the panel with react-use-measure and animated with
 * `motion`. Here a ResizeObserver measures it, the image lift is a CSS
 * `translate` transition and the panel fades in from a blur — decoration that
 * stops under reduced motion.
 */

const imageMetadataVariants = cva("flex w-full flex-col items-center gap-4", {
  variants: {
    /** Panel and image corner treatment. */
    shape: {
      rounded: "[--image-metadata-radius:1.25rem]",
      square: "[--image-metadata-radius:0.5rem]",
    },
  },
  defaultVariants: {
    shape: "rounded",
  },
});

export interface ImageMetadataField {
  label: string;
  value: ReactNode;
}

export interface ImageMetadataProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof imageMetadataVariants> {
  src: string;
  alt: string;
  /** Heading of the panel, e.g. the file name. It names the panel. */
  filename: string;
  description?: ReactNode;
  /** Rows of the metadata table. */
  metadata: ImageMetadataField[];
  /** Controls shown in the row beside the details toggle — Share, Connect. */
  actions?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the toggle. */
  openLabel?: string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  imageClassName?: string;
}

/** An image with an expandable metadata panel. */
export function ImageMetadata({
  className,
  shape,
  src,
  alt,
  filename,
  description,
  metadata,
  actions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openLabel = "Show details",
  closeLabel = "Hide details",
  imageClassName,
  ...props
}: ImageMetadataProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const [lift, setLift] = useState(0);
  const id = useId();
  const panelId = `${id}-panel`;
  const titleId = `${id}-title`;
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previous = useRef(open);

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  }

  // How far the image lifts: the panel's height beyond the row it covers.
  useEffect(() => {
    const row = rowRef.current;
    const panel = panelRef.current;
    if (!row || !panel) return;
    const measure = () => setLift(Math.max(0, panel.offsetHeight - row.offsetHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // Focus follows the swap, but never on first render.
  useEffect(() => {
    if (previous.current === open) return;
    previous.current = open;
    (open ? closeRef : toggleRef).current?.focus();
  }, [open]);

  // Escape from anywhere inside the open panel closes it. A native listener,
  // because the region itself is not a control — the keys come from the Close
  // button or from links a consumer puts in the metadata.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) return;
    const listener = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (openProp === undefined) setUncontrolled(false);
      onOpenChange?.(false);
    };
    panel.addEventListener("keydown", listener);
    return () => panel.removeEventListener("keydown", listener);
  }, [open, openProp, onOpenChange]);

  const swap =
    "transition-[opacity,filter,translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]";

  return (
    <div
      data-slot="image-metadata"
      data-state={open ? "open" : "closed"}
      className={cn(imageMetadataVariants({ shape }), className)}
      {...props}
    >
      <div
        data-slot="image-metadata-image"
        className="w-full overflow-hidden rounded-[var(--image-metadata-radius)] transition-[translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
        style={{ translate: open ? `0 ${String(-lift)}px` : undefined }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn("block h-auto w-full object-cover", imageClassName)}
        />
      </div>

      <div className="relative w-full">
        <div
          ref={rowRef}
          data-slot="image-metadata-actions"
          inert={open}
          aria-hidden={open || undefined}
          className={cn(
            "flex w-full items-center justify-center gap-4",
            swap,
            open && "opacity-0 blur-xs",
          )}
        >
          {actions}
          <Button
            ref={toggleRef}
            type="button"
            variant="outline"
            size="icon"
            aria-label={openLabel}
            aria-expanded={open}
            aria-controls={panelId}
            data-slot="image-metadata-toggle"
            className="size-11 rounded-full"
            onClick={() => setOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m18 15-6-6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>

        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={titleId}
          data-slot="image-metadata-panel"
          data-state={open ? "open" : "closed"}
          inert={!open}
          aria-hidden={!open || undefined}
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-[var(--image-metadata-radius)] border border-border bg-card p-5 text-card-foreground shadow-xs",
            swap,
            !open && "pointer-events-none opacity-0 blur-xs",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p id={titleId} className="truncate font-medium">
                {filename}
              </p>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <Button
              ref={closeRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={closeLabel}
              data-slot="image-metadata-close"
              className="-me-2 -mt-2 shrink-0 rounded-full"
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>
          <dl
            data-slot="image-metadata-fields"
            className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"
          >
            {metadata.map((field) => (
              <div key={field.label} className="contents">
                <dt className="text-foreground">{field.label}</dt>
                <dd className="truncate text-muted-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export { imageMetadataVariants };
