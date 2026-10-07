import { cn } from "@dowel-ui/react";
import type { ReactNode } from "react";

import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

/**
 * A page outside the documentation shell: header, the page, footer.
 *
 * `width` is the page's reading width. Tools want the room; pricing reads
 * better narrower.
 */
export function SiteShell({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "default" | "narrow";
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="content"
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-24 sm:px-6",
          width === "wide" && "max-w-[88rem]",
          width === "default" && "max-w-6xl",
          width === "narrow" && "max-w-3xl",
          className,
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
