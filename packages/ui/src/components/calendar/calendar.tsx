"use client";

import { DayPicker, getDefaultClassNames, type DayPickerProps } from "react-day-picker";

import { buttonVariants } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A date grid for selecting a day, several days or a range.
 *
 * Wraps `react-day-picker`, which supplies the parts that are genuinely hard —
 * locale-aware week layout, the roving-focus grid keyboard model, range
 * selection and out-of-month handling. This file is the design layer over it:
 * every class comes from our tokens, so the calendar re-skins with the rest of
 * the system rather than shipping its own visual language.
 */
export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaults,
        root: cn(defaults.root, "w-fit"),
        months: cn(defaults.months, "flex flex-col gap-4 sm:flex-row"),
        month: cn(defaults.month, "flex flex-col gap-4"),
        nav: cn(defaults.nav, "absolute inset-x-3 top-3 flex items-center justify-between"),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "opacity-60 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "opacity-60 hover:opacity-100",
        ),
        month_caption: cn(defaults.month_caption, "flex h-8 items-center justify-center"),
        caption_label: cn(defaults.caption_label, "text-sm font-medium"),
        dropdowns: cn(defaults.dropdowns, "flex items-center gap-2 text-sm font-medium"),
        dropdown_root: cn(defaults.dropdown_root, "relative rounded-md border border-input"),
        dropdown: cn(defaults.dropdown, "absolute inset-0 opacity-0"),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "w-9 text-2xs font-normal text-muted-foreground select-none",
        ),
        week: cn(defaults.week, "mt-1 flex w-full"),
        week_number_header: cn(defaults.week_number_header, "w-9"),
        week_number: cn(defaults.week_number, "text-2xs text-muted-foreground"),
        day: cn(defaults.day, "group/day size-9 p-0 text-center text-sm"),
        day_button: cn(
          defaults.day_button,
          "size-9 rounded-md font-normal transition-colors duration-[var(--duration-instant)]",
          "hover:bg-accent hover:text-accent-foreground",
          "group-data-[selected=true]/day:bg-primary group-data-[selected=true]/day:text-primary-foreground",
          "group-data-[selected=true]/day:hover:bg-primary-hover",
          "disabled:pointer-events-none disabled:opacity-40",
          focusRing,
        ),
        // Range middles keep the muted surface so the two ends stay legible as
        // the actual selection.
        range_start: cn(defaults.range_start, "rounded-s-md bg-accent"),
        range_middle: cn(
          defaults.range_middle,
          "bg-accent [&>button]:bg-transparent [&>button]:text-accent-foreground",
        ),
        range_end: cn(defaults.range_end, "rounded-e-md bg-accent"),
        today: cn(defaults.today, "[&>button]:font-semibold [&>button]:text-primary"),
        outside: cn(defaults.outside, "text-muted-foreground opacity-50"),
        disabled: cn(defaults.disabled, "opacity-40"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={cn("size-4", chevronClassName)}
            {...chevronProps}
          >
            <path
              d={
                orientation === "left"
                  ? "m14 6-6 6 6 6"
                  : orientation === "right"
                    ? "m10 6 6 6-6 6"
                    : orientation === "up"
                      ? "m6 14 6-6 6 6"
                      : "m6 10 6 6 6-6"
              }
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      }}
      {...props}
    />
  );
}
