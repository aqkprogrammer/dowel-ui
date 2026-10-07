import { cn } from "@dowel-ui/react";
import type { ReactNode } from "react";

import { CosmicBackground, type CosmicIntensity } from "./cosmic-background";

/**
 * The top of a page: what it is, in one heading and one sentence.
 *
 * The cosmic light sits behind it and fades out before the content starts, so
 * every page opens in the brand's sky and is then read on plain ground. It is
 * absolutely positioned and bleeds past the page's own padding on purpose —
 * a glow cut off at a column edge looks like a mistake.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  cosmic = "subtle",
  seed,
  align = "start",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** How much sky. `false` for none. */
  cosmic?: CosmicIntensity | false;
  seed?: number;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative isolate pt-10 pb-8 sm:pt-14 sm:pb-10",
        align === "center" && "text-center",
        className,
      )}
    >
      {cosmic ? (
        <CosmicBackground
          intensity={cosmic}
          seed={seed}
          className="-inset-x-[50vw] -top-24 bottom-0 -z-10"
        />
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className={cn("display-lg text-luminous", eyebrow ? "mt-4" : null)}>{title}</h1>
      {description ? (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
      {actions ? (
        <div
          className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}
        >
          {actions}
        </div>
      ) : null}
      {children}
    </header>
  );
}
