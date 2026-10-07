"use client";

// Original design (pattern inspired by Animate UI Preview Link Card; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/hover-card";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An inline link that shows where it goes before you follow it.
 *
 * Hovering or focusing the link opens a HoverCard holding a preview image you
 * supply — nothing is fetched, and no screenshot service is involved — with an
 * optional heading, description and the link's hostname.
 *
 * - The card grows out of the link (HoverCard's spring and blur).
 * - Until the image has loaded, a shimmer holds its place at the right size,
 *   so the card never jumps.
 * - Once loaded, the image wipes in from the top behind a clip-path while
 *   settling from a slight zoom (108% to 100%).
 * - The text lines rise into place one after another.
 *
 * The link stays a plain `<a href>`: it navigates, it is in the tab order, and
 * focusing it opens the card exactly as hovering does. The card is a visual
 * preview, so the link's own text must say where it goes. Every keyframe is on
 * the motion scale; under reduced motion the card and image simply appear.
 */

const PREFIX = "dowel-preview-link-card";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const LINE = "[data-slot=preview-link-card-text]>*";
const STAGGER_STEP_MS = 55;

const STYLES = `
@keyframes ${PREFIX}-reveal{from{clip-path:inset(0 0 100% 0);scale:1.08}to{clip-path:inset(0);scale:1}}
@keyframes ${PREFIX}-shimmer{from{background-position:150% 0}to{background-position:-50% 0}}
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 .375rem}}
[data-slot=preview-link-card-image][data-loaded]{animation:${PREFIX}-reveal ${scaled(640)} var(--ease-out-quint) both}
[data-slot=preview-link-card-shimmer]{animation:${PREFIX}-shimmer ${scaled(1400)} var(--ease-in-out-quint) infinite}
${LINE}{animation:${PREFIX}-rise ${scaled(320)} var(--ease-out-quint) ${scaled(120)} both}
${[2, 3].map((n) => `${LINE}:nth-child(${String(n)}){animation-delay:${scaled(120 + (n - 1) * STAGGER_STEP_MS)}}`).join("\n")}
`;

const previewLinkCardVariants = cva("p-0", {
  variants: {
    size: {
      sm: "w-60",
      md: "w-72",
      lg: "w-80",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/** The host, without a leading `www.` — or nothing, for a relative or malformed href. */
function hostnameOf(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

type Status = "loading" | "loaded" | "error";

function PreviewImage({ src, alt, hostname }: { src: string; alt: string; hostname?: string }) {
  const [status, setStatus] = useState<Status>("loading");

  return (
    <div
      data-slot="preview-link-card-media"
      className="relative aspect-video overflow-hidden rounded-t-[inherit] bg-muted"
    >
      {status === "loading" ? (
        <div
          data-slot="preview-link-card-shimmer"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-[length:200%_100%]",
            "bg-[linear-gradient(100deg,transparent_30%,color-mix(in_oklab,var(--color-foreground)_8%,transparent)_50%,transparent_70%)]",
          )}
        />
      ) : null}
      {status === "error" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-xs text-muted-foreground"
        >
          {hostname}
        </div>
      ) : (
        <img
          data-slot="preview-link-card-image"
          data-loaded={status === "loaded" ? "" : undefined}
          src={src}
          alt={alt}
          decoding="async"
          // A cached image can finish before React attaches onLoad.
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setStatus("loaded");
          }}
          onLoad={() => {
            setStatus("loaded");
          }}
          onError={() => {
            setStatus("error");
          }}
          className={cn(
            "absolute inset-0 size-full object-cover",
            status === "loading" && "opacity-0",
          )}
        />
      )}
    </div>
  );
}

export interface PreviewLinkCardProps
  extends ComponentPropsWithRef<"a">, VariantProps<typeof previewLinkCardVariants> {
  /** The link's destination. Its hostname is shown on the card. */
  href: string;
  /** The preview image's URL. Supply it yourself — nothing is fetched or screenshotted. */
  image: string;
  /** Alt text for the image. Empty by default: the image previews the link, which already names it. */
  imageAlt?: string;
  /** A heading on the card, such as the page's title. */
  heading?: ReactNode;
  /** A line or two about the page. */
  description?: ReactNode;
  /** Which side of the link the card opens on. */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Milliseconds of hover before the card opens. */
  openDelay?: number;
  /** Milliseconds before it closes once the pointer leaves. */
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Classes for the card. */
  cardClassName?: string;
}

/** An inline link that previews its destination — image, heading, description, host — on hover or focus. */
export function PreviewLinkCard({
  className,
  cardClassName,
  href,
  image,
  imageAlt = "",
  heading,
  description,
  size,
  side = "top",
  align = "center",
  openDelay,
  closeDelay,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: PreviewLinkCardProps) {
  const hostname = hostnameOf(href);

  return (
    <HoverCard
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger asChild>
        <a
          data-slot="preview-link-card"
          href={href}
          className={cn(
            "rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-4",
            "transition-[text-decoration-color] duration-[var(--duration-fast)] hover:decoration-primary",
            focusRing,
            className,
          )}
          {...props}
        >
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className={cn(previewLinkCardVariants({ size }), "overflow-hidden", cardClassName)}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <div data-slot="preview-link-card-content">
          <PreviewImage src={image} alt={imageAlt} hostname={hostname} />
          {heading || description || hostname ? (
            <div data-slot="preview-link-card-text" className="grid gap-1 p-3">
              {heading ? (
                <p className="leading-snug font-semibold text-popover-foreground">{heading}</p>
              ) : null}
              {description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
              ) : null}
              {hostname ? (
                <p data-slot="preview-link-card-host" className="text-xs text-muted-foreground">
                  {hostname}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export { previewLinkCardVariants };
