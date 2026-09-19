"use client";

// Ported from SmoothUI Morph Surface (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A dock that grows into a panel in place — the control you pressed *becomes*
 * the form, rather than opening one somewhere else. The source animated
 * width, height and radius with a stiff, near-critically-damped spring; with
 * no gesture velocity to carry, that is a CSS transition on measured sizes.
 *
 * Behaviourally it is a non-modal popover: opening moves focus into the
 * panel, Escape collapses it and returns focus to the trigger, and clicking
 * or tabbing away collapses it without stealing focus back.
 */

type Size = number | string;

interface MorphSurfaceContextValue {
  open: boolean;
  close: (options?: { success?: boolean }) => void;
  panelLabel: string;
  icon: ReactNode;
}

const MorphSurfaceContext = createContext<MorphSurfaceContextValue | null>(null);

/** The surrounding surface, for custom panel content (a close button, say). */
export function useMorphSurface(): MorphSurfaceContextValue {
  const context = useContext(MorphSurfaceContext);
  if (!context) throw new Error("useMorphSurface must be used inside <MorphSurface>.");
  return context;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface MorphSurfaceProps extends ComponentPropsWithRef<"div"> {
  /** The trigger's text in the dock, e.g. "Ask AI" or "Feedback". */
  label: ReactNode;
  /** The panel's accessible name, also shown by `MorphSurfaceForm`. Defaults to `label`. */
  panelLabel?: string;
  /** Decoration beside the label (an orb, a logo). Hidden from assistive technology. */
  icon?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The expanded panel's width. Numbers are pixels. */
  panelWidth?: Size;
  /** The expanded panel's height. Numbers are pixels. */
  panelHeight?: Size;
  /** Shown in the dock, and announced, after the panel closes successfully. */
  successLabel?: string;
  /** How long the success label stays, in milliseconds. */
  successDuration?: number;
}

/** A dock that morphs into a panel — a feedback form, a quick prompt. */
export function MorphSurface({
  ref,
  className,
  style,
  children,
  label,
  panelLabel,
  icon,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  panelWidth = "22.5rem",
  panelHeight = "12.5rem",
  successLabel = "Sent",
  successDuration = 1500,
  ...props
}: MorphSurfaceProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const [success, setSuccess] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [dock, setDock] = useState<{ width: number; height: number } | null>(null);
  const panelId = useId();
  const name = panelLabel ?? (typeof label === "string" ? label : "Panel");

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const close = useCallback(
    (options: { success?: boolean; restore?: boolean } = {}) => {
      restoreFocus.current = options.restore ?? true;
      setOpen(false);
      if (options.success) {
        clearTimeout(successTimer.current);
        setSuccess(true);
        successTimer.current = setTimeout(() => setSuccess(false), successDuration);
      }
    },
    [setOpen, successDuration],
  );

  useEffect(() => () => clearTimeout(successTimer.current), []);

  // Measure the dock so the collapse has a concrete size to transition to.
  useLayoutEffect(() => {
    const element = dockRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width && height)
        setDock((d) => (d?.width === width && d.height === height ? d : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Focus follows the surface: into the panel on open, back to the trigger on close.
  useEffect(() => {
    if (open) {
      const panel = panelRef.current;
      const target =
        panel?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel?.querySelector<HTMLElement>(FOCUSABLE) ??
        panel;
      target?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // A press anywhere outside collapses it, leaving focus where the user put it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close({ restore: false });
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    close();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next && !rootRef.current?.contains(next)) close({ restore: false });
  }

  const state = open ? "open" : "closed";

  return (
    <div
      ref={setRootRef}
      data-slot="morph-surface"
      data-state={state}
      className={cn(
        "relative flex flex-col items-start justify-end overflow-hidden bg-popover text-popover-foreground shadow-lg ring-1 ring-border",
        "max-w-full transition-[width,height,border-radius] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
        "rounded-[1.25rem] data-[state=closed]:delay-[var(--duration-instant)] data-[state=open]:rounded-[0.875rem]",
        className,
      )}
      style={{
        width: open ? panelWidth : dock?.width,
        height: open ? panelHeight : dock?.height,
        ...style,
      }}
      {...props}
    >
      <div
        ref={dockRef}
        data-slot="morph-surface-dock"
        data-state={state}
        inert={open}
        className={cn(
          "flex h-11 w-max shrink-0 items-center gap-2 px-3 whitespace-nowrap select-none",
          "transition-[opacity,visibility] duration-[var(--duration-fast)]",
          "data-[state=open]:invisible data-[state=open]:opacity-0",
        )}
      >
        {icon ? (
          <span aria-hidden="true" className="flex size-6 items-center justify-center">
            {icon}
          </span>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          data-slot="morph-surface-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          className={cn(
            "rounded-full px-2 py-0.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] hover:bg-accent",
            focusRing,
          )}
        >
          {success ? successLabel : label}
        </button>
      </div>
      {/* Escape and focus-out bubble up from the controls inside; the dialog itself is not a control. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={name}
        tabIndex={-1}
        data-slot="morph-surface-panel"
        data-state={state}
        inert={!open}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "absolute start-0 bottom-0 flex flex-col p-1 outline-none",
          "transition-[opacity,visibility] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          "data-[state=closed]:invisible data-[state=closed]:opacity-0 data-[state=closed]:duration-[var(--duration-instant)]",
        )}
        style={{ width: panelWidth, height: panelHeight, maxWidth: "100%" }}
      >
        <MorphSurfaceContext.Provider value={{ open, close, panelLabel: name, icon }}>
          {children}
        </MorphSurfaceContext.Provider>
      </div>
      <span role="status" className="sr-only">
        {success ? successLabel : ""}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="flex h-6 min-w-6 items-center justify-center rounded-sm border border-border bg-muted px-1.5 font-sans text-xs text-foreground">
      {children}
    </kbd>
  );
}

export interface MorphSurfaceFormProps extends Omit<ComponentPropsWithRef<"form">, "onSubmit"> {
  /**
   * Called with the trimmed message. Return `false` to keep the panel open
   * (a failed request, say); otherwise it closes and shows the success label.
   */
  onSubmit?: (value: string, event: FormEvent<HTMLFormElement>) => boolean | void;
  placeholder?: string;
  /** The submit button's accessible name. The visible text is the shortcut. */
  submitLabel?: string;
  /** The textarea's form field name. */
  fieldName?: string;
}

/** The source's panel: a labelled message box, submitted with ⌘/Ctrl + Enter. */
export function MorphSurfaceForm({
  className,
  onSubmit,
  placeholder = "Ask me anything…",
  submitLabel = "Send",
  fieldName = "message",
  ...props
}: MorphSurfaceFormProps) {
  const { close, panelLabel, icon } = useMorphSurface();
  const fieldId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.elements.namedItem(fieldName) as HTMLTextAreaElement;
    const value = field.value.trim();
    if (!value) return;
    if (onSubmit?.(value, event) === false) return;
    field.value = "";
    close({ success: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      data-slot="morph-surface-form"
      className={cn("flex h-full flex-col", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 py-1 ps-2 pe-1">
        <label htmlFor={fieldId} className="flex items-center gap-1.5 text-sm font-medium">
          {icon ? (
            <span aria-hidden="true" className="flex size-6 items-center justify-center">
              {icon}
            </span>
          ) : null}
          {panelLabel}
        </label>
        <button
          type="submit"
          data-slot="morph-surface-submit"
          className={cn("flex items-center gap-1 rounded-md p-0.5", focusRing)}
        >
          <span className="sr-only">{submitLabel}</span>
          <span aria-hidden="true" className="flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>Enter</Kbd>
          </span>
        </button>
      </div>
      <textarea
        id={fieldId}
        name={fieldName}
        required
        data-autofocus
        spellCheck={false}
        placeholder={placeholder}
        aria-keyshortcuts="Meta+Enter Control+Enter"
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex-1 resize-none rounded-md bg-muted p-3 text-sm text-foreground placeholder:text-muted-foreground",
          focusRing,
        )}
      />
    </form>
  );
}
