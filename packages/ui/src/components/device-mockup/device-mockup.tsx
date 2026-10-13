// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * A screenshot or a live screen shown inside a device: a phone, a tablet, a
 * laptop or a browser window, drawn in CSS so it takes the theme and costs
 * no images.
 *
 * The screen is whatever you put in it — an <img>, a video, or real,
 * interactive UI — and keeps its roles and focus order; the frame, notch,
 * camera and window controls are decoration, hidden from assistive
 * technology. `tilt` turns it in 3D for a hero; it straightens on hover and
 * on focus within, on the motion scale, so under reduced motion it just
 * switches. It renders on the server: no state, no script. A `caption`
 * makes it a figure with a visible caption.
 */

const deviceMockupVariants = cva("group/device relative mx-auto w-full perspective-[2000px]", {
  variants: {
    /** Which device to draw. */
    device: {
      phone: "max-w-[18rem]",
      tablet: "max-w-[32rem]",
      laptop: "max-w-[48rem]",
      browser: "max-w-[56rem]",
    },
  },
  defaultVariants: { device: "phone" },
});

const TILTS = {
  none: "",
  left: "[transform:rotateY(18deg)_rotateX(6deg)]",
  right: "[transform:rotateY(-18deg)_rotateX(6deg)]",
  back: "[transform:rotateX(18deg)]",
} as const;

export interface DeviceMockupProps
  extends
    Omit<ComponentPropsWithRef<"figure">, "children">,
    VariantProps<typeof deviceMockupVariants> {
  /** What is on the screen. */
  children?: ReactNode;
  /** Turn it in 3D. Straightens on hover and focus. Default "none". */
  tilt?: keyof typeof TILTS;
  /** Tablets only: on its side. Default "portrait". */
  orientation?: "portrait" | "landscape";
  /** Browser only: the address shown in the bar. */
  url?: string;
  /** A visible caption under the device. */
  caption?: ReactNode;
  /** Class for the screen area. */
  screenClassName?: string;
}

const frame =
  "bg-[color-mix(in_oklab,var(--color-foreground)_86%,var(--color-background))] shadow-xl ring-1 ring-border";

/** A phone, tablet, laptop or browser frame around a screen. */
export function DeviceMockup({
  device,
  tilt = "none",
  orientation = "portrait",
  url,
  caption,
  screenClassName,
  className,
  children,
  ...props
}: DeviceMockupProps) {
  const kind = device ?? "phone";
  const screen = cn("relative overflow-hidden bg-background", screenClassName);
  const turned = cn(
    "transition-transform duration-[calc(600ms*var(--motion-scale,1))] ease-(--ease-out-quint)",
    TILTS[tilt],
    tilt !== "none" &&
      "group-focus-within/device:[transform:none] group-hover/device:[transform:none]",
  );

  let body: ReactNode;
  if (kind === "phone") {
    body = (
      <div className={cn("relative rounded-[2.75rem] p-2.5", frame, turned)}>
        <div className={cn(screen, "aspect-[9/19.5] rounded-[2.25rem]")}>
          {children}
          <span
            aria-hidden="true"
            className="absolute top-2.5 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-[color-mix(in_oklab,var(--color-foreground)_90%,var(--color-background))]"
          />
        </div>
      </div>
    );
  } else if (kind === "tablet") {
    body = (
      <div className={cn("relative rounded-[2rem] p-4", frame, turned)}>
        <div
          className={cn(
            screen,
            "rounded-[1rem]",
            orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]",
          )}
        >
          {children}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-1.5 rounded-full bg-background/40",
            orientation === "landscape"
              ? "start-1.5 top-1/2 -translate-y-1/2"
              : "top-1.5 left-1/2 -translate-x-1/2",
          )}
        />
      </div>
    );
  } else if (kind === "laptop") {
    body = (
      <div className={turned}>
        <div className={cn("relative mx-[6%] rounded-t-[1.25rem] p-[2.5%] pb-[3%]", frame)}>
          <span
            aria-hidden="true"
            className="absolute top-[1%] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-background/40"
          />
          <div className={cn(screen, "aspect-[16/10] rounded-md")}>{children}</div>
        </div>
        <div aria-hidden="true" className={cn("relative h-3 rounded-b-xl sm:h-4", frame)}>
          <span className="absolute top-0 left-1/2 h-1.5 w-1/6 -translate-x-1/2 rounded-b-md bg-background/25" />
        </div>
      </div>
    );
  } else {
    body = (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-xl",
          turned,
        )}
      >
        <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-3 rounded-full bg-destructive/70" />
            <span className="size-3 rounded-full bg-warning/70" />
            <span className="size-3 rounded-full bg-success/70" />
          </span>
          {url ? (
            <span className="mx-auto max-w-md min-w-0 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-xs text-muted-foreground">
              {url}
            </span>
          ) : null}
        </div>
        <div className={cn(screen, "aspect-[16/10]")}>{children}</div>
      </div>
    );
  }

  return (
    <figure
      data-slot="device-mockup"
      data-device={kind}
      className={cn(deviceMockupVariants({ device: kind }), className)}
      {...props}
    >
      <div className="transform-3d">{body}</div>
      {caption ? (
        <figcaption className="mt-4 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export { deviceMockupVariants };
