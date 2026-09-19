/*
 * Test support for dither charts — not shipped (absent from meta.files).
 *
 * jsdom has no 2D context, no Path2D and no layout, and its rAF runs on a
 * timer. This installs a recording context, a recording Path2D, a canvas box
 * of a chosen size and a manual frame queue, so a test can run exactly N
 * frames and assert what was drawn.
 */

export interface CanvasCall {
  method: string;
  args: unknown[];
  /** fillStyle and globalAlpha at the moment of the call. */
  fillStyle: unknown;
  globalAlpha: number;
}

export interface CanvasMock {
  ctx: CanvasRenderingContext2D;
  calls: CanvasCall[];
  count: (method: string) => number;
  /** Runs queued animation frames, `step` ms apart. Returns how many ran. */
  flush: (frames?: number, step?: number) => number;
  /** Frames currently queued. */
  pending: () => number;
  reset: () => void;
  restore: () => void;
}

class RecordingPath {
  commands: { method: string; args: unknown[] }[] = [];
  constructor() {
    for (const method of [
      "moveTo",
      "lineTo",
      "arc",
      "arcTo",
      "bezierCurveTo",
      "closePath",
      "rect",
    ]) {
      (this as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
        this.commands.push({ method, args });
      };
    }
  }
}

export function installCanvasMock(
  size: { width: number; height: number } = { width: 200, height: 120 },
): CanvasMock {
  const calls: CanvasCall[] = [];
  const state: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
  };
  const stack: Record<string, unknown>[] = [];

  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({
          method: key,
          args,
          fillStyle: target.fillStyle,
          globalAlpha: target.globalAlpha as number,
        });
        if (key === "save") stack.push({ ...target });
        if (key === "restore") Object.assign(target, stack.pop() ?? {});
        if (key === "measureText") return { width: 0 };
        return undefined;
      };
    },
    set(target, key: string, value: unknown) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  let queue: { id: number; callback: FrameRequestCallback }[] = [];
  let nextId = 1;
  let now = 0;

  const proto = HTMLCanvasElement.prototype;
  const originals = {
    getContext: Object.getOwnPropertyDescriptor(proto, "getContext"),
    rect: Object.getOwnPropertyDescriptor(proto, "getBoundingClientRect"),
    raf: Object.getOwnPropertyDescriptor(window, "requestAnimationFrame"),
    caf: Object.getOwnPropertyDescriptor(window, "cancelAnimationFrame"),
    path: (globalThis as { Path2D?: unknown }).Path2D,
  };
  const put = (target: object, key: string, descriptor: PropertyDescriptor | undefined) => {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  };

  HTMLCanvasElement.prototype.getContext = function getContext() {
    return ctx;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return new DOMRect(0, 0, size.width, size.height);
  };
  window.requestAnimationFrame = (callback) => {
    const id = nextId++;
    queue.push({ id, callback });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    queue = queue.filter((entry) => entry.id !== id);
  };
  (globalThis as { Path2D?: unknown }).Path2D = RecordingPath;

  return {
    ctx,
    calls,
    count: (method) => calls.filter((call) => call.method === method).length,
    flush: (frames = 1, step = 16) => {
      let ran = 0;
      for (let i = 0; i < frames && queue.length > 0; i++) {
        const batch = queue;
        queue = [];
        now += step;
        for (const entry of batch) entry.callback(now);
        ran += 1;
      }
      return ran;
    },
    pending: () => queue.length,
    reset: () => {
      calls.length = 0;
    },
    restore: () => {
      put(proto, "getContext", originals.getContext);
      put(proto, "getBoundingClientRect", originals.rect);
      put(window, "requestAnimationFrame", originals.raf);
      put(window, "cancelAnimationFrame", originals.caf);
      (globalThis as { Path2D?: unknown }).Path2D = originals.path;
    },
  };
}
