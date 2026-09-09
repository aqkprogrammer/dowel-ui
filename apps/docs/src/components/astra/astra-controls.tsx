"use client";

import { RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import styles from "./astra-hero.module.css";
import {
  ASTRA_EVENTS,
  dispatchAstraPointer,
  dispatchAstraReplay,
  dispatchAstraReturn,
  dispatchAstraRotate,
} from "./events";

/**
 * The surface you drag to turn the field, and the button that replays it.
 *
 * The drag surface is a real button so the keyboard gets the same control —
 * arrow keys nudge the rotation — and so assistive technology hears what it
 * does. A hover (no button held) reports the pointer for the shove instead.
 */

interface ActivePointer {
  id: number;
  target: HTMLButtonElement;
  x: number;
  y: number;
}

const KEY_ROTATION: Record<string, { x: number; y: number }> = {
  ArrowDown: { x: 0, y: 0.08 },
  ArrowLeft: { x: -0.08, y: 0 },
  ArrowRight: { x: 0.08, y: 0 },
  ArrowUp: { x: 0, y: -0.08 },
};

function releaseCapture(pointer: ActivePointer | null): void {
  if (!pointer) return;
  try {
    if (pointer.target.hasPointerCapture(pointer.id))
      pointer.target.releasePointerCapture(pointer.id);
  } catch {
    // The element may already be gone.
  }
}

function insideTarget(event: ReactPointerEvent<HTMLButtonElement>): boolean {
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom
  );
}

export interface AstraControlsProps {
  /** Whether this instance renders a drag surface at all. */
  enabled: boolean;
  interactionLabel: string;
  replayLabel?: string;
  showReplay?: boolean;
}

export function AstraControls({
  enabled,
  interactionLabel,
  replayLabel,
  showReplay = false,
}: AstraControlsProps) {
  const activePointer = useRef<ActivePointer | null>(null);
  const hovering = useRef(false);
  const pressing = useRef(false);
  const dragged = useRef(false);
  const mounted = useRef(true);
  const [dragging, setDragging] = useState(false);

  const report = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      active: boolean,
      pressed: boolean,
    ): boolean => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;
      hovering.current = active;
      pressing.current = pressed;
      dispatchAstraPointer({ active, clientX: event.clientX, clientY: event.clientY, pressed });
      return true;
    },
    [],
  );

  const clear = useCallback(() => {
    if (!hovering.current && !pressing.current) return;
    hovering.current = false;
    pressing.current = false;
    dispatchAstraPointer({ active: false, clientX: 0, clientY: 0, pressed: false });
  }, []);

  /** Ends a drag; with an event, the pointer keeps hovering afterwards. */
  const finish = useCallback(
    (event?: ReactPointerEvent<HTMLButtonElement>, updateState = true) => {
      const pointer = activePointer.current;
      const wasEngaged =
        pointer !== null || hovering.current || pressing.current || dragged.current;
      activePointer.current = null;
      releaseCapture(pointer);
      dragged.current = false;
      if (updateState && mounted.current) setDragging(false);
      if (wasEngaged) {
        if (event) report(event, true, false);
        else clear();
        dispatchAstraReturn();
      }
    },
    [clear, report],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      finish(undefined, false);
    };
  }, [finish]);

  useEffect(() => {
    const end = () => finish();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") finish();
    };
    window.addEventListener("blur", end);
    window.addEventListener(ASTRA_EVENTS.replay, end);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", end);
      window.removeEventListener(ASTRA_EVENTS.replay, end);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [finish]);

  useEffect(() => {
    if (!enabled) finish();
  }, [enabled, finish]);

  return (
    <>
      {enabled && (
        <button
          type="button"
          aria-label={interactionLabel}
          className={styles.dragSurface}
          data-dragging={dragging}
          onKeyDown={(event) => {
            const delta = KEY_ROTATION[event.key];
            if (delta) {
              event.preventDefault();
              dispatchAstraRotate(delta);
            }
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || activePointer.current !== null)
              return;
            if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              return;
            }
            activePointer.current = {
              id: event.pointerId,
              target: event.currentTarget,
              x: event.clientX,
              y: event.clientY,
            };
            if (!report(event, true, true)) {
              const pointer = activePointer.current;
              activePointer.current = null;
              releaseCapture(pointer);
              return;
            }
            dragged.current = true;
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (
              !event.isPrimary ||
              !Number.isFinite(event.clientX) ||
              !Number.isFinite(event.clientY)
            )
              return;
            const pointer = activePointer.current;
            if (
              pointer &&
              (event.pointerId !== pointer.id || event.currentTarget !== pointer.target)
            )
              return;
            if (!pointer) {
              if (event.buttons !== 0) return;
              report(event, true, false);
              return;
            }
            if (report(event, true, true)) {
              dispatchAstraRotate({
                x: (event.clientX - pointer.x) * 0.005,
                y: (event.clientY - pointer.y) * 0.005,
              });
              pointer.x = event.clientX;
              pointer.y = event.clientY;
            }
          }}
          onPointerUp={(event) => {
            const pointer = activePointer.current;
            if (
              pointer &&
              pointer.id === event.pointerId &&
              pointer.target === event.currentTarget
            ) {
              finish(event.pointerType === "mouse" && insideTarget(event) ? event : undefined);
            }
          }}
          onPointerCancel={(event) => {
            const pointer = activePointer.current;
            if (pointer && pointer.id !== event.pointerId) return;
            if (pointer || (event.isPrimary && hovering.current)) finish();
          }}
          onPointerLeave={(event) => {
            if (event.isPrimary && !activePointer.current) clear();
          }}
          onLostPointerCapture={(event) => {
            if (activePointer.current?.id === event.pointerId) finish();
          }}
        />
      )}
      {showReplay && (
        <button
          type="button"
          aria-label={replayLabel}
          className={styles.replay}
          onClick={dispatchAstraReplay}
        >
          <RotateCcw aria-hidden="true" size={18} strokeWidth={2} />
        </button>
      )}
    </>
  );
}
