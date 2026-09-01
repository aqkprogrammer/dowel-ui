"use client";

import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { cn } from "@/lib/utils";

/**
 * A button that opens a calendar to pick a date.
 *
 * Composed from Popover, Calendar and Button rather than reimplementing any of
 * them, which is also why it is the first registry entry with transitive
 * dependencies — installing it pulls all three.
 *
 * A date picker is a convenience, not the only way in. For a date the user
 * already knows, a typed input is faster than any calendar; pair this with one
 * when speed of entry matters more than browsing.
 */

function formatDate(date: Date | undefined, locale?: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 opacity-70">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface DatePickerTriggerProps extends Omit<ComponentPropsWithRef<"button">, "value"> {
  placeholder: string;
  hasValue: boolean;
  children: ReactNode;
}

function DatePickerTrigger({
  className,
  placeholder: _placeholder,
  hasValue,
  children,
  ...props
}: DatePickerTriggerProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start gap-2 font-normal",
        !hasValue && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <CalendarIcon />
      {children}
    </Button>
  );
}

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** BCP 47 tag for formatting the button label. Defaults to the runtime locale. */
  locale?: string;
  className?: string;
  /** Names the popover, which carries role="dialog". */
  label?: string;
}

export function DatePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date",
  disabled,
  locale,
  className,
  label = "Choose a date",
}: DatePickerProps) {
  const [uncontrolled, setUncontrolled] = useState<Date | undefined>(defaultValue);
  const value = valueProp === undefined ? uncontrolled : valueProp;
  const [open, setOpen] = useState(false);

  function handleSelect(next: Date | undefined) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
    // Closing on selection is right for a single date: the task is complete.
    // A range picker must stay open, since one click is only half an answer.
    setOpen(next ? false : open);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DatePickerTrigger
          data-slot="date-picker-trigger"
          placeholder={placeholder}
          hasValue={Boolean(value)}
          disabled={disabled}
          className={className}
        >
          {value ? formatDate(value, locale) : placeholder}
        </DatePickerTrigger>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" aria-label={label}>
        <Calendar
          mode="single"
          selected={value}
          // Open on the selected date's month rather than today's. The calendar
          // does not infer this from `selected`, so without it a user editing a
          // date from last year lands in the wrong place and has to page back.
          defaultMonth={value}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  locale?: string;
  className?: string;
  label?: string;
  /** Months shown side by side. Two makes most ranges selectable without paging. */
  numberOfMonths?: number;
}

export function DateRangePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date range",
  disabled,
  locale,
  className,
  label = "Choose a date range",
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [uncontrolled, setUncontrolled] = useState<DateRange | undefined>(defaultValue);
  const value = valueProp === undefined ? uncontrolled : valueProp;

  function handleSelect(next: DateRange | undefined) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  const labelText = value?.from
    ? value.to
      ? `${formatDate(value.from, locale)} – ${formatDate(value.to, locale)}`
      : formatDate(value.from, locale)
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <DatePickerTrigger
          data-slot="date-range-picker-trigger"
          placeholder={placeholder}
          hasValue={Boolean(value?.from)}
          disabled={disabled}
          className={className}
        >
          {labelText}
        </DatePickerTrigger>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" aria-label={label}>
        <Calendar
          mode="range"
          selected={value}
          defaultMonth={value?.from}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
