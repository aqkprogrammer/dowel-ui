import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { motionIsReduced, useReducedMotion } from "./use-reduced-motion";

/** A matchMedia whose reduced-motion answer can be flipped, firing `change`. */
function controllableMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matches && query.includes("reduced-motion");
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  return {
    listeners,
    set(next: boolean) {
      matches = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
  };
}

describe("useReducedMotion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--motion-scale");
  });

  it("follows the operating system setting as it changes", () => {
    const media = controllableMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    media.set(true);
    expect(result.current).toBe(true);
    media.set(false);
    expect(result.current).toBe(false);
  });

  it("treats a theme's --motion-scale near zero as reduced, and notices it change", async () => {
    controllableMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    await act(async () => {
      document.documentElement.style.setProperty("--motion-scale", "0.001");
      // MutationObserver callbacks run as a microtask.
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
    expect(motionIsReduced()).toBe(true);
  });

  it("stops listening when the last component using it unmounts", () => {
    const media = controllableMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("reads false without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    try {
      expect(motionIsReduced()).toBe(false);
      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
