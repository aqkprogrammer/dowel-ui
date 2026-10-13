"use client";

// Original design (pattern from the WAI-ARIA APG window splitter; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Panels side by side (or stacked) with handles between them to resize.
 *
 * Sizes are percentages of the group, held by the group and applied as flex
 * grow factors, so the handles keep their own width and the panels share the
 * rest. A handle resizes the two panels either side of it and nothing else,
 * within each panel's min and max.
 *
 * Each handle is a window splitter in the APG's sense: a focusable separator
 * whose value is the size of the panel before it. Arrow keys move it — in
 * reading direction, so the left arrow grows the first panel in a
 * right-to-left layout — Shift moves further, Home and End go to the limits,
 * and Enter collapses a collapsible panel and brings it back.
 */

interface PanelEntry {
  id: string;
  element: HTMLElement;
  defaultSize?: number;
  minSize: number;
  maxSize: number;
  collapsible: boolean;
  collapsedSize: number;
}

interface GroupContextValue {
  direction: "horizontal" | "vertical";
  sizes: Map<string, number>;
  register: (entry: PanelEntry) => () => void;
  /** Panels in document order. */
  ordered: () => PanelEntry[];
  /** Moves the boundary after panel `index` by `delta` percent. */
  resize: (index: number, delta: number) => void;
  /** Sets the panel at `index` to `size`, taking the difference from its neighbour. */
  setSize: (index: number, size: number) => void;
  toggleCollapse: (index: number) => void;
  group: () => HTMLElement | null;
}

const GroupContext = createContext<GroupContextValue | null>(null);

function useGroup(part: string): GroupContextValue {
  const context = useContext(GroupContext);
  if (!context) throw new Error(`<${part}> must be used inside <ResizablePanelGroup>.`);
  return context;
}

function byDocumentOrder(a: PanelEntry, b: PanelEntry): number {
  return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
}

/**
 * Starting sizes: each panel's `defaultSize` where it has one, and an even
 * share of what is left where it does not, scaled so they sum to 100.
 */
export function initialPanelSizes(defaults: readonly (number | undefined)[]): number[] {
  if (defaults.length === 0) return [];
  const given = defaults.reduce<number>((sum, size) => sum + (size ?? 0), 0);
  const unset = defaults.filter((size) => size === undefined).length;
  const share = unset > 0 ? Math.max(0, 100 - given) / unset : 0;
  const raw = defaults.map((size) => size ?? share);
  const total = raw.reduce((sum, size) => sum + size, 0);
  return total > 0 ? raw.map((size) => (size / total) * 100) : raw.map(() => 100 / raw.length);
}

/**
 * Moves the boundary between `before` and `after` by `delta` percent, within
 * both panels' limits. Returns the two new sizes.
 */
export function movePanelBoundary(
  before: { size: number; min: number; max: number },
  after: { size: number; min: number; max: number },
  delta: number,
): [number, number] {
  const total = before.size + after.size;
  const lower = Math.max(before.min, total - after.max);
  const upper = Math.min(before.max, total - after.min);
  const next = Math.min(upper, Math.max(lower, before.size + delta));
  return [next, total - next];
}

const groupVariants = cva("flex size-full overflow-hidden", {
  variants: {
    direction: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
  },
  defaultVariants: { direction: "horizontal" },
});

export interface ResizablePanelGroupProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof groupVariants> {
  /** Called with every panel's size, in order, whenever a handle moves one. */
  onLayout?: (sizes: number[]) => void;
}

/** A row (or column) of resizable panels. Give it a size; the panels share it. */
export function ResizablePanelGroup({
  direction,
  onLayout,
  className,
  ref,
  ...props
}: ResizablePanelGroupProps) {
  const axis = direction ?? "horizontal";
  const panels = useRef(new Map<string, PanelEntry>());
  const [sizes, setSizes] = useState(() => new Map<string, number>());
  const sizesRef = useRef(sizes);
  const groupNode = useRef<HTMLDivElement | null>(null);
  const onLayoutRef = useRef(onLayout);
  useLayoutEffect(() => {
    sizesRef.current = sizes;
    onLayoutRef.current = onLayout;
  });
  // The size a collapsed panel goes back to.
  const restore = useRef(new Map<string, number>());

  const ordered = useCallback(() => [...panels.current.values()].sort(byDocumentOrder), []);

  const layoutFrom = useCallback(() => {
    const list = ordered();
    const known = sizesRef.current;
    if (list.every((panel) => known.has(panel.id)) && known.size === list.length) return;
    const initial = initialPanelSizes(list.map((panel) => panel.defaultSize));
    const next = new Map(list.map((panel, i) => [panel.id, initial[i] ?? 0]));
    sizesRef.current = next;
    setSizes(next);
  }, [ordered]);

  const register = useCallback(
    (entry: PanelEntry) => {
      panels.current.set(entry.id, entry);
      layoutFrom();
      return () => {
        panels.current.delete(entry.id);
        setSizes((previous) => {
          const next = new Map(previous);
          next.delete(entry.id);
          return next;
        });
      };
    },
    [layoutFrom],
  );

  const commit = useCallback(
    (next: Map<string, number>) => {
      sizesRef.current = next;
      setSizes(next);
      onLayoutRef.current?.(ordered().map((panel) => next.get(panel.id) ?? 0));
    },
    [ordered],
  );

  const resize = useCallback(
    (index: number, delta: number) => {
      const list = ordered();
      const before = list[index];
      const after = list[index + 1];
      if (!before || !after) return;
      const current = sizesRef.current;
      const [a, b] = movePanelBoundary(
        {
          size: current.get(before.id) ?? 0,
          min: before.collapsible ? before.collapsedSize : before.minSize,
          max: before.maxSize,
        },
        {
          size: current.get(after.id) ?? 0,
          min: after.collapsible ? after.collapsedSize : after.minSize,
          max: after.maxSize,
        },
        delta,
      );
      // A collapsible panel dragged below its minimum snaps shut.
      let first = a;
      let second = b;
      if (before.collapsible && first < before.minSize && first > before.collapsedSize) {
        const shut = first <= (before.minSize + before.collapsedSize) / 2;
        const target = shut ? before.collapsedSize : before.minSize;
        second += first - target;
        first = target;
      }
      const next = new Map(current);
      next.set(before.id, first);
      next.set(after.id, second);
      commit(next);
    },
    [commit, ordered],
  );

  const setSize = useCallback(
    (index: number, size: number) => {
      const panel = ordered()[index];
      if (!panel) return;
      resize(index, size - (sizesRef.current.get(panel.id) ?? 0));
    },
    [ordered, resize],
  );

  const toggleCollapse = useCallback(
    (index: number) => {
      const panel = ordered()[index];
      if (!panel?.collapsible) return;
      const size = sizesRef.current.get(panel.id) ?? 0;
      if (size > panel.collapsedSize) {
        restore.current.set(panel.id, size);
        setSize(index, panel.collapsedSize);
      } else {
        setSize(index, restore.current.get(panel.id) ?? panel.defaultSize ?? panel.minSize);
      }
    },
    [ordered, setSize],
  );

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      groupNode.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const context = useMemo<GroupContextValue>(
    () => ({
      direction: axis,
      sizes,
      register,
      ordered,
      resize,
      setSize,
      toggleCollapse,
      group: () => groupNode.current,
    }),
    [axis, sizes, register, ordered, resize, setSize, toggleCollapse],
  );

  return (
    <GroupContext.Provider value={context}>
      <div
        ref={setRefs}
        data-slot="resizable-panel-group"
        data-direction={axis}
        className={cn(groupVariants({ direction: axis }), className)}
        {...props}
      />
    </GroupContext.Provider>
  );
}

export interface ResizablePanelProps extends ComponentPropsWithRef<"div"> {
  /** Starting size, as a percentage of the group. Panels without one share what is left. */
  defaultSize?: number;
  /** Smallest size, in percent. Default 10. */
  minSize?: number;
  /** Largest size, in percent. Default 100. */
  maxSize?: number;
  /** Can be closed to `collapsedSize` with Enter on its handle, or by dragging past its minimum. */
  collapsible?: boolean;
  /** Size when collapsed, in percent. Default 0. */
  collapsedSize?: number;
}

/** One panel of a group. Its content scrolls when it is too big for it. */
export function ResizablePanel({
  defaultSize,
  minSize = 10,
  maxSize = 100,
  collapsible = false,
  collapsedSize = 0,
  id: idProp,
  className,
  style,
  ref,
  ...props
}: ResizablePanelProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const { register, sizes } = useGroup("ResizablePanel");
  const node = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!node.current) return;
    return register({
      id,
      element: node.current,
      defaultSize,
      minSize,
      maxSize,
      collapsible,
      collapsedSize,
    });
  }, [register, id, defaultSize, minSize, maxSize, collapsible, collapsedSize]);

  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  // Before the group has laid out (and on the server), the default size is
  // the best guess, so the first paint is already close.
  const size = sizes.get(id) ?? defaultSize ?? 1;
  const collapsed = collapsible && size <= collapsedSize;

  return (
    <div
      ref={setRefs}
      id={id}
      data-slot="resizable-panel"
      data-collapsed={collapsed || undefined}
      className={cn("min-h-0 min-w-0 overflow-auto", className)}
      style={{ flex: `${String(size)} 1 0px`, ...style }}
      {...props}
    />
  );
}

export interface ResizableHandleProps extends ComponentPropsWithRef<"div"> {
  /** Show a grip in the middle of the handle. Default false. */
  withHandle?: boolean;
  /** Percent moved per arrow key press; Shift moves ten times as far. Default 1. */
  keyboardStep?: number;
}

/** The boundary between two panels: drag it, or focus it and use the arrow keys. */
export function ResizableHandle({
  withHandle = false,
  keyboardStep = 1,
  className,
  "aria-label": ariaLabel,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ref,
  ...props
}: ResizableHandleProps) {
  const { direction, sizes, ordered, resize, setSize, toggleCollapse, group } =
    useGroup("ResizableHandle");
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const drag = useRef<{ pointer: number; last: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Which boundary this is: the number of panels before it, less one. Read
  // again whenever the layout changes, which is also when panels come and go.
  const list = useMemo(() => (sizes.size >= 0 ? ordered() : []), [ordered, sizes]);
  const index = element
    ? list.filter(
        (entry) =>
          entry.element.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).length - 1
    : -1;
  const panel = list[index];
  const next = list[index + 1];
  const size = panel ? (sizes.get(panel.id) ?? 0) : 0;
  const pairTotal = panel && next ? size + (sizes.get(next.id) ?? 0) : 100;
  const min = panel
    ? Math.max(
        panel.collapsible ? panel.collapsedSize : panel.minSize,
        pairTotal - (next?.maxSize ?? 100),
      )
    : 0;
  const max = panel ? Math.min(panel.maxSize, pairTotal - (next?.minSize ?? 0)) : 100;

  const rtl = () => (element ? getComputedStyle(element).direction === "rtl" : false);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || index < 0) return;
    const step = keyboardStep * (event.shiftKey ? 10 : 1);
    const grow = direction === "vertical" ? "ArrowDown" : rtl() ? "ArrowLeft" : "ArrowRight";
    const shrink = direction === "vertical" ? "ArrowUp" : rtl() ? "ArrowRight" : "ArrowLeft";
    if (event.key === grow) resize(index, step);
    else if (event.key === shrink) resize(index, -step);
    else if (event.key === "Home") setSize(index, min);
    else if (event.key === "End") setSize(index, max);
    else if (event.key === "Enter") toggleCollapse(index);
    else return;
    event.preventDefault();
  };

  const position = (event: PointerEvent<HTMLDivElement>) =>
    direction === "vertical" ? event.clientY : event.clientX;

  const setRefs = useCallback(
    (next: HTMLDivElement | null) => {
      setElement(next);
      if (typeof ref === "function") ref(next);
      else if (ref) ref.current = next;
    },
    [ref],
  );

  return (
    // A focusable separator with a value is a widget in ARIA 1.2 — the window
    // splitter — though jsx-a11y counts every separator as static.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={setRefs}
      role="separator"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      aria-label={ariaLabel ?? "Resize"}
      aria-controls={panel?.id}
      aria-valuenow={Math.round(size)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      data-slot="resizable-handle"
      data-direction={direction}
      data-dragging={dragging || undefined}
      className={cn(
        "group/handle relative flex shrink-0 touch-none items-center justify-center bg-border outline-none select-none",
        "after:absolute after:content-['']",
        direction === "horizontal"
          ? "w-px cursor-col-resize after:-inset-x-1.5 after:inset-y-0"
          : "h-px cursor-row-resize after:inset-x-0 after:-inset-y-1.5",
        "hover:bg-ring/60 focus-visible:bg-ring data-dragging:bg-ring",
        "focus-visible:ring-2 focus-visible:ring-ring/55",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        event.preventDefault();
        drag.current = { pointer: event.pointerId, last: position(event) };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        const state = drag.current;
        if (!state || state.pointer !== event.pointerId || index < 0) return;
        const box = group()?.getBoundingClientRect();
        const extent = box ? (direction === "vertical" ? box.height : box.width) : 0;
        if (extent <= 0) return;
        const now = position(event);
        const moved = ((now - state.last) / extent) * 100;
        state.last = now;
        resize(index, direction === "horizontal" && rtl() ? -moved : moved);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        drag.current = null;
        setDragging(false);
      }}
      {...props}
    >
      {withHandle ? (
        <span
          aria-hidden="true"
          data-slot="resizable-grip"
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border border-border bg-background",
            direction === "horizontal"
              ? "h-5 w-3 flex-col gap-0.5"
              : "h-3 w-5 flex-row gap-0.5",
          )}
        >
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-0.5 rounded-full bg-muted-foreground" />
          ))}
        </span>
      ) : null}
    </div>
  );
}

export { groupVariants as resizablePanelGroupVariants };
