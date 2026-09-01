"use client";

import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Vertically stacked sections that expand to reveal their content.
 *
 * Use `type="single"` for a set where one answer at a time is the point (an
 * FAQ), and `type="multiple"` where sections are independent (settings groups).
 */
export const Accordion = AccordionPrimitive.Root;

export type AccordionItemProps = ComponentPropsWithRef<typeof AccordionPrimitive.Item>;

export function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

export type AccordionTriggerProps = ComponentPropsWithRef<typeof AccordionPrimitive.Trigger>;

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  return (
    // The primitive requires the trigger to sit inside a Header so the button
    // carries a heading role — without it the sections are unreachable by
    // heading navigation, which is how many screen reader users move around.
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-start justify-between gap-4 py-4 text-left text-sm font-medium",
          "transition-colors duration-[var(--duration-fast)] hover:text-primary",
          "disabled:pointer-events-none disabled:opacity-55",
          "[&[data-state=open]>svg]:rotate-180",
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export type AccordionContentProps = ComponentPropsWithRef<typeof AccordionPrimitive.Content>;

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        // The height keyframes read --radix-accordion-content-height, which the
        // primitive measures; overflow-hidden keeps the content clipped as the
        // box grows rather than spilling over the section below.
        "overflow-hidden text-sm text-muted-foreground",
        "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open",
        className,
      )}
      {...props}
    >
      <div className={cn("pb-4")}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
