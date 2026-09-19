"use client";

// Motion from SmoothUI Form (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.

import { Label as LabelPrimitive, Slot } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Accessible wiring for form fields.
 *
 * Deliberately **not** bound to a form library. What is actually hard about a
 * form field is the ARIA plumbing — generating an id, pointing the label at the
 * control, assembling `aria-describedby` from the description and the error,
 * and flipping `aria-invalid` — and that plumbing is identical whether the
 * state comes from `useState`, React Hook Form, Formik or a server action.
 *
 * Binding to one library would make everyone else install it to get the
 * plumbing, and would make the source you own harder to change. Pass `error`
 * from whatever holds your state:
 *
 *   <FormField name="email" error={errors.email?.message}>
 *     <FormLabel>Email</FormLabel>
 *     <FormControl>
 *       <Input {...register("email")} />
 *     </FormControl>
 *     <FormDescription>We will never share it.</FormDescription>
 *     <FormMessage />
 *   </FormField>
 */

interface FormFieldContextValue {
  id: string;
  name: string | undefined;
  descriptionId: string;
  messageId: string;
  error: ReactNode;
  hasDescription: boolean;
  registerDescription: (present: boolean) => void;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

function useFormField(component: string): FormFieldContextValue {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <FormField>.`);
  }
  return context;
}

export type FormProps = ComponentPropsWithRef<"form">;

/**
 * A form element.
 *
 * `noValidate` is on by default: when the form renders its own messages, the
 * browser's validation bubbles compete with them, appear in a different visual
 * language, and cannot be styled. Pass `noValidate={false}` to opt back in.
 */
export function Form({ className, noValidate = true, ...props }: FormProps) {
  return (
    <form
      data-slot="form"
      noValidate={noValidate}
      className={cn("grid gap-6", className)}
      {...props}
    />
  );
}

export interface FormFieldProps extends ComponentPropsWithRef<"div"> {
  /** Field name, mirrored onto the wrapper for form-library integration. */
  name?: string;
  /** Present when the field is invalid. Its content is rendered by FormMessage. */
  error?: ReactNode;
}

export function FormField({ className, name, error, ...props }: FormFieldProps) {
  const uid = useId();
  // Description presence is tracked rather than assumed: aria-describedby must
  // not name an element that was never rendered. axe flags a dangling reference,
  // and a screen reader announces nothing for it.
  const [hasDescription, setHasDescription] = useState(false);

  const registerDescription = useCallback((present: boolean) => {
    setHasDescription(present);
  }, []);

  const value = useMemo<FormFieldContextValue>(
    () => ({
      id: `${uid}-control`,
      name,
      descriptionId: `${uid}-description`,
      messageId: `${uid}-message`,
      error,
      hasDescription,
      registerDescription,
    }),
    [uid, name, error, hasDescription, registerDescription],
  );

  return (
    <FormFieldContext.Provider value={value}>
      <div
        data-slot="form-field"
        data-name={name}
        data-invalid={error ? true : undefined}
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormFieldContext.Provider>
  );
}

export type FormLabelProps = ComponentPropsWithRef<typeof LabelPrimitive.Root>;

export function FormLabel({ className, ...props }: FormLabelProps) {
  const { id, error } = useFormField("FormLabel");

  return (
    <LabelPrimitive.Root
      data-slot="form-label"
      data-invalid={error ? true : undefined}
      htmlFor={id}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-55",
        error && "text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export type FormControlProps = ComponentPropsWithRef<typeof Slot.Root>;

/**
 * Injects the field's id and ARIA attributes into its single child.
 *
 * Takes the control as a child rather than rendering one, so it works with any
 * input: our Input, a native select, a third-party editor.
 */
export function FormControl(props: FormControlProps) {
  const { id, error, messageId, descriptionId, hasDescription } = useFormField("FormControl");

  const describedBy =
    [hasDescription ? descriptionId : null, error ? messageId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Slot.Root
      data-slot="form-control"
      id={id}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  const { descriptionId, registerDescription } = useFormField("FormDescription");

  useEffect(() => {
    registerDescription(true);
    return () => {
      registerDescription(false);
    };
  }, [registerDescription]);

  return (
    <p
      data-slot="form-description"
      id={descriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface FormMessageProps extends ComponentPropsWithRef<"p"> {
  /**
   * Keeps a cleared message on screen long enough to fade and collapse, rather
   * than removing it at once. The departing copy is `aria-hidden`, carries no
   * id and is no longer named by the control, so it is never announced or
   * described. Off by default: with it on, the old text is briefly still in
   * the DOM, which tests asserting its absence immediately would notice.
   */
  animateExit?: boolean;
}

/*
 * The message grows open and fades in from just above (SmoothUI's Form). The
 * keyframes ship with the component (ADR 0014); height animates to `auto`
 * where the browser supports interpolate-size and simply appears elsewhere.
 * Durations are tokens, so reduced motion collapses them.
 */
const MESSAGE_KEYFRAMES = `
@keyframes dowel-form-message-in{from{opacity:0;transform:translateY(-0.25rem);height:0;overflow:clip}to{overflow:clip}}
@keyframes dowel-form-message-out{from{overflow:clip}to{opacity:0;transform:translateY(-0.25rem);height:0;overflow:clip}}
[data-slot="form-message"][data-state]{interpolate-size:allow-keywords}
[data-slot="form-message"][data-state="open"]{animation:dowel-form-message-in var(--duration-normal) var(--ease-out-quint)}
[data-slot="form-message"][data-state="closed"]{animation:dowel-form-message-out var(--duration-fast) var(--ease-in-quint) forwards}
`;

/** Removes a departing message if its animation never runs (hidden, unstyled). */
const EXIT_FALLBACK_MS = 1000;

/**
 * Renders the field's error.
 *
 * Renders nothing when there is no error and no children, so the layout does
 * not reserve space for a message that may never appear. It is a polite live
 * region: a validation message that arrives after the user has moved on should
 * be announced, but should not interrupt what is being read.
 */
export function FormMessage({
  className,
  children,
  animateExit = false,
  ...props
}: FormMessageProps) {
  const { messageId, error } = useFormField("FormMessage");
  const content = children ?? error;

  // Derived from the previous render rather than an effect, so the departing
  // copy is in place on the same commit the live one leaves — no blank frame.
  const [shown, setShown] = useState<ReactNode>(content);
  const [leaving, setLeaving] = useState<ReactNode>(null);
  if (content !== shown) {
    setShown(content);
    setLeaving(!content && animateExit ? shown : null);
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setLeaving(null);
    }, EXIT_FALLBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);

  // A native listener rather than onAnimationEnd: React resolves that prop to a
  // vendor-prefixed event name wherever AnimationEvent is missing. React 19
  // runs the returned cleanup when the element leaves.
  const listenForExitEnd = useCallback((element: HTMLParagraphElement | null) => {
    if (!element) return;
    const onEnd = (event: Event) => {
      if (event.target === element) setLeaving(null);
    };
    element.addEventListener("animationend", onEnd);
    return () => {
      element.removeEventListener("animationend", onEnd);
    };
  }, []);

  const styles = (
    <style href="dowel-form-message" precedence="dowel">
      {MESSAGE_KEYFRAMES}
    </style>
  );

  if (!content) {
    if (!leaving) return null;
    return (
      <>
        {styles}
        <p
          data-slot="form-message"
          data-state="closed"
          aria-hidden="true"
          ref={listenForExitEnd}
          className={cn("text-xs font-medium text-destructive", className)}
        >
          {leaving}
        </p>
      </>
    );
  }

  return (
    <>
      {styles}
      <p
        data-slot="form-message"
        data-state="open"
        id={messageId}
        role="status"
        aria-live="polite"
        className={cn("text-xs font-medium text-destructive", className)}
        {...props}
      >
        {content}
      </p>
    </>
  );
}
