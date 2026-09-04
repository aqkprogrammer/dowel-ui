/**
 * A keyboard shortcut as a value: parsed from the string an app stores,
 * built from a keydown, and written back out for a Mac, for everyone else,
 * and for the ear.
 *
 * Pure, so the modifier canon, the platform rendering and the conflict rule
 * are tested without a keyboard, and so the same `parseShortcut` can run on
 * the server that validates a saved binding.
 *
 * The stored form is platform-neutral: `Mod+Shift+K`, where `Mod` is Command
 * on a Mac and Control elsewhere. That is the one decision every app makes
 * and few make explicitly — a binding saved as `Ctrl+K` on Windows is wrong
 * the moment the same account opens on a Mac.
 */

export type Platform = "mac" | "other";

export interface Shortcut {
  /** The non-modifier key, canonical: `K`, `1`, `ArrowUp`, `F5`, `Enter`, `Space`. */
  key: string;
  /** Command on a Mac, Control elsewhere. */
  mod: boolean;
  /** Control, held explicitly — on a Mac this is a different key from Mod. */
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift", "OS", "AltGraph", "Fn"]);

/** Keys that cannot be a shortcut, because they already mean something. */
export const RESERVED_KEYS = new Set(["Tab", "Escape"]);

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  spacebar: "Space",
  esc: "Escape",
  return: "Enter",
  del: "Delete",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  cmd: "Mod",
  command: "Mod",
  meta: "Mod",
  control: "Ctrl",
  option: "Alt",
};

/** The canonical key name for a token someone typed or stored. */
function canonicalKey(token: string): string {
  const alias = KEY_ALIASES[token.toLowerCase()];
  if (alias) return alias;
  if (token.length === 1) return token.toUpperCase();
  // ArrowUp, F5, Enter, Backspace, Delete, Home, End, PageUp…
  return token.charAt(0).toUpperCase() + token.slice(1);
}

/**
 * `Mod+Shift+K` to a shortcut. Accepts the spellings people use — `Cmd`,
 * `Command`, `Ctrl`, `Option` — and throws on an empty or modifier-only one.
 */
export function parseShortcut(text: string): Shortcut {
  const tokens = text
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter a shortcut.");

  const shortcut: Shortcut = { key: "", mod: false, ctrl: false, alt: false, shift: false };
  for (const token of tokens) {
    const canonical = canonicalKey(token);
    if (canonical === "Mod") shortcut.mod = true;
    else if (canonical === "Ctrl") shortcut.ctrl = true;
    else if (canonical === "Alt") shortcut.alt = true;
    else if (canonical === "Shift") shortcut.shift = true;
    else if (shortcut.key) throw new Error(`"${text}" has two keys; a shortcut has one.`);
    else shortcut.key = canonical;
  }
  if (!shortcut.key) throw new Error(`"${text}" is only modifiers; it needs a key.`);
  return shortcut;
}

/** The stored, platform-neutral form. Modifiers in a fixed order, so equal shortcuts are equal strings. */
export function serializeShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.mod) parts.push("Mod");
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key);
  return parts.join("+");
}

export function shortcutsEqual(a: Shortcut, b: Shortcut): boolean {
  return serializeShortcut(a) === serializeShortcut(b);
}

interface KeyLike {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * The shortcut a keydown amounts to, or null while only modifiers are held.
 *
 * Letters and digits come from `code`, not `key`: with Shift or Option held,
 * `key` is `K`, `˚` or `∆` depending on the layout and the platform, and a
 * shortcut recorded as Option-∆ is one nobody can read back. `Mod` is Meta
 * on a Mac and Control elsewhere; the other one, when held, is kept as
 * itself.
 */
export function shortcutFromKey(event: KeyLike, platform: Platform): Shortcut | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  let key: string;
  const code = event.code ?? "";
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
  else key = canonicalKey(event.key);

  const mac = platform === "mac";
  return {
    key,
    mod: mac ? event.metaKey : event.ctrlKey,
    ctrl: mac ? event.ctrlKey : false,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

/** Printable keys need a modifier: a bare K as a shortcut fires while someone types a sentence. */
export function needsModifier(shortcut: Shortcut): boolean {
  const printable = shortcut.key.length === 1 || shortcut.key === "Space";
  return printable && !shortcut.mod && !shortcut.ctrl && !shortcut.alt;
}

const MAC_SYMBOLS: Record<string, string> = {
  Mod: "⌘",
  Ctrl: "⌃",
  Alt: "⌥",
  Shift: "⇧",
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌦",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "⎋",
  Space: "Space",
};

const SPOKEN: Record<Platform, Record<string, string>> = {
  mac: { Mod: "Command", Ctrl: "Control", Alt: "Option", Shift: "Shift" },
  other: { Mod: "Control", Ctrl: "Control", Alt: "Alt", Shift: "Shift" },
};

/** The parts to draw, in order: symbols on a Mac, words elsewhere. */
export function shortcutParts(shortcut: Shortcut, platform: Platform): string[] {
  const parts: string[] = [];
  const name = (modifier: string) =>
    platform === "mac"
      ? (MAC_SYMBOLS[modifier] ?? modifier)
      : (SPOKEN.other[modifier] ?? modifier);
  if (shortcut.mod) parts.push(name("Mod"));
  if (shortcut.ctrl && !(platform === "other" && shortcut.mod)) parts.push(name("Ctrl"));
  if (shortcut.alt) parts.push(name("Alt"));
  if (shortcut.shift) parts.push(name("Shift"));
  parts.push(platform === "mac" ? (MAC_SYMBOLS[shortcut.key] ?? shortcut.key) : shortcut.key);
  return parts;
}

/** "⌘⇧K" on a Mac, "Ctrl+Shift+K" elsewhere. */
export function formatShortcut(shortcut: Shortcut, platform: Platform): string {
  return shortcutParts(shortcut, platform).join(platform === "mac" ? "" : "+");
}

/** "Command Shift K" — words, for the ear, whatever the screen shows. */
export function describeShortcut(shortcut: Shortcut, platform: Platform): string {
  const words: string[] = [];
  const spoken = SPOKEN[platform];
  if (shortcut.mod) words.push(spoken.Mod ?? "Mod");
  if (shortcut.ctrl && !(platform === "other" && shortcut.mod))
    words.push(spoken.Ctrl ?? "Ctrl");
  if (shortcut.alt) words.push(spoken.Alt ?? "Alt");
  if (shortcut.shift) words.push(spoken.Shift ?? "Shift");
  words.push(shortcut.key.replace(/^Arrow/, "Arrow "));
  return words.join(" ");
}

/** Whether the browser is on a Mac, by the only signal it gives. */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const hint =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(hint) ? "mac" : "other";
}
