"use client";

import { cn } from "@dowel-ui/react";
import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * The search field for a gallery. Escape clears it; with `shortcut`, "/"
 * focuses it from anywhere on the page that is not already taking text —
 * and the palette's own "/" handler steps aside when this one is on screen.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  shortcut = false,
  size = "md",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  shortcut?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        // Claimed, so the site-wide palette does not also open.
        event.stopImmediatePropagation();
        input.current?.focus();
      }
    }
    // Capture, so this runs before the palette's document listener.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [shortcut]);

  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "size-[1.125rem]" : "size-4",
        )}
      />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-[var(--hairline-strong)] bg-[var(--pane)] text-foreground",
          "transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] outline-none",
          "placeholder:text-muted-foreground focus-visible:border-[var(--cosmic-blue)] focus-visible:bg-background focus-visible:shadow-[0_0_0_4px_var(--glow-blue)]",
          "[&::-webkit-search-cancel-button]:appearance-none",
          size === "lg" ? "h-12 ps-11 pe-20 text-base" : "h-10 ps-10 pe-16 text-sm",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
          className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : shortcut ? (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-[var(--hairline)] px-1.5 font-mono text-[0.625rem] leading-4 text-muted-foreground"
        >
          /
        </kbd>
      ) : null}
    </label>
  );
}
