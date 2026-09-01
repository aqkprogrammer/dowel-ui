"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { cn } from "@/lib/utils";

/**
 * Picks the model a conversation runs on.
 *
 * A thin, opinionated layer over Select rather than a new control: model
 * pickers differ between products in what they show, not in how they behave.
 * What this adds is the shape of the option — a name, a short description, and
 * the fact that some models are unavailable on the current plan — which is the
 * part every implementation gets wrong in the same way, by hiding the reason a
 * model cannot be chosen.
 */

export interface ModelOption {
  id: string;
  name: string;
  /** One line on what the model is for. */
  description?: string;
  /** Grouping, for example a provider name. */
  group?: string;
  disabled?: boolean;
  /**
   * Why it is unavailable.
   *
   * Shown and announced alongside the name. A disabled option with no reason
   * makes the user think the interface is broken.
   */
  disabledReason?: string;
  badge?: ReactNode;
}

export interface ModelSelectorProps extends Omit<
  ComponentPropsWithRef<typeof SelectTrigger>,
  "children"
> {
  models: ModelOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function ModelSelector({
  className,
  models,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select a model",
  ...props
}: ModelSelectorProps) {
  // Preserves the order the caller gave, rather than sorting group names.
  const groups = new Map<string, ModelOption[]>();
  for (const model of models) {
    const key = model.group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), model]);
  }

  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger
        data-slot="model-selector"
        className={cn("w-auto min-w-44 gap-2", className)}
        {...props}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="min-w-64">
        {[...groups].map(([group, groupModels]) => (
          <SelectGroup key={group || "ungrouped"}>
            {group ? <SelectLabel>{group}</SelectLabel> : null}
            {groupModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                disabled={model.disabled}
                textValue={model.name}
                // Only the name reaches the trigger; the description stays in
                // the list where there is room for it.
                label={model.name}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">{model.badge}</span>
                  {model.disabled && model.disabledReason ? (
                    <span className="text-2xs text-muted-foreground">
                      {model.disabledReason}
                    </span>
                  ) : model.description ? (
                    <span className="text-2xs text-muted-foreground">{model.description}</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
