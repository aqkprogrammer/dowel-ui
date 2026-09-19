"use client";

// Ported from bencho Selection list (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { springEasing } from "./selection-list-spring";

/*
 * A multi-select list of people with an action that drops out from under it.
 *
 * The source's rows were independent toggle buttons. Here the box is a
 * `role="listbox" aria-multiselectable` with one tab stop: the arrows rove,
 * Space/Enter toggle, Ctrl/Cmd+A selects or clears everything. One shared
 * highlight pill slides to whichever row the pointer is over or, when the
 * pointer is elsewhere, to the row holding keyboard focus.
 *
 * The tick fills through an SVG goo filter (blur + alpha threshold), which is
 * what makes the fill read as liquid. Under reduced motion the goo layer is
 * dropped for a plain fill. The action is Dowel's Button, tucked behind the
 * box (inert, hidden from assistive technology) while nothing is selected; it
 * springs out on a `linear()` spring. Its result is announced politely.
 */

const STYLES = `
[data-slot="selection-list-fill"] { display: none; }
@media (prefers-reduced-motion: reduce) {
  [data-slot="selection-list-goo"] { display: none; }
  [data-slot="selection-list-fill"] { display: block; }
}
@supports (transition-timing-function: linear(0, 1)) {
  [data-slot="selection-list-action"][data-state="out"],
  [data-slot="selection-list-blob"] { transition-timing-function: var(--selection-list-spring); }
}
`;

/** The box surface. `inverted` is the workbench's dark fill. */
const selectionListVariants = cva("", {
  variants: {
    tone: {
      default: "bg-card text-card-foreground [--selection-list-surface:var(--color-card)]",
      inverted:
        "bg-foreground text-background [--selection-list-surface:var(--color-foreground)]",
    },
    /** A 1px inset hairline around the box. */
    stroke: {
      true: "ring-1 ring-border ring-inset",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    stroke: false,
  },
});

export interface SelectionListItem {
  id: string;
  name: string;
  /** Secondary line, such as a handle. */
  description?: string;
  /** Image URL. Initials are shown while it loads and if it fails. */
  avatar?: string;
}

export interface SelectionListProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof selectionListVariants> {
  items: SelectionListItem[];
  /** Controlled selection, as item ids. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Radius of the box in pixels; the pill and action radii derive from it. */
  corner?: number;
  /** The action's label for a selection count. */
  actionLabel?: string | ((count: number) => string);
  /** Shown on the action, and announced, once it has run. */
  doneLabel?: string;
  /** Runs with the selected ids. Return a promise to show a busy state until it settles. */
  onAction?: (ids: string[]) => unknown;
  /** Milliseconds the done label shows before the action tucks away. */
  resetAfter?: number;
  /** Overshoot of the action's spring, 0–1. */
  bounce?: number;
  listClassName?: string;
  actionClassName?: string;
}

function defaultActionLabel(count: number) {
  return count <= 1 ? "Send request" : `Send ${String(count)} requests`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function Tick({ filterId }: { filterId: string }) {
  const on = "group-aria-selected/row:";
  return (
    <span
      data-slot="selection-list-tick"
      aria-hidden="true"
      className="relative size-5.5 shrink-0"
    >
      <svg
        data-slot="selection-list-goo"
        viewBox="0 0 22 22"
        className="absolute inset-0 size-full overflow-visible"
      >
        <g filter={`url(#${filterId})`} fill="currentColor">
          <rect
            data-slot="selection-list-blob"
            x={2.3}
            y={2.3}
            width={17.4}
            height={17.4}
            rx={8.7}
            className={cn(
              "origin-center scale-0 opacity-0 [transform-box:fill-box]",
              "transition-[scale,opacity] duration-[calc(420ms*var(--motion-scale))] ease-[var(--ease-overshoot)]",
              `${on}scale-100 ${on}opacity-100`,
            )}
          />
          <circle
            cx={11}
            cy={11}
            r={4}
            className={cn(
              "origin-center -translate-y-2.5 scale-0 [transform-box:fill-box]",
              "transition-[translate,scale] delay-[calc(40ms*var(--motion-scale))] duration-[calc(300ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
              `${on}translate-y-0 ${on}scale-100`,
            )}
          />
        </g>
      </svg>
      <span
        data-slot="selection-list-fill"
        className={cn("absolute inset-0 rounded-full bg-current opacity-0", `${on}opacity-100`)}
      />
      <svg viewBox="0 0 22 22" fill="none" className="absolute inset-0 size-full">
        <circle
          data-slot="selection-list-ring"
          cx={11}
          cy={11}
          r={10.25}
          stroke="currentColor"
          strokeWidth={1.5}
          className={cn(
            "[stroke-opacity:.26] group-hover/row:[stroke-opacity:.48]",
            "transition-[stroke-opacity,opacity] duration-[calc(100ms*var(--motion-scale))]",
            `${on}opacity-0`,
          )}
        />
        <path
          data-slot="selection-list-check"
          d="M6.8 11.3l2.9 2.9 5.5-5.7"
          stroke="var(--selection-list-surface)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={14}
          className={cn(
            "[stroke-dashoffset:14]",
            "transition-[stroke-dashoffset] delay-[calc(60ms*var(--motion-scale))] duration-[calc(260ms*var(--motion-scale))] ease-[cubic-bezier(.32,.9,.3,1)]",
            `${on}[stroke-dashoffset:0]`,
          )}
        />
      </svg>
    </span>
  );
}

/** A multi-select list of people whose action springs out once someone is picked. */
export function SelectionList({
  className,
  style,
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  corner = 20,
  actionLabel = defaultActionLabel,
  doneLabel = "Requests sent",
  onAction,
  resetAfter = 1600,
  bounce = 0.35,
  tone,
  stroke,
  listClassName,
  actionClassName,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SelectionListProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? []);
  const value = (valueProp ?? uncontrolled).filter((id) =>
    items.some((item) => item.id === id),
  );
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [pill, setPill] = useState({ index: 0, shown: false });
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [lastCount, setLastCount] = useState(Math.max(1, value.length));
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const action = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const baseId = useId();
  const filterId = `dowel-selection-list-goo-${baseId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const count = value.length;
  const current = Math.min(active, Math.max(items.length - 1, 0));
  if (count > 0 && count !== lastCount) setLastCount(count);

  // The pill follows the pointer, else keyboard focus. Arriving from hidden it
  // jumps to the row first and fades in a frame later, so it never slides in.
  const target = hovered ?? (focused ? current : null);
  if (target === null ? pill.shown : pill.index !== target) {
    setPill({ index: target ?? pill.index, shown: target !== null && pill.shown });
  }
  const reveal = target !== null && !pill.shown && pill.index === target;
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => setPill((p) => ({ ...p, shown: true })));
    return () => cancelAnimationFrame(frame);
  }, [reveal]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const setValue = (next: string[]) => {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  const toggle = (id: string) => {
    setValue(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = items.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
      setHovered(null);
      rows.current[next]?.focus();
      return;
    }
    const item = items[current];
    if ((event.key === " " || event.key === "Enter") && item) {
      event.preventDefault();
      toggle(item.id);
    } else if (event.key.toLowerCase() === "a" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      setValue(count === items.length ? [] : items.map((i) => i.id));
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  function finish() {
    setPhase("done");
    setValue([]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // The action is about to become inert: bring focus back to the list
      // rather than letting it fall to the page.
      if (action.current?.contains(document.activeElement)) rows.current[current]?.focus();
      setPhase("idle");
    }, resetAfter);
  }

  function handleAction() {
    if (phase !== "idle" || count === 0) return;
    const result = onAction?.([...value]);
    if (result instanceof Promise) {
      setPhase("busy");
      result.then(
        () => {
          if (alive.current) finish();
        },
        () => {
          if (alive.current) setPhase("idle");
        },
      );
      return;
    }
    finish();
  }

  const out = count > 0 || phase !== "idle";
  const label =
    phase === "done"
      ? doneLabel
      : typeof actionLabel === "function"
        ? actionLabel(lastCount)
        : actionLabel;

  return (
    <div
      data-slot="selection-list"
      className={cn("relative flex w-67 max-w-full flex-col gap-2", className)}
      style={
        {
          "--selection-list-spring": springEasing(Math.min(Math.max(bounce, 0), 1)),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href="dowel-selection-list" precedence="dowel">
        {STYLES}
      </style>
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6.17"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label={ariaLabelledBy ? ariaLabel : (ariaLabel ?? "Select people")}
        aria-labelledby={ariaLabelledBy}
        data-slot="selection-list-box"
        className={cn(
          "relative z-1 flex flex-col gap-1 p-2.5",
          selectionListVariants({ tone, stroke }),
          listClassName,
        )}
        style={{ borderRadius: corner }}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onPointerLeave={() => setHovered(null)}
      >
        <span
          data-slot="selection-list-pill"
          data-state={pill.shown ? "visible" : "hidden"}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-2.5 top-2.5 h-11.5 opacity-0",
            "bg-[color-mix(in_oklab,currentColor_6%,transparent)]",
            "transition-[opacity] duration-[calc(160ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
            "data-[state=visible]:opacity-100 data-[state=visible]:transition-[opacity,transform]",
          )}
          style={{
            borderRadius: corner / 2,
            transform: `translateY(calc(${String(pill.index)} * (100% + 0.25rem)))`,
          }}
        />
        {items.map((item, index) => {
          const selected = value.includes(item.id);
          return (
            <div
              key={item.id}
              ref={(node) => {
                rows.current[index] = node;
              }}
              role="option"
              aria-selected={selected}
              aria-labelledby={`${baseId}-${String(index)}-name`}
              aria-describedby={
                item.description ? `${baseId}-${String(index)}-description` : undefined
              }
              tabIndex={index === current ? 0 : -1}
              data-slot="selection-list-option"
              className={cn(
                "group/row relative flex h-11.5 cursor-pointer items-center gap-2.75 px-2.25 select-none",
                focusRingInset,
              )}
              style={{ borderRadius: corner * 0.65 }}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setActive(index)}
              onKeyDown={handleKeyDown}
              onClick={() => {
                setActive(index);
                toggle(item.id);
              }}
            >
              <Avatar size="sm" aria-hidden="true">
                {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
                <AvatarFallback>{initials(item.name)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  id={`${baseId}-${String(index)}-name`}
                  className="truncate text-[0.8125rem] font-medium"
                >
                  {item.name}
                </span>
                {item.description ? (
                  <span
                    id={`${baseId}-${String(index)}-description`}
                    className="truncate text-[0.71875rem] text-current/45"
                  >
                    {item.description}
                  </span>
                ) : null}
              </span>
              <Tick filterId={filterId} />
            </div>
          );
        })}
      </div>
      <div
        ref={action}
        data-slot="selection-list-action"
        data-state={out ? "out" : "tucked"}
        inert={!out}
        aria-hidden={out ? undefined : true}
        className={cn(
          "group/action relative z-0 origin-top transition-[translate,scale]",
          "duration-[calc(540ms*var(--motion-scale))] ease-[var(--ease-overshoot)]",
          "data-[state=tucked]:-translate-y-13 data-[state=tucked]:scale-x-88 data-[state=tucked]:scale-y-55",
          "data-[state=tucked]:duration-[var(--duration-slow)] data-[state=tucked]:ease-[var(--ease-in-out-quint)]",
        )}
      >
        <Button
          type="button"
          press="none"
          disabled={!out}
          loading={phase === "busy"}
          data-slot="selection-list-cta"
          className={cn(
            "h-11 w-full bg-foreground text-[0.84375rem] text-background hover:bg-foreground active:bg-foreground",
            "transition-[background-color,color,translate,scale] duration-[calc(200ms*var(--motion-scale))]",
            "hover:-translate-y-px active:scale-[0.985]",
            "group-data-[state=tucked]/action:bg-foreground/7 group-data-[state=tucked]/action:text-foreground/40",
            "disabled:opacity-100",
            actionClassName,
          )}
          style={{ borderRadius: corner * 0.65 }}
          onClick={handleAction}
        >
          <span
            className={cn(
              "transition-opacity delay-[calc(150ms*var(--motion-scale))] duration-[var(--duration-normal)]",
              "group-data-[state=tucked]/action:opacity-0 group-data-[state=tucked]/action:delay-0",
            )}
          >
            {label}
          </span>
        </Button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {phase === "done" ? doneLabel : ""}
      </span>
    </div>
  );
}

export { selectionListVariants };
