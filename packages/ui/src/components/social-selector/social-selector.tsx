"use client";

// Ported from SmoothUI Social Selector (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup } from "radix-ui";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Pick one platform from a row of icons; a pill slides behind the chosen one
 * and the line underneath says where the updates are.
 *
 * Choosing one of several is a radio group, so that is what it is — Radix's,
 * for roving focus, arrow keys that follow the reading direction, and a value
 * that submits with a form. The source slid the pill with a `motion` layoutId;
 * every item is the same size, so the pill's position is a function of the
 * selected index and moving it is a CSS `translate` transition. The domain
 * line re-enters with a short blur keyframe when the choice changes. Both stop
 * under reduced motion.
 */

const PREFIX = "dowel-social-selector";

const STYLES = `
@keyframes ${PREFIX}-in {
  from { opacity: 0; filter: blur(5px); translate: 0 0.625rem; }
}
[data-slot="social-selector-domain"] {
  display: inline-block;
  animation: ${PREFIX}-in calc(250ms * var(--motion-scale)) var(--ease-out-quint) both;
}
`;

const socialSelectorVariants = cva("flex flex-col items-center gap-6 text-center", {
  variants: {
    size: {
      sm: "[--social-gap:0.75rem] [--social-size:2rem] [&_[data-slot=social-selector-item]_svg]:size-4",
      md: "[--social-gap:1rem] [--social-size:2.25rem] [&_[data-slot=social-selector-item]_svg]:size-5",
      lg: "[--social-gap:1.25rem] [--social-size:2.75rem] [&_[data-slot=social-selector-item]_svg]:size-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SocialPlatform {
  /** Submitted value and identity. */
  value: string;
  /** Accessible name — the icon alone names nothing. */
  name: string;
  /** Decorative icon; hidden from assistive technology. */
  icon: ReactNode;
  /** Profile URL. Without one the caption shows the domain as text. */
  url?: string;
  /** Shown in the caption, e.g. "bsky.app". Defaults to `name`. */
  domain?: string;
}

export interface SocialSelectorProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "dir" | "children">,
    VariantProps<typeof socialSelectorVariants> {
  platforms: SocialPlatform[];
  /** Controlled selected platform value. */
  value?: string;
  /** Initial selection when uncontrolled. Defaults to the first platform. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the radio group. */
  label?: string;
  /** The handle shown under the domain, without the "@". */
  handle?: string;
  /** Text before the domain. */
  captionPrefix?: ReactNode;
  /** Show the domain and handle line under the icons. */
  showCaption?: boolean;
  /** Open profile links in a new tab. */
  openInNewTab?: boolean;
  /** Submits the value with a form under this name. */
  name?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
}

/** A radio group of social platforms with a sliding selection pill. */
export function SocialSelector({
  className,
  style,
  size,
  platforms,
  value: valueProp,
  defaultValue,
  onValueChange,
  label = "Platform",
  handle,
  captionPrefix = "Updates on",
  showCaption = true,
  openInNewTab = true,
  name,
  disabled,
  dir,
  ...props
}: SocialSelectorProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? platforms[0]?.value ?? "");
  const value = valueProp ?? uncontrolled;
  const index = platforms.findIndex((platform) => platform.value === value);
  const selected = platforms[index];

  function handleValueChange(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  const external = openInNewTab
    ? { target: "_blank", rel: "noopener noreferrer" }
    : { rel: "noopener noreferrer" };
  const newTab = openInNewTab ? <span className="sr-only"> (opens in a new tab)</span> : null;
  const domain = selected ? (selected.domain ?? selected.name) : null;

  return (
    <div
      data-slot="social-selector"
      dir={dir}
      className={cn(socialSelectorVariants({ size }), className)}
      style={style}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <RadioGroup.Root
        data-slot="social-selector-group"
        aria-label={label}
        orientation="horizontal"
        value={value}
        onValueChange={handleValueChange}
        name={name}
        disabled={disabled}
        dir={dir}
        className="relative flex items-center gap-[var(--social-gap)]"
      >
        {selected ? (
          <span
            data-slot="social-selector-indicator"
            aria-hidden="true"
            className={cn(
              "absolute start-0 top-0 size-[var(--social-size)] rounded-full border border-border bg-background shadow-xs",
              "[--social-dir:1] rtl:[--social-dir:-1]",
              "transition-[translate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
            )}
            style={
              {
                "--social-index": index,
                translate:
                  "calc(var(--social-index) * (var(--social-size) + var(--social-gap)) * var(--social-dir)) 0",
              } as CSSProperties
            }
          />
        ) : null}
        {platforms.map((platform) => (
          <RadioGroup.Item
            key={platform.value}
            value={platform.value}
            aria-label={platform.name}
            data-slot="social-selector-item"
            className={cn(
              "relative z-[1] grid size-[var(--social-size)] shrink-0 cursor-pointer place-items-center rounded-full",
              "text-muted-foreground transition-colors duration-[var(--duration-fast)]",
              "hover:text-foreground data-[state=checked]:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-55",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0",
              focusRing,
            )}
          >
            <span aria-hidden="true" className="contents">
              {platform.icon}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {showCaption && selected ? (
        <p data-slot="social-selector-caption" className="text-muted-foreground">
          {captionPrefix}{" "}
          {selected.url ? (
            <a
              key={selected.value}
              data-slot="social-selector-domain"
              href={selected.url}
              className={cn(
                "rounded-sm font-medium text-foreground hover:underline",
                focusRing,
              )}
              {...external}
            >
              {domain}
              {newTab}
            </a>
          ) : (
            <span
              key={selected.value}
              data-slot="social-selector-domain"
              className="font-medium text-foreground"
            >
              {domain}
            </span>
          )}
          {handle ? (
            <>
              <br />
              {selected.url ? (
                <a
                  href={selected.url}
                  data-slot="social-selector-handle"
                  className={cn(
                    "rounded-sm font-medium text-foreground hover:underline",
                    focusRing,
                  )}
                  {...external}
                >
                  @{handle}
                  {newTab}
                </a>
              ) : (
                <span
                  data-slot="social-selector-handle"
                  className="font-medium text-foreground"
                >
                  @{handle}
                </span>
              )}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export { socialSelectorVariants };
