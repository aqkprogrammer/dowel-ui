"use client";

// Ported from SmoothUI GitHub Stars Animation (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { AvatarGroup, type AvatarGroupItem } from "@/components/avatar-group";
import { NumberFlow } from "@/components/number-flow";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The source fetches a repository's stars and stargazers from the GitHub API
 * and counts up with a requestAnimationFrame loop. A library component makes
 * no network calls: the count and the stargazers are props, and fetching them
 * (server-side, cached, with a token) is the application's job.
 *
 * The count-up is NumberFlow: the first frame renders zero, the next renders
 * the real count, and every digit rolls from 0 to its place. Later changes
 * roll from the old value. It is all token-driven CSS, so under reduced
 * motion the final count simply appears. The star pops (a hoisted keyframe on
 * the motion scale) whenever the count changes. Stargazers are an AvatarGroup.
 */

const PREFIX = "dowel-star-count";

const STYLES = `@keyframes ${PREFIX}-pop{0%{transform:scale(.6)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
[data-slot=star-count-icon]{animation:${PREFIX}-pop calc(400ms * var(--motion-scale, 1)) var(--ease-overshoot, ease-out) both}`;

const starCountVariants = cva(
  "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
  {
    variants: {
      /** `plain` is the source's inline counter; `pill` is a GitHub-style star button. */
      variant: {
        plain: "",
        pill: cn(
          "h-8 rounded-full border border-border bg-card px-3 text-sm text-card-foreground shadow-xs",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        ),
      },
    },
    defaultVariants: {
      variant: "plain",
    },
  },
);

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.49l-5.87 3.09 1.12-6.54L2.5 9.41l6.56-.95z" />
    </svg>
  );
}

export interface StarCountProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof starCountVariants> {
  /** The number of stars. Fetch it yourself; the component makes no network calls. */
  count: number;
  /** People who starred, shown as an overlapping avatar group before the count. */
  stargazers?: AvatarGroupItem[];
  /** How many stargazers to show before "+N". */
  maxAvatars?: number;
  /** Accessible name of the stargazer list. */
  stargazersLabel?: string;
  /** Makes the counter a link, e.g. to the repository. */
  href?: string;
  /** The unit after the number. Defaults to "star" / "stars". */
  unit?: (count: number) => ReactNode;
  /** The icon before the number. Defaults to a filled star. */
  icon?: ReactNode;
  /** Count up from zero on mount. When false the count starts settled. */
  animateOnMount?: boolean;
  /** Passed to Intl.NumberFormat, for the digits and the screen-reader text. */
  locales?: Intl.LocalesArgument;
  /** Intl.NumberFormat options, e.g. `{ notation: "compact" }` for "12K". */
  format?: Intl.NumberFormatOptions;
}

/** An animated star counter, optionally a link, with the stargazers beside it. */
export function StarCount({
  className,
  count,
  stargazers,
  maxAvatars = 5,
  stargazersLabel = "Stargazers",
  href,
  unit = (value) => (value === 1 ? "star" : "stars"),
  icon,
  animateOnMount = true,
  locales,
  format,
  variant = "plain",
  ...props
}: StarCountProps) {
  const [started, setStarted] = useState(!animateOnMount);

  // One frame at zero first, so the digits have somewhere to roll from.
  useEffect(() => {
    if (started) return;
    const frame = requestAnimationFrame(() => {
      setStarted(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [started]);

  const shown = started ? count : 0;
  const text = new Intl.NumberFormat(locales, format).format(count);
  const Counter = href ? "a" : "span";

  return (
    <div
      data-slot="star-count"
      className={cn("inline-flex items-center gap-3", className)}
      {...props}
    >
      {stargazers && stargazers.length > 0 ? (
        <AvatarGroup
          aria-label={stargazersLabel}
          avatars={stargazers}
          max={maxAvatars}
          overlap={0.2}
        />
      ) : null}
      <Counter
        data-slot="star-count-counter"
        href={href}
        className={cn(
          starCountVariants({ variant }),
          href && focusRing,
          href && variant === "pill" && "hover:bg-accent hover:text-accent-foreground",
          href && variant === "plain" && "rounded-sm hover:underline",
        )}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <span
          key={count}
          data-slot="star-count-icon"
          aria-hidden="true"
          className="inline-flex"
        >
          {icon ?? <StarIcon />}
        </span>
        <NumberFlow aria-hidden="true" value={shown} locales={locales} format={format} />
        <span className="sr-only">{text}</span>{" "}
        <span data-slot="star-count-unit" className="text-sm text-muted-foreground">
          {unit(count)}
        </span>
      </Counter>
    </div>
  );
}

export { starCountVariants };
