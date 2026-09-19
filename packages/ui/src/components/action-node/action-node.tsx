"use client";

// Ported from bencho Action node (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { springEasing } from "./action-node-spring";

/*
 * A workflow node card whose actions fan out around its top-end corner.
 *
 * The source opens only on hover. Here hover still opens it, and so does a
 * "More actions" trigger in the card (aria-expanded, aria-controls): Enter,
 * Space or ArrowDown open the fan and focus its first action. The fan is a
 * `role="toolbar"` with roving focus (arrows, Home, End), Escape closes it and
 * returns focus to the trigger, and while closed it is inert, so the tucked
 * buttons are neither focusable nor announced.
 *
 * Each button springs along an arc with a CSS transition whose easing is a
 * `linear()` spring (./action-node-spring), staggered by an inline delay that
 * runs through --motion-scale. Under reduced motion the fan simply appears.
 */

const PREFIX = "action-node";
/** Action button diameter and the gap between neighbours on the arc, in px. */
const BUTTON = 36;
const ARC_GAP = 11;
/** Where closed buttons wait, tucked under the card, and their scale there. */
const REST = { x: -20, y: 20 };
const REST_SCALE = 0.82;
const OPEN_MS = 380;
const CLOSE_MS = 200;

const STYLES = `@supports (transition-timing-function: linear(0, 1)){[data-slot="${PREFIX}-item"][data-state="open"]{transition-timing-function:var(--${PREFIX}-spring)}}`;

const actionNodeVariants = cva("relative flex justify-center py-13", {
  variants: {
    /** `default` is a card-coloured node; `inverted` swaps surface and ink. */
    tone: {
      default:
        "[--action-node-ink:var(--color-foreground)] [--action-node-surface:var(--color-card)]",
      inverted:
        "[--action-node-ink:var(--color-background)] [--action-node-surface:var(--color-foreground)]",
    },
  },
  defaultVariants: { tone: "default" },
});

/** Ink mixed toward the surface, for the secondary text roles. */
const ink = (percent: number) =>
  `color-mix(in oklab, var(--action-node-ink) ${String(percent)}%, var(--action-node-surface))`;

/**
 * Where each open button sits, relative to the card's top-end corner (x toward
 * the inline end, y down). The buttons lie on an arc centred just inside the
 * card, spaced a button plus a gap apart and symmetric about the corner's
 * diagonal — at reach 30 that is bencho's (−51.7, −31.1) … (31, 51.7).
 */
export function fanPositions(count: number, reach: number): { x: number; y: number }[] {
  // Fitted to the measured positions: about a button wider than the reach.
  const radius = reach + 35.6;
  const centre = reach + 1.2;
  const step = 2 * Math.asin(Math.min(1, (BUTTON + ARC_GAP) / 2 / radius));
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI / 4 + ((count - 1) / 2 - index) * step;
    return {
      x: Math.round((-centre + radius * Math.cos(angle)) * 10) / 10,
      y: Math.round((centre - radius * Math.sin(angle)) * 10) / 10,
    };
  });
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word?.[0]?.toUpperCase() ?? "").join("");
}

function readRtl(element: HTMLElement): boolean {
  const attribute = element.closest("[dir]")?.getAttribute("dir");
  if (attribute === "rtl" || attribute === "ltr") return attribute === "rtl";
  return getComputedStyle(element).direction === "rtl";
}

export interface ActionNodeAction {
  /** The button's accessible name and tooltip. */
  label: string;
  /** Decorative icon. */
  icon: ReactNode;
  onSelect?: () => void;
}

export interface ActionNodePerson {
  /** Alt text and the fallback's accessible name. */
  name: string;
  /** Avatar image URL. Without it the initials show. */
  image?: string;
}

export interface ActionNodeProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof actionNodeVariants> {
  /** The node's name, e.g. "Node 07". */
  heading: ReactNode;
  description?: ReactNode;
  /** Decorative icon in the chip beside the heading. */
  icon?: ReactNode;
  /** People shown as overlapping avatars. */
  people?: ActionNodePerson[];
  /** Shown after the avatars as "+N". */
  extraCount?: number;
  /** Names the avatar list. */
  peopleLabel?: string;
  /** The fan's buttons; two to four read best. */
  actions: ActionNodeAction[];
  /** Whether the fan is open (controlled). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Spring overshoot, 0–100. */
  bounce?: number;
  /** Delay between buttons, 0–100 (about 0.9ms per step). */
  stagger?: number;
  /** Arc radius in px, 20–40. */
  reach?: number;
  /** Card radius in px; the chip's radius derives from it. */
  corner?: number;
  /** Adds a 1px hairline to the card and the buttons. */
  stroke?: boolean;
  /** The trigger's accessible name. */
  triggerLabel?: string;
  /** The toolbar's accessible name. */
  toolbarLabel?: string;
}

/** A workflow node card whose action buttons fan out around its top-end corner. */
export function ActionNode({
  className,
  style,
  heading,
  description,
  icon,
  people = [],
  extraCount = 0,
  peopleLabel = "People",
  actions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  bounce = 20,
  stagger = 55,
  reach = 30,
  corner = 20,
  stroke = false,
  tone,
  triggerLabel = "More actions",
  toolbarLabel = "Node actions",
  ...props
}: ActionNodeProps) {
  const fanId = useId();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const [activeIndex, setActiveIndex] = useState(0);
  const zoneRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingFocus = useRef<number | null>(null);
  // Opened from the keyboard: the pointer leaving must not close it under focus.
  const keyboardOpen = useRef(false);
  const [rtl, setRtl] = useState(false);

  useLayoutEffect(() => {
    if (zoneRef.current) setRtl(readRtl(zoneRef.current));
  }, [props.dir]);

  function setOpen(next: boolean) {
    if (next === open) return;
    if (!next) {
      keyboardOpen.current = false;
      // Never strand focus on a button that is about to become inert.
      if (fanRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
    }
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }

  function openFromKeyboard(focusIndex: number) {
    keyboardOpen.current = true;
    pendingFocus.current = focusIndex;
    if (open) focusAction(focusIndex);
    else setOpen(true);
  }

  function focusAction(index: number) {
    pendingFocus.current = null;
    setActiveIndex(index);
    buttonRefs.current[index]?.focus();
  }

  useEffect(() => {
    if (open && pendingFocus.current !== null) focusAction(pendingFocus.current);
  }, [open]);

  // A press anywhere else closes it, which is also how touch dismisses it.
  const latestSetOpen = useRef(setOpen);
  useLayoutEffect(() => {
    latestSetOpen.current = setOpen;
  });
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!zoneRef.current?.contains(event.target as Node)) latestSetOpen.current(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    setOpen(true);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    if (keyboardOpen.current && zoneRef.current?.contains(document.activeElement)) return;
    setOpen(false);
  }

  function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    // detail 0 is a click from Enter or Space rather than a pointer.
    if (open) setOpen(false);
    else if (event.detail === 0) openFromKeyboard(0);
    else setOpen(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openFromKeyboard(0);
  }

  function handleZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleFanKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const count = actions.length;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === forward || event.key === "ArrowDown") next = (activeIndex + 1) % count;
    else if (event.key === backward || event.key === "ArrowUp")
      next = (activeIndex - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    keyboardOpen.current = true;
    focusAction(next);
  }

  function handleZoneBlur(event: FocusEvent<HTMLDivElement>) {
    const to = event.relatedTarget;
    if (open && to && !zoneRef.current?.contains(to)) setOpen(false);
  }

  const sign = rtl ? -1 : 1;
  const positions = fanPositions(actions.length, reach);
  const staggerMs = Math.max(0, stagger) * 0.9;
  const bridgeStart = reach + 45;
  const bridgeEnd = reach + 26;
  const bridgeSize = bridgeStart + bridgeEnd;
  const cutX = (bridgeStart / bridgeSize) * 100;
  const cutY = (bridgeEnd / bridgeSize) * 100;
  // The L-shaped hover bridge: a square round the corner minus the card's part.
  const bridgeClip = rtl
    ? `polygon(100% 0, 0 0, 0 100%, ${String(100 - cutX)}% 100%, ${String(100 - cutX)}% ${String(cutY)}%, 100% ${String(cutY)}%)`
    : `polygon(0 0, 100% 0, 100% 100%, ${String(cutX)}% 100%, ${String(cutX)}% ${String(cutY)}%, 0 ${String(cutY)}%)`;

  const surface = "bg-[var(--action-node-surface)] text-[var(--action-node-ink)]";
  const hairline = stroke && "ring-1 ring-border ring-inset";

  return (
    <div
      data-slot={PREFIX}
      data-state={open ? "open" : "closed"}
      className={cn(actionNodeVariants({ tone }), className)}
      style={
        {
          "--action-node-spring": springEasing(Math.min(Math.max(bounce, 0), 100) / 100),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href={`dowel-${PREFIX}`} precedence="dowel">
        {STYLES}
      </style>
      {/* Hover, Escape and focus-leaving are observed here; the controls inside are real buttons. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={zoneRef}
        data-slot={`${PREFIX}-zone`}
        data-open={open ? "" : undefined}
        className="group/action-node relative w-75 max-w-full"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleZoneKeyDown}
        onBlur={handleZoneBlur}
      >
        <div
          data-slot={`${PREFIX}-card`}
          data-open={open ? "" : undefined}
          className={cn(
            "relative z-1 p-4.5",
            surface,
            hairline,
            "transition-[translate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)] data-[open]:-translate-y-px",
          )}
          style={{ borderRadius: corner }}
        >
          <div className="flex items-center gap-2.5">
            {icon != null ? (
              <span
                aria-hidden="true"
                data-slot={`${PREFIX}-icon`}
                className="flex size-7.5 shrink-0 items-center justify-center [&_svg]:size-4"
                style={{
                  borderRadius: Math.round(corner * 0.4),
                  background: `color-mix(in oklab, var(--action-node-ink) 6%, transparent)`,
                }}
              >
                {icon}
              </span>
            ) : null}
            <div
              data-slot={`${PREFIX}-heading`}
              className="min-w-0 flex-1 text-[15px] font-medium"
            >
              {heading}
            </div>
            <button
              ref={triggerRef}
              type="button"
              aria-label={triggerLabel}
              aria-expanded={open}
              aria-controls={fanId}
              data-slot={`${PREFIX}-trigger`}
              className={cn(
                "-me-1.5 flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
                "opacity-0 transition-opacity duration-[var(--duration-fast)] focus-visible:opacity-100",
                "group-hover/action-node:opacity-100 group-data-[open]/action-node:opacity-100 [@media(hover:none)]:opacity-100",
                focusRing,
              )}
              style={{ color: ink(60) }}
              onClick={handleTriggerClick}
              onKeyDown={handleTriggerKeyDown}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </button>
          </div>
          {description != null ? (
            <div
              data-slot={`${PREFIX}-description`}
              className="mt-2.5 text-[13.5px] leading-normal"
              style={{ color: ink(68) }}
            >
              {description}
            </div>
          ) : null}
          {people.length > 0 || extraCount > 0 ? (
            <div data-slot={`${PREFIX}-people`} className="mt-3.5 flex items-center gap-1.5">
              {people.length > 0 ? (
                <ul aria-label={peopleLabel} className="flex items-center">
                  {people.map((person, index) => (
                    <li key={`${person.name}-${String(index)}`} className="-ms-1.5 first:ms-0">
                      <Avatar size="xs" className="ring-2 ring-[var(--action-node-surface)]">
                        {person.image ? (
                          <AvatarImage src={person.image} alt={person.name} draggable={false} />
                        ) : null}
                        <AvatarFallback
                          style={{
                            background: `color-mix(in oklab, var(--action-node-ink) 10%, var(--action-node-surface))`,
                            color: ink(70),
                          }}
                        >
                          <span aria-hidden="true">{initials(person.name)}</span>
                          <span className="sr-only">{person.name}</span>
                        </AvatarFallback>
                      </Avatar>
                    </li>
                  ))}
                </ul>
              ) : null}
              {extraCount > 0 ? (
                <span className="text-[11.5px] font-medium" style={{ color: ink(58) }}>
                  <span aria-hidden="true">+{extraCount}</span>
                  <span className="sr-only">{`and ${String(extraCount)} more`}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute end-0 top-0 z-0 size-0">
          <div
            data-slot={`${PREFIX}-bridge`}
            className={cn("absolute", open ? "pointer-events-auto" : "pointer-events-none")}
            style={{
              top: -bridgeEnd,
              [rtl ? "right" : "left"]: -bridgeStart,
              width: bridgeSize,
              height: bridgeSize,
              clipPath: bridgeClip,
            }}
          />
        </div>
        <div
          ref={fanRef}
          id={fanId}
          role="toolbar"
          aria-label={toolbarLabel}
          aria-hidden={open ? undefined : true}
          inert={!open}
          data-slot={`${PREFIX}-fan`}
          className="absolute end-0 top-0 z-0 size-0"
          onKeyDown={handleFanKeyDown}
        >
          {actions.map((action, index) => {
            const at = open ? (positions[index] as { x: number; y: number }) : REST;
            const delay = open ? index * staggerMs : 0;
            return (
              <span
                key={`${action.label}-${String(index)}`}
                data-slot={`${PREFIX}-item`}
                data-state={open ? "open" : "closed"}
                className="absolute transition-[translate,scale] ease-[var(--ease-out-quint)] data-[state=open]:ease-[var(--ease-overshoot)]"
                style={{
                  left: -BUTTON / 2,
                  top: -BUTTON / 2,
                  translate: `${String(at.x * sign)}px ${String(at.y)}px`,
                  scale: open ? "1" : String(REST_SCALE),
                  transitionDuration: `calc(${String(open ? OPEN_MS : CLOSE_MS)}ms * var(--motion-scale))`,
                  transitionDelay: `calc(${String(delay)}ms * var(--motion-scale))`,
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={(node) => {
                        buttonRefs.current[index] = node;
                      }}
                      type="button"
                      aria-label={action.label}
                      tabIndex={open && index === activeIndex ? 0 : -1}
                      data-slot={`${PREFIX}-action`}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full shadow-sm [&_svg]:size-4",
                        "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:scale-112",
                        surface,
                        hairline,
                        focusRing,
                      )}
                      onFocus={() => {
                        setActiveIndex(index);
                      }}
                      onClick={() => {
                        action.onSelect?.();
                      }}
                    >
                      <span aria-hidden="true" className="contents">
                        {action.icon}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { actionNodeVariants };
