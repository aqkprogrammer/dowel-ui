"use client";

import {
  useId,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  describeShortcut,
  detectPlatform,
  needsModifier,
  parseShortcut,
  serializeShortcut,
  shortcutFromKey,
  shortcutParts,
  shortcutsEqual,
  type Platform,
  type Shortcut,
} from "./shortcut-model";

/**
 * Press the keys you want.
 *
 * Linear, Slack, VS Code, Figma and Superhuman each wrote one, and no
 * component library ships the recorder — only the `<kbd>` that displays the
 * result. The recorder is the hard part: a button that, when pressed, stops
 * being a button and starts being a keyboard listener, and has to come back.
 *
 * Three things it does that a listener bolted onto an input does not. It
 * reads letters from `code`, not `key`, so Option-K records as Option K and
 * not as the ˚ the Mac produced. It stores `Mod`, not Command or Control,
 * so a binding saved on one machine is right on the other. And it refuses a
 * bare printable key by saying so, because a shortcut that fires while
 * someone types a sentence is the bug every app that allowed it later fixed.
 *
 * Tab and Escape are never recorded: Tab leaves, Escape cancels, and a
 * recorder that captures both is a keyboard trap with a nice label. A
 * chord that another command already uses is said, with that command's
 * name, and applied only if the person says to use it anyway.
 */

export interface TakenShortcut {
  /** Stored form: `Mod+K`. */
  shortcut: string;
  /** What it does: "Search". */
  label: string;
}

export interface ShortcutRecorderProps extends Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "defaultValue"
> {
  /** What the shortcut triggers: "Open search". Names the control. */
  label: string;
  /** Stored form, `Mod+Shift+K`, or null for none. Controlled. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** Shortcuts other commands already use. A clash is said, and applied only on request. */
  taken?: TakenShortcut[];
  /** Mac shows ⌘⇧K; everything else shows Ctrl+Shift+K. Detected if omitted. */
  platform?: Platform;
  /** Printable keys need a modifier. On by default, for the reason in the source. */
  requireModifier?: boolean;
}

/* The platform, as an external store that never changes: a constant that the
   server cannot know, so the server snapshot is the neutral one and the real
   answer arrives after hydration without a mismatch. */
const subscribeToNothing = () => () => undefined;
const readPlatform = () => detectPlatform();
const readNeutralPlatform = (): Platform => "other";

export function ShortcutRecorder({
  className,
  label,
  value: valueProp,
  defaultValue = null,
  onChange,
  taken = [],
  platform: platformProp,
  requireModifier = true,
  ...props
}: ShortcutRecorderProps) {
  const id = useId();
  const detected = useSyncExternalStore(subscribeToNothing, readPlatform, readNeutralPlatform);
  const platform = platformProp ?? detected;

  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue);
  const value = valueProp === undefined ? uncontrolled : valueProp;
  const current = value ? safeParse(value) : null;

  const [recording, setRecording] = useState(false);
  /** Modifiers held mid-chord, shown so the person sees the recorder listening. */
  const [held, setHeld] = useState<Shortcut | null>(null);
  const [conflict, setConflict] = useState<{ shortcut: Shortcut; with: TakenShortcut } | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState("");

  const commit = (next: Shortcut | null) => {
    const serialized = next ? serializeShortcut(next) : null;
    setUncontrolled(serialized);
    onChange?.(serialized);
  };

  const stop = () => {
    setRecording(false);
    setHeld(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;
    // Tab leaves. A recorder that keeps it is a keyboard trap.
    if (event.key === "Tab") {
      stop();
      setAnnouncement("Cancelled.");
      return;
    }
    event.preventDefault();
    if (event.key === "Escape") {
      stop();
      setAnnouncement("Cancelled.");
      return;
    }
    if ((event.key === "Backspace" || event.key === "Delete") && !hasModifier(event)) {
      stop();
      commit(null);
      setAnnouncement("Cleared.");
      return;
    }

    const chord = shortcutFromKey(event.nativeEvent, platform);
    if (!chord) {
      // Only modifiers so far. Show them, keep listening.
      setHeld({
        key: "",
        mod: platform === "mac" ? event.metaKey : event.ctrlKey,
        ctrl: platform === "mac" ? event.ctrlKey : false,
        alt: event.altKey,
        shift: event.shiftKey,
      });
      return;
    }

    if (requireModifier && needsModifier(chord)) {
      setAnnouncement(
        `${describeShortcut(chord, platform)} needs a modifier — it would fire while typing. Try again.`,
      );
      setHeld(null);
      return;
    }

    const clash = taken.find((entry) =>
      shortcutsEqual(safeParse(entry.shortcut) ?? chord, chord),
    );
    stop();
    if (clash && !(current && shortcutsEqual(current, chord))) {
      setConflict({ shortcut: chord, with: clash });
      setAnnouncement(
        `${describeShortcut(chord, platform)} is already used by ${clash.label}.`,
      );
      return;
    }
    commit(chord);
    setAnnouncement(`Recorded ${describeShortcut(chord, platform)}.`);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording || !held) return;
    setHeld({
      key: "",
      mod: platform === "mac" ? event.metaKey : event.ctrlKey,
      ctrl: platform === "mac" ? event.ctrlKey : false,
      alt: event.altKey,
      shift: event.shiftKey,
    });
  };

  const shown = recording ? held : current;
  const description = recording
    ? "Press the keys you want. Escape cancels, Backspace clears."
    : current
      ? `${describeShortcut(current, platform)}. Press to change.`
      : "Not set. Press to record.";

  return (
    <div
      data-slot="shortcut-recorder"
      data-state={recording ? "recording" : conflict ? "conflict" : current ? "set" : "empty"}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <span id={`${id}-label`} className="text-xs font-medium">
        {label}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-description`}
          aria-pressed={recording}
          className={cn(
            "flex h-9 min-w-32 items-center justify-center gap-1 rounded-md border px-3 font-mono text-sm",
            recording
              ? "border-primary bg-primary/5 text-muted-foreground"
              : "border-input bg-background hover:bg-accent",
            focusRing,
            disabledStyles,
          )}
          onClick={() => {
            if (recording) return;
            setConflict(null);
            setRecording(true);
            setAnnouncement("");
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => {
            if (recording) {
              stop();
              setAnnouncement("Cancelled.");
            }
          }}
        >
          {/* Symbols and key caps are for the eye; the description says the
              same thing in words. */}
          <span aria-hidden="true" className="flex items-center gap-1">
            {shown && (shown.key || shown.mod || shown.ctrl || shown.alt || shown.shift) ? (
              shortcutParts(shown, platform)
                .filter(Boolean)
                .map((part, index) => (
                  <kbd
                    key={index}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {part}
                  </kbd>
                ))
            ) : recording ? (
              <span className="text-xs">Press keys…</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not set</span>
            )}
          </span>
        </button>

        {current && !recording ? (
          <button
            type="button"
            aria-label={`Clear — ${label}`}
            className={cn(
              "rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent",
              focusRing,
            )}
            onClick={() => {
              commit(null);
              setConflict(null);
              setAnnouncement("Cleared.");
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <p id={`${id}-description`} className="text-xs text-muted-foreground">
        {description}
      </p>

      {conflict ? (
        <div
          data-slot="shortcut-conflict"
          className="flex flex-wrap items-center gap-2 rounded-md border border-warning/50 bg-warning/5 px-2.5 py-1.5 text-xs"
        >
          <span className="flex-1 text-warning">
            {describeShortcut(conflict.shortcut, platform)} is already used by{" "}
            <strong>{conflict.with.label}</strong>.
          </span>
          <button
            type="button"
            className={cn(
              "rounded-md border border-input bg-background px-2 py-0.5 font-medium hover:bg-accent",
              focusRing,
            )}
            onClick={() => {
              commit(conflict.shortcut);
              setConflict(null);
              setAnnouncement(
                `Recorded ${describeShortcut(conflict.shortcut, platform)}. ${conflict.with.label} no longer has a shortcut.`,
              );
            }}
          >
            Use anyway
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md border border-input bg-background px-2 py-0.5 font-medium hover:bg-accent",
              focusRing,
            )}
            onClick={() => {
              setConflict(null);
            }}
          >
            Keep the old one
          </button>
        </div>
      ) : null}

      {/* Present from the start, so the first outcome is heard. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}

function safeParse(text: string): Shortcut | null {
  try {
    return parseShortcut(text);
  } catch {
    return null;
  }
}
