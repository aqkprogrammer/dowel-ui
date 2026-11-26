"use client";

// Original design.
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from "react";

import { motionIsReduced } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Deletes an item by turning it to dust.
 *
 * When `deleted` turns true (or `actionRef.current.disintegrate()` is called),
 * the item is cut into a grid of small tiles — each a clipped, inert copy of
 * the real content, so the dust is made of what was actually on screen, text
 * and all — and the tiles drift up and away in a sweep across the item, fading
 * and blurring as they go. Then the row closes its height and `onDeleted`
 * fires, which is where the caller removes it from the list.
 *
 * No canvas and no screenshot library: copying the DOM is exact and costs a few
 * hundred small nodes for the length of the effect. The tile size grows with
 * the item, so a large card never makes more than about 360 tiles.
 *
 * Every duration is scaled by --motion-scale. Under reduced motion there is no
 * dust: the item fades and closes at once. The deletion is announced politely
 * in both cases.
 */

const MAX_TILES = 360;

export interface DustDeleteHandle {
  /** Turn the item to dust. Resolves when it has closed and `onDeleted` has run. */
  disintegrate: () => Promise<void>;
}

export interface DustDeleteProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  children: ReactNode;
  /** Turn the item to dust when this becomes true. */
  deleted?: boolean;
  /** Called once the item has closed. Remove it from your list here. */
  onDeleted?: () => void;
  /** Imperative handle, for deleting without owning a `deleted` flag. */
  actionRef?: Ref<DustDeleteHandle>;
  /** Announced politely when the item goes. Default "Deleted". */
  announcement?: string;
  /** How long the dust drifts, in ms at normal motion. Default 1100. */
  duration?: number;
}

type Phase = "idle" | "dusting" | "closing" | "gone";

function motionScale(): number {
  if (typeof window === "undefined") return 1;
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(value) && value >= 0 ? value : 1;
}

function finished(animation: Animation | undefined): Promise<void> {
  if (!animation) return Promise.resolve();
  return animation.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** A copy of the content that cannot be focused, read or clicked. */
function inertCopy(source: HTMLElement): HTMLElement {
  const copy = source.cloneNode(true) as HTMLElement;
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("[id]")]) {
    node.removeAttribute("id");
  }
  copy.setAttribute("inert", "");
  copy.setAttribute("aria-hidden", "true");
  // The original is hidden as the dust appears; its copies must not inherit that.
  copy.style.visibility = "visible";
  return copy;
}

export function DustDelete({
  children,
  deleted = false,
  onDeleted,
  actionRef,
  announcement = "Deleted",
  duration = 1100,
  className,
  ref,
  ...props
}: DustDeleteProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dustRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const running = useRef<Promise<void> | null>(null);
  const onDeletedRef = useRef(onDeleted);
  useEffect(() => {
    onDeletedRef.current = onDeleted;
  });

  const scatter = useCallback(
    async (content: HTMLElement, dust: HTMLElement, scale: number) => {
      const { width, height } = content.getBoundingClientRect();
      if (width === 0 || height === 0 || typeof content.animate !== "function") return;

      const tile = Math.max(6, Math.ceil(Math.sqrt((width * height) / MAX_TILES)));
      const columns = Math.ceil(width / tile);
      const rows = Math.ceil(height / tile);
      // The sweep runs with the reading direction: from the start edge.
      const rtl = window.getComputedStyle(content).direction === "rtl";
      const drift = rtl ? -1 : 1;
      const source = inertCopy(content);
      const animations: Promise<void>[] = [];

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = column * tile;
          const y = row * tile;
          const cell = document.createElement("div");
          // rtl-ok: tiles are cut at physical offsets of the measured box.
          cell.style.cssText = `position:absolute;left:${String(x)}px;top:${String(y)}px;width:${String(tile)}px;height:${String(tile)}px;overflow:hidden;will-change:transform,opacity`;
          const copy = source.cloneNode(true) as HTMLElement;
          // rtl-ok: the copy is shifted back by the tile's physical offset.
          copy.style.cssText += `;position:absolute;left:${String(-x)}px;top:${String(-y)}px;width:${String(width)}px;height:${String(height)}px;margin:0`;
          cell.appendChild(copy);
          dust.appendChild(cell);

          const along = rtl ? 1 - column / columns : column / columns;
          const delay = (along * 0.55 + Math.random() * 0.15) * duration * scale;
          const dx = drift * (20 + Math.random() * 70);
          const dy = -(15 + Math.random() * 55);
          const turn = (Math.random() - 0.5) * 90;
          animations.push(
            finished(
              cell.animate(
                [
                  { transform: "translate(0, 0) rotate(0deg)", opacity: 1, filter: "blur(0)" },
                  {
                    transform: `translate(${String(dx)}px, ${String(dy)}px) rotate(${String(turn)}deg) scale(0.6)`,
                    opacity: 0,
                    filter: "blur(2px)",
                  },
                ],
                {
                  duration: duration * 0.6 * scale,
                  delay,
                  easing: "cubic-bezier(.3,.6,.4,1)",
                  fill: "both",
                },
              ),
            ),
          );
        }
      }
      await Promise.all(animations);
    },
    [duration],
  );

  const disintegrate = useCallback((): Promise<void> => {
    if (running.current) return running.current;
    const root = rootRef.current;
    const content = contentRef.current;
    const dust = dustRef.current;
    if (!root || !content || !dust) return Promise.resolve();

    const work = (async () => {
      const reduced = motionIsReduced();
      const scale = reduced ? 0 : motionScale();
      setPhase("dusting");

      if (!reduced && scale > 0) {
        content.style.visibility = "hidden";
        await scatter(content, dust, scale);
      } else if (typeof content.animate === "function") {
        await finished(
          content.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 120,
            fill: "forwards",
          }),
        );
      }

      setPhase("closing");
      if (typeof root.animate === "function") {
        const height = root.getBoundingClientRect().height;
        await finished(
          root.animate(
            [
              { height: `${String(height)}px`, opacity: 1 },
              { height: "0px", opacity: 0 },
            ],
            {
              duration: reduced ? 120 : 260 * Math.max(scale, 0.001),
              easing: "cubic-bezier(.4,0,.2,1)",
              fill: "forwards",
            },
          ),
        );
      }

      dust.replaceChildren();
      setPhase("gone");
      onDeletedRef.current?.();
    })();

    running.current = work;
    return work;
  }, [scatter]);

  useImperativeHandle(actionRef, () => ({ disintegrate }), [disintegrate]);

  useEffect(() => {
    if (deleted) void disintegrate();
  }, [deleted, disintegrate]);

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="dust-delete"
      data-state={phase}
      className={cn("relative", phase !== "idle" && "overflow-visible", className)}
      hidden={phase === "gone" ? true : undefined}
      {...props}
    >
      <div
        ref={contentRef}
        data-slot="dust-delete-content"
        inert={phase !== "idle" ? true : undefined}
      >
        {children}
      </div>
      <div
        ref={dustRef}
        aria-hidden="true"
        data-slot="dust-delete-dust"
        className="pointer-events-none absolute inset-0"
      />
      <span role="status" className="sr-only">
        {phase === "idle" ? "" : announcement}
      </span>
    </div>
  );
}
