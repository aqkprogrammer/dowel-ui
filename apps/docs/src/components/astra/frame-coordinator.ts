/**
 * One requestAnimationFrame loop for the whole hero.
 *
 * The page's measurements (scroll, layout) and the scene's render happen in
 * the same tick, in that order, so the stars never draw against a stale
 * scroll position. The loop runs continuously only while something is
 * animating; otherwise a tick is drawn on demand and the loop sleeps.
 */

export interface FrameCoordinator {
  /** The page measurement run at the start of every frame. */
  setMeasure: (measure: ((deltaSeconds: number) => boolean) | null) => void;
  /** Whether frames may run at all — false while the tab is hidden. */
  setActive: (active: boolean) => void;
  /** Whether the scene wants a frame every tick regardless of input. */
  setSceneContinuous: (continuous: boolean) => void;
  /** Whether the scene is on screen and should be rendered. */
  setSceneActive: (active: boolean) => void;
  /** Ask for a frame soon. */
  invalidate: () => void;
  registerScene: (render: (deltaSeconds: number) => boolean) => () => void;
  dispose: () => void;
  /** A snapshot of the loop's state, for debugging. */
  debug: () => Record<string, unknown>;
}

/** How long a requested animation frame may take before a timer stands in. */
const FRAME_WATCHDOG_MS = 250;
/** Frame period of the stand-in timer. */
const FALLBACK_FRAME_MS = 33;
/** How often, while on the timer, to offer requestAnimationFrame another go. */
const FRAME_RETRY_MS = 1000;

/**
 * requestAnimationFrame, with a stand-in for hosts that never deliver one.
 *
 * Some embedded webviews keep painting the page but report the document
 * hidden and suspend animation frames indefinitely. A page that only ever
 * waits on rAF then shows its very first frame forever. The watchdog notices
 * a frame that has not arrived and runs the tick from a timer instead, going
 * back to rAF as soon as it starts delivering again.
 */
function createFrameRequester() {
  let stalled = false;
  let retryAt = 0;
  return (callback: (now: number) => void): (() => void) => {
    const now = performance.now();
    if (stalled && now < retryAt) {
      const timer = setTimeout(() => callback(performance.now()), FALLBACK_FRAME_MS);
      return () => clearTimeout(timer);
    }
    let settled = false;
    const frame = requestAnimationFrame((stamp) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      stalled = false;
      callback(stamp);
    });
    const watchdog = setTimeout(() => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(frame);
      stalled = true;
      retryAt = performance.now() + FRAME_RETRY_MS;
      callback(performance.now());
    }, FRAME_WATCHDOG_MS);
    return () => {
      settled = true;
      cancelAnimationFrame(frame);
      clearTimeout(watchdog);
    };
  };
}

export function createFrameCoordinator(): FrameCoordinator {
  let disposed = false;
  let measure: ((deltaSeconds: number) => boolean) | null = null;
  let active = false;
  let continuous = false;
  let invalidated = false;
  let handle: (() => void) | null = null;
  let last: number | null = null;
  let generation = 0;
  const requestFrame = createFrameRequester();

  let sceneActive = false;
  let sceneContinuous = false;
  let scrolling = false;
  let scene: ((deltaSeconds: number) => boolean) | null = null;
  let inFrame = false;

  function cancel(): void {
    generation += 1;
    handle?.();
    handle = null;
  }

  function setContinuous(next: boolean): void {
    if (disposed || continuous === next) return;
    continuous = next;
    if (!next) last = null;
    if (!next && !invalidated) cancel();
    schedule();
  }

  function refreshContinuous(): void {
    setContinuous(sceneActive && (scrolling || (sceneContinuous && scene !== null)));
  }

  let ticks = 0;
  function tick(delta: number): void {
    ticks += 1;
    inFrame = true;
    try {
      const wasActive = sceneActive;
      let nowScrolling = false;
      try {
        nowScrolling = measure?.(delta) ?? false;
      } catch (error) {
        // A measurement that throws must not stop the loop — but it must be
        // seen while developing, or the field silently never appears.
        if (process.env.NODE_ENV !== "production") console.error("Astra measure failed", error);
      }
      if (scrolling !== nowScrolling) {
        scrolling = nowScrolling;
        refreshContinuous();
      }
      const moving = (wasActive || sceneActive) && scene !== null && scene(delta);
      if (sceneActive && moving) invalidate();
    } finally {
      inFrame = false;
    }
  }

  function schedule(): void {
    if (disposed || !active || handle !== null || (!continuous && !invalidated)) return;
    const own = ++generation;
    const started = performance.now();
    handle = requestFrame((now) => {
      if (disposed || !active || own !== generation) return;
      handle = null;
      invalidated = false;
      const stamp = Number.isFinite(now) ? now : null;
      const delta =
        stamp === null
          ? 0
          : last === null
            ? Math.min(Math.max((stamp - started) / 1000, 0), 0.05)
            : Math.min(Math.max((stamp - last) / 1000, 0), 0.05);
      last = stamp;
      try {
        tick(delta);
      } catch (error) {
        cancel();
        last = null;
        throw error;
      }
      if (!continuous && !invalidated) last = null;
      schedule();
    });
  }

  function invalidate(): void {
    if (disposed || !active) return;
    invalidated = true;
    schedule();
  }

  return {
    setMeasure(next) {
      if (!disposed) measure = next;
    },
    setActive(next) {
      if (disposed || active === next) return;
      active = next;
      last = null;
      invalidated = next;
      if (next) schedule();
      else cancel();
    },
    setSceneContinuous(next) {
      if (disposed || sceneContinuous === next) return;
      sceneContinuous = next;
      refreshContinuous();
    },
    setSceneActive(next) {
      if (disposed || sceneActive === next) return;
      sceneActive = next;
      refreshContinuous();
      if (next && !inFrame) invalidate();
    },
    invalidate,
    registerScene(render) {
      if (disposed) return () => {};
      scene = render;
      refreshContinuous();
      invalidate();
      return () => {
        if (scene === render) {
          scene = null;
          refreshContinuous();
        }
      };
    },
    debug() {
      return {
        disposed,
        active,
        continuous,
        invalidated,
        pending: handle !== null,
        sceneActive,
        sceneContinuous,
        scrolling,
        hasScene: scene !== null,
        hasMeasure: measure !== null,
        generation,
        ticks,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      scene = null;
      measure = null;
      cancel();
    },
  };
}
