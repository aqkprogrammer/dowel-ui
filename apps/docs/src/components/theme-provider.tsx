"use client";

import {
  COLOR_MODES,
  DARK_CLASS,
  THEME_ATTRIBUTE,
  THEME_PRESETS,
  type ColorMode,
  type ThemePreset,
} from "@dowel-ui/themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Applies the colour mode and theme preset to the document root.
 *
 * The same two switches the library ships — a `dark` class and a `data-theme`
 * attribute — so the docs are not demonstrating a mechanism that only exists
 * here.
 *
 * Both the stored preference and the OS setting are read with
 * `useSyncExternalStore` rather than an effect that calls setState. That is not
 * only about avoiding a cascading render: it gives an explicit server snapshot,
 * so the server and the first client render agree, and it picks up changes made
 * in another tab for free.
 */

interface ThemeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  resolvedDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}

const MODE_KEY = "docs-color-mode";
const PRESET_KEY = "docs-theme-preset";

/** Notifies subscribers of writes made by this tab; `storage` covers the rest. */
const STORAGE_EVENT = "docs-theme-change";

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
  } catch {
    // Private browsing and blocked site data both throw. A default is a
    // perfectly good answer.
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not being able to remember the choice is not a reason to refuse it.
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribeToColorScheme(callback: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", callback);
  return () => {
    query.removeEventListener("change", callback);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The generic is explicit so the server snapshot's literal is contextually
  // typed, rather than widened to string and then asserted back.
  const mode = useSyncExternalStore<ColorMode>(
    subscribeToStorage,
    () => readStored(MODE_KEY, COLOR_MODES, "system"),
    () => "system",
  );

  const preset = useSyncExternalStore<ThemePreset>(
    subscribeToStorage,
    () => readStored(PRESET_KEY, THEME_PRESETS, "default"),
    () => "default",
  );

  const systemDark = useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );

  const resolvedDark = mode === "dark" || (mode === "system" && systemDark);

  // Writing to the DOM is exactly what an effect is for: synchronising React
  // state out to an external system.
  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, resolvedDark);
  }, [resolvedDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (preset === "default") root.removeAttribute(THEME_ATTRIBUTE);
    else root.setAttribute(THEME_ATTRIBUTE, preset);
  }, [preset]);

  const setMode = useCallback((next: ColorMode) => {
    write(MODE_KEY, next);
  }, []);

  const setPreset = useCallback((next: ThemePreset) => {
    write(PRESET_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, preset, setPreset, resolvedDark }),
    [mode, setMode, preset, setPreset, resolvedDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
