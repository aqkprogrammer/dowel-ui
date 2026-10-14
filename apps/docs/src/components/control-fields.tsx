"use client";

import { Input } from "@dowel-ui/react/input";
import { Label } from "@dowel-ui/react/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dowel-ui/react/select";
import { Slider } from "@dowel-ui/react/slider";
import { Switch } from "@dowel-ui/react/switch";
import type { ReactNode } from "react";

import { hasRange, MAX_TEXT_PARAM, type Control } from "~/lib/playground";

/*
 * The fields that set one prop each, shared by the playground and the
 * controls on every component page, so both offer the same control for the
 * same prop.
 */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * A labelled slider.
 *
 * The name goes to the thumb, not to the root: the thumb is the element with
 * `role="slider"`, so a `<Label htmlFor>` pointing at the root names a div with
 * no role and leaves the control a keyboard user actually lands on unnamed.
 * The component says so in a development warning, which is how this was caught.
 */
export function SliderField({
  id,
  label,
  hint,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  valueText?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const labelId = `${id}-label`;

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </div>
      <Slider
        aria-labelledby={labelId}
        aria-valuetext={valueText}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => {
          onChange(next ?? min);
        }}
      />
    </div>
  );
}

/**
 * Theme colours offered in a colour field. Written as `var(--color-…)` because
 * that is valid for every colour prop here: some also accept a bare token name
 * ("primary"), but others take any CSS colour and nothing else.
 */
const COLOR_SUGGESTIONS = [
  "primary",
  "foreground",
  "muted-foreground",
  "info",
  "success",
  "warning",
  "destructive",
].map((token) => `var(--color-${token})`);

export function ControlField({
  control,
  value,
  onChange,
  idPrefix = "playground",
}: {
  control: Control;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Prefix for the field's id, unique per panel on the page. */
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${control.prop}`;

  if (control.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="font-mono text-xs">
          {control.prop}
        </Label>
        <Switch id={id} checked={value === true} onCheckedChange={onChange} />
      </div>
    );
  }

  if (control.kind === "number") {
    if (hasRange(control)) {
      const numeric = typeof value === "number" ? value : control.min;
      return (
        <SliderField
          id={id}
          label={control.prop}
          hint={typeof value === "number" ? String(value) : "unset"}
          min={control.min}
          max={control.max}
          step={control.step ?? (control.max - control.min > 10 ? 1 : 0.05)}
          value={numeric}
          onChange={onChange}
        />
      );
    }
    return (
      <Field label={control.prop} htmlFor={id}>
        <Input
          id={id}
          type="number"
          inputSize="sm"
          className="font-mono"
          step={control.step ?? "any"}
          value={typeof value === "number" ? value : ""}
          placeholder="unset"
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            onChange(Number.isFinite(next) ? next : undefined);
          }}
        />
      </Field>
    );
  }

  if (control.kind === "text" || control.kind === "color") {
    const listId = `${id}-suggestions`;
    return (
      <Field label={control.prop} htmlFor={id}>
        <Input
          id={id}
          inputSize="sm"
          className="font-mono"
          maxLength={MAX_TEXT_PARAM}
          value={typeof value === "string" ? value : ""}
          placeholder={control.kind === "color" ? "token or CSS colour" : "unset"}
          list={control.kind === "color" ? listId : undefined}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
        {control.kind === "color" ? (
          <datalist id={listId}>
            {COLOR_SUGGESTIONS.map((token) => (
              <option key={token} value={token} />
            ))}
          </datalist>
        ) : null}
      </Field>
    );
  }

  // Select values are strings; numeric options are matched back by their text.
  const selected = control.options.find((option) => option === value);
  return (
    <Field label={control.prop} htmlFor={id}>
      <Select
        value={selected === undefined ? "" : String(selected)}
        onValueChange={(next) => {
          onChange(control.options.find((option) => String(option) === next));
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="default" />
        </SelectTrigger>
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
