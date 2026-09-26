"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { PopoverClose } from "@/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { cn } from "@/lib/utils";

import {
  normaliseFilter,
  operatorLabel,
  operatorsFor,
  type FilterChip,
  type FilterDraft,
  type FilterField,
  type FilterFieldType,
  type FilterOperator,
} from "./nl-filter-model";

const INVALID: Record<FilterFieldType, string> = {
  text: "Enter some text.",
  number: "Enter a number.",
  date: "Enter a date.",
  enum: "Choose a value.",
};

const INPUT_TYPE: Record<Exclude<FilterFieldType, "enum">, string> = {
  text: "text",
  number: "number",
  date: "date",
};

export interface NlFilterEditorProps {
  chip: FilterChip;
  field: FilterField;
  onApply: (filter: FilterDraft) => void;
  className?: string;
}

/**
 * One chip's condition and value, in a small form: Enter or Apply commits,
 * Escape or Cancel leaves the chip as it was. Applying rather than changing
 * on every keystroke keeps a half-typed number from filtering the list, and
 * the list from announcing each digit.
 */
export function NlFilterEditor({ chip, field, onApply, className }: NlFilterEditorProps) {
  const id = useId();
  const operators = operatorsFor(field.type);
  const [operator, setOperator] = useState<FilterOperator>(() =>
    operators.includes(chip.operator) ? chip.operator : (operators[0] ?? "is"),
  );
  const [value, setValue] = useState(String(chip.value));
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef<HTMLInputElement | null>(null);

  const operatorId = `${id}-operator`;
  const valueId = `${id}-value`;
  const errorId = `${id}-error`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Stop the submit reaching a form the filter itself sits in: the popover
    // is portalled, but React events still bubble through the tree.
    event.stopPropagation();
    const next = normaliseFilter({ field: field.key, operator, value }, [field]);
    if (!next) {
      setError(INVALID[field.type]);
      valueRef.current?.focus();
      return;
    }
    onApply(next);
  }

  return (
    <form
      noValidate
      data-slot="nl-filter-editor"
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-3", className)}
    >
      <p className="text-sm font-medium">{field.label}</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={operatorId} className="text-xs font-medium text-muted-foreground">
          Condition
        </label>
        <Select
          value={operator}
          onValueChange={(next) => {
            setOperator(next as FilterOperator);
          }}
        >
          <SelectTrigger id={operatorId} triggerSize="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {operatorLabel(candidate, field.type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={valueId} className="text-xs font-medium text-muted-foreground">
          Value
        </label>
        {field.type === "enum" ? (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id={valueId} triggerSize="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            ref={valueRef}
            id={valueId}
            inputSize="sm"
            type={INPUT_TYPE[field.type]}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
        )}
        {error ? (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <PopoverClose asChild>
          <Button type="button" variant="ghost" size="sm">
            Cancel
          </Button>
        </PopoverClose>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}
