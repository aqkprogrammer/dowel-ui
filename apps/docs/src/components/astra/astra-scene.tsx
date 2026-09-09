"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

import { createAstraAnimationState, updateAstraAnimation, type AstraInput } from "./animation";
import type { AstraConfig } from "./config";
import { ASTRA_EVENTS, type AstraPointerDetail, type AstraRotateDetail } from "./events";
import type { FrameCoordinator } from "./frame-coordinator";
import type { RendererProfile } from "./profile";
import { createAstraRenderer, type AstraRenderer } from "./renderer";

/**
 * The canvas, and the lifecycle of what draws on it.
 *
 * Loaded on the client only — three.js has no business in the server bundle —
 * and rebuilt from scratch on replay, which is the cheapest way to guarantee
 * the opening plays exactly as it did the first time.
 */

export type SceneStatus = "loading" | "ready" | "fallback";

export interface AstraSceneProps {
  config: AstraConfig;
  coordinator: FrameCoordinator;
  inputRef: RefObject<AstraInput>;
  /** The page's own tweaks (flow speed at the end) — read every frame. */
  runtimeConfigRef: RefObject<AstraConfig>;
  profile: RendererProfile;
  restartKey: number;
  onStatusChange: (status: SceneStatus) => void;
  onRestart: () => void;
}

const ROTATION_LIMIT = 4 * Math.PI;

function clampRotation(value: number): number {
  return Number.isFinite(value)
    ? Math.min(ROTATION_LIMIT, Math.max(-ROTATION_LIMIT, value))
    : 0;
}

function clampNdc(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
}

function isMouseLike(event: PointerEvent): boolean {
  return event.isPrimary && (event.pointerType === "mouse" || event.pointerType === "pen");
}

export function AstraScene({
  config,
  coordinator,
  inputRef,
  runtimeConfigRef,
  profile,
  restartKey,
  onStatusChange,
  onRestart,
}: AstraSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Status is owned by the effect that creates the renderer, so it lives in a
  // small store the component subscribes to rather than in React state set
  // from inside that effect.
  const store = useRef<{ status: SceneStatus; listeners: Set<() => void> }>({
    status: "loading",
    listeners: new Set(),
  });
  const subscribe = useCallback((listener: () => void) => {
    store.current.listeners.add(listener);
    return () => store.current.listeners.delete(listener);
  }, []);
  const status = useSyncExternalStore<SceneStatus>(
    subscribe,
    () => store.current.status,
    () => "loading",
  );
  const setStatus = useCallback((next: SceneStatus) => {
    if (store.current.status === next) return;
    store.current.status = next;
    for (const listener of store.current.listeners) listener();
  }, []);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  // The renderer. Everything created here is torn down here, including on a
  // replay, which changes `restartKey` and so runs this again.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile.available) return;
    let cancelled = false;
    let failed = false;
    let renderer: AstraRenderer | undefined;
    let state = createAstraAnimationState(config, inputRef.current.progress);
    let needsResize = true;
    let pixelRatio = 0;
    let mask = "";
    const viewport = { width: 1, height: 1 };
    let unregister: (() => void) | undefined;
    let observer: ResizeObserver | undefined;

    const teardown = () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      observer = undefined;
      unregister?.();
      unregister = undefined;
      const disposables = [state, renderer];
      renderer = undefined;
      for (const item of disposables) {
        try {
          item?.dispose();
        } catch {
          // Already gone.
        }
      }
    };
    const fail = (error?: unknown) => {
      if (cancelled || failed) return;
      failed = true;
      if (error !== undefined && process.env.NODE_ENV !== "production") {
        console.error("Astra scene failed; showing the static fallback.", error);
      }
      teardown();
      setStatus("fallback");
    };
    function onContextLost(event: Event) {
      event.preventDefault();
      fail();
    }
    function onResize() {
      needsResize = true;
      coordinator.invalidate();
    }

    setStatus("loading");
    canvas.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener("resize", onResize, { passive: true });

    try {
      renderer = createAstraRenderer(canvas, config, profile);
    } catch (error) {
      fail(error);
      return () => {
        cancelled = true;
        teardown();
      };
    }
    const active = renderer;
    state = createAstraAnimationState(config, inputRef.current.progress);
    let frames = 0;
    if (process.env.NODE_ENV !== "production") {
      // A handle for poking at the live scene from the console while developing.
      (window as Window & { __astra?: unknown }).__astra = {
        get state() {
          return state;
        },
        get frames() {
          return frames;
        },
        renderer: active,
        input: inputRef.current,
        profile,
        coordinator,
        /** Runs `count` frames of `seconds` each, for inspecting a later moment. */
        step: (count: number, seconds: number) => {
          for (let index = 0; index < count; index += 1) frame(seconds);
        },
      };
    }

    const frame = (delta: number): boolean => {
      frames += 1;
      if (needsResize) {
        needsResize = false;
        const bounds = canvas.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
          const width = Math.max(1, Math.floor(bounds.width));
          const height = Math.max(1, Math.floor(bounds.height));
          const dpr = window.devicePixelRatio;
          if (viewport.width !== width || viewport.height !== height || pixelRatio !== dpr) {
            viewport.width = width;
            viewport.height = height;
            pixelRatio = dpr;
            active.resize(width, height, dpr);
            inputRef.current.pointer.active = false;
            inputRef.current.pointer.reset = true;
          }
        }
      }
      const runtime = runtimeConfigRef.current;
      const input = inputRef.current;
      const step = input.reducedMotion || !runtime.animationPlaying ? 0 : delta;
      const moving = updateAstraAnimation(
        {
          state,
          config: runtime,
          input,
          camera: active.camera,
          animationRoot: active.animationRoot,
          spinRoot: active.spinRoot,
          field: active.field,
          viewport,
        },
        step,
        input.reducedMotion ? 0 : delta,
      );

      // Dispersed stars part around the copy: mask the canvas to match.
      let nextMask = "";
      if (state.railPresence > 0) {
        const left = state.railContentBounds.x * viewport.width;
        const right = state.railContentBounds.y * viewport.width;
        const alpha = Math.round((1 - state.railPresence) * 1e4) / 1e4;
        nextMask = `linear-gradient(to right, #000 ${Math.max(0, left - 160)}px, rgba(0, 0, 0, ${alpha}) ${left}px, rgba(0, 0, 0, ${alpha}) ${right}px, #000 ${Math.min(viewport.width, right + 160)}px)`;
      }
      if (nextMask !== mask) {
        mask = nextMask;
        canvas.style.maskImage = nextMask;
      }
      active.render(step, state, runtime, input.reducedMotion);
      return moving;
    };

    try {
      frame(0);
    } catch (error) {
      fail(error);
      return () => {
        cancelled = true;
        teardown();
      };
    }
    unregister = coordinator.registerScene((delta) => {
      if (cancelled) return false;
      try {
        return frame(delta);
      } catch (error) {
        fail(error);
        return false;
      }
    });
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onResize);
      observer.observe(canvas);
    }
    setStatus("ready");

    return () => {
      cancelled = true;
      teardown();
    };
  }, [config, coordinator, inputRef, profile, restartKey, runtimeConfigRef, setStatus]);

  // Input. Pointer and drag events arrive from the surfaces in the page; a
  // plain hover anywhere over the backdrop counts too, for the shove.
  useEffect(() => {
    const canvas = canvasRef.current;
    let bounds: DOMRect | null = null;
    const forgetBounds = () => {
      bounds = null;
    };
    const resetPointer = (reset = false) => {
      const pointer = inputRef.current.pointer;
      const next = pointer.reset || reset;
      if (pointer.active || pointer.pressed || pointer.reset !== next) {
        pointer.active = false;
        pointer.pressed = false;
        pointer.reset = next;
        coordinator.invalidate();
      }
    };
    const setPointer = (clientX: number, clientY: number, pressed: boolean) => {
      if (inputRef.current.reducedMotion) {
        resetPointer(true);
        return;
      }
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
      bounds ??= canvas?.getBoundingClientRect() ?? null;
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
      const x = clampNdc(((clientX - bounds.left) / bounds.width) * 2 - 1);
      const y = clampNdc(-(((clientY - bounds.top) / bounds.height) * 2 - 1));
      const pointer = inputRef.current.pointer;
      if (
        !pointer.active ||
        pointer.pressed !== pressed ||
        pointer.reset ||
        pointer.x !== x ||
        pointer.y !== y
      ) {
        pointer.active = true;
        pointer.pressed = pressed;
        pointer.reset = false;
        pointer.x = x;
        pointer.y = y;
        coordinator.invalidate();
      }
    };

    const onReplay = () => {
      const input = inputRef.current;
      input.pointer.active = false;
      input.pointer.pressed = false;
      input.pointer.reset = true;
      input.rotation.x = 0;
      input.rotation.y = 0;
      input.returning = true;
      onRestart();
    };
    const onReturn = () => {
      if (!config.faceForward) return;
      inputRef.current.rotation.x = 0;
      inputRef.current.rotation.y = 0;
      inputRef.current.returning = true;
      coordinator.invalidate();
    };
    const onPointer = (event: Event) => {
      const detail = (event as CustomEvent<AstraPointerDetail>).detail;
      if (!detail) return;
      if (!detail.active || inputRef.current.reducedMotion) {
        resetPointer(inputRef.current.reducedMotion);
        return;
      }
      setPointer(detail.clientX, detail.clientY, detail.pressed);
    };
    const onRotate = (event: Event) => {
      if (inputRef.current.reducedMotion) return;
      const detail = (event as CustomEvent<AstraRotateDetail>).detail;
      if (!detail) return;
      const rotation = inputRef.current.rotation;
      rotation.x = clampRotation(rotation.x + detail.y);
      rotation.y = clampRotation(rotation.y + detail.x);
      inputRef.current.returning = false;
      coordinator.invalidate();
    };
    const onBlur = () => resetPointer(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onBlur();
    };
    const experience = canvas?.closest<HTMLElement>("[data-astra-experience]");
    const backdrop = canvas?.closest<HTMLElement>("[data-astra-backdrop]");
    const onHover = (event: PointerEvent) => {
      if (isMouseLike(event) && event.buttons === 0 && backdrop?.dataset.astraActive) {
        setPointer(event.clientX, event.clientY, false);
      }
    };
    const onLeave = (event: PointerEvent) => {
      if (isMouseLike(event)) resetPointer();
    };

    const observer =
      canvas && typeof ResizeObserver !== "undefined" ? new ResizeObserver(forgetBounds) : null;
    if (canvas) observer?.observe(canvas);
    window.addEventListener(ASTRA_EVENTS.replay, onReplay);
    window.addEventListener(ASTRA_EVENTS.pointer, onPointer);
    window.addEventListener(ASTRA_EVENTS.return, onReturn);
    window.addEventListener(ASTRA_EVENTS.rotate, onRotate);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", forgetBounds, { passive: true });
    window.addEventListener("scroll", forgetBounds, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    experience?.addEventListener("pointermove", onHover, { capture: true, passive: true });
    experience?.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener(ASTRA_EVENTS.replay, onReplay);
      window.removeEventListener(ASTRA_EVENTS.pointer, onPointer);
      window.removeEventListener(ASTRA_EVENTS.return, onReturn);
      window.removeEventListener(ASTRA_EVENTS.rotate, onRotate);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", forgetBounds);
      window.removeEventListener("scroll", forgetBounds);
      document.removeEventListener("visibilitychange", onVisibility);
      experience?.removeEventListener("pointermove", onHover, { capture: true });
      experience?.removeEventListener("pointerleave", onLeave);
    };
  }, [config.faceForward, coordinator, inputRef, onRestart]);

  return (
    <div className="absolute inset-0 size-full" data-astra-scene={status}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block size-full"
        data-astra-canvas="true"
        style={{ opacity: status === "ready" ? 1 : 0, transition: "opacity 300ms ease-out" }}
      />
    </div>
  );
}

export default AstraScene;
