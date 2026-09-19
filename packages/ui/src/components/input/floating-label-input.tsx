"use client";

// Motion from SmoothUI AnimatedInput (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Input, type InputProps } from "./input";

/*
 * An Input whose label rests inside the field and floats up onto the border
 * when the field is focused or holds a value.
 *
 * The source drives the label from React state and a JS tween. Here it is CSS
 * alone: the input carries a placeholder (a single space when none is given),
 * so `:placeholder-shown` is true exactly when the field is empty, and the
 * label is a `peer-` of the input. That covers typing, controlled values set
 * from outside, form resets and browser autofill without an effect in sight,
 * and the global reduced-motion rule turns the float into a jump.
 *
 * The label is a real <label for>, never a placeholder standing in for one:
 * it is the accessible name at rest and while floated alike.
 */

const floatingLabelVariants = cva(
  cn(
    "pointer-events-none absolute top-1/2 max-w-[calc(100%-1rem)] -translate-y-1/2 truncate",
    "rounded-sm bg-background px-1 leading-none text-muted-foreground select-none",
    // Grows from its inline-start edge, so it stays put against the border in RTL.
    "origin-[0_50%] rtl:origin-[100%_50%]",
    "transition-[top,scale,color] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
    // Floated: focused, holding a value, or autofilled.
    "peer-focus:top-0 peer-focus:scale-85",
    "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-85",
    "peer-autofill:top-0 peer-autofill:scale-85",
    "peer-[:focus:not([aria-invalid=true])]:text-primary",
    "peer-aria-invalid:text-destructive",
    "peer-disabled:opacity-55",
  ),
  {
    variants: {
      inputSize: {
        sm: "start-1.5 text-sm",
        md: "start-2 text-sm",
        lg: "start-2.5 text-base",
      },
    },
    defaultVariants: {
      inputSize: "md",
    },
  },
);

export interface FloatingLabelInputProps extends InputProps {
  /** The field's label. Rendered as a real `<label>` pointing at the input. */
  label: ReactNode;
  /** Classes for the positioned wrapper. `className` goes to the input, as on Input. */
  containerClassName?: string;
  /** Classes for the label. */
  labelClassName?: string;
}

/**
 * Input with a floating label.
 *
 * Every prop but the three above is forwarded to the `<input>`, including `id`,
 * `ref` and ARIA attributes — so it drops into `FormControl`, which injects the
 * field's id, `aria-describedby` and `aria-invalid` into its child, and the
 * label follows the id it is given.
 */
export function FloatingLabelInput({
  label,
  containerClassName,
  labelClassName,
  inputSize,
  id,
  placeholder,
  className,
  ...props
}: FloatingLabelInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div data-slot="floating-label-input" className={cn("relative", containerClassName)}>
      <Input
        id={inputId}
        inputSize={inputSize}
        // A space keeps :placeholder-shown meaningful when there is no hint;
        // a real hint only shows once the label has moved out of its way.
        placeholder={placeholder ?? " "}
        className={cn(
          "peer placeholder:text-transparent focus:placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        data-slot="floating-label-input-label"
        className={cn(floatingLabelVariants({ inputSize }), labelClassName)}
      >
        {label}
      </label>
    </div>
  );
}

export { floatingLabelVariants };
