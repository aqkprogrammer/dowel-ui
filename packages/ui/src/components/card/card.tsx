import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/** Surface that groups related content and actions. */
export function Card({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6 pt-6 pb-4", className)}
      {...props}
    />
  );
}

export interface CardTitleProps extends ComponentPropsWithRef<"h3"> {
  /**
   * Renders the child element instead of an `<h3>`.
   *
   * A card title is an `h3` because that is right in most layouts, and wrong in
   * some — heading levels have to increase by one, and a card sitting directly
   * under an `h1` needs an `h2`. Use this to set the level the page actually
   * requires, or to render something that is not a heading at all.
   */
  asChild?: boolean;
}

export function CardTitle({ className, asChild, children, ...props }: CardTitleProps) {
  const Comp = asChild ? Slot.Root : "h3";

  // `children` is destructured rather than spread so static analysis can see
  // that the heading has content — a heading that renders empty is a real
  // accessibility defect, and we want the linter able to catch it at call sites.
  return (
    <Comp
      data-slot="card-title"
      className={cn("text-lg leading-tight font-semibold tracking-tight", className)}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function CardDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return <div data-slot="card-content" className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t border-border px-6 py-4", className)}
      {...props}
    />
  );
}
