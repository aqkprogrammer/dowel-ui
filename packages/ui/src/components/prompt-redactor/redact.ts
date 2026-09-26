/**
 * Finding what should not be sent to a model, and swapping it for a stand-in.
 *
 * People paste things into prompts: a customer's email, a card number from a
 * support ticket, the API key they were debugging with. The model rarely needs
 * the value itself — "[EMAIL_1] says their refund is late" is as useful as the
 * address — so the value is replaced before sending and put back, locally,
 * wherever the reply mentions the placeholder.
 *
 * Detection is deliberately conservative. A card number must pass the Luhn
 * check and an IBAN its checksum; a key must match a known provider's format.
 * A false positive costs a click; a noisy detector teaches people to ignore it.
 * Add your own with `detectors` — customer ids, internal hostnames.
 */

export interface Detector {
  kind: string;
  /** What it is called to the person: "Email address". */
  label: string;
  /** Global. */
  pattern: RegExp;
  /** A second check a pattern cannot make, such as a checksum. */
  validate?: (match: string) => boolean;
  /** How the value is shown on screen; defaults to its first and last few characters. */
  mask?: (match: string) => string;
}

export interface SensitiveFinding {
  /** The same for the same kind and value, wherever and whenever it appears. */
  key: string;
  kind: string;
  label: string;
  start: number;
  end: number;
  value: string;
  masked: string;
}

function digits(text: string): string {
  return text.replace(/\D/g, "");
}

export function luhn(number: string): boolean {
  const all = digits(number);
  if (all.length < 13 || all.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < all.length; i += 1) {
    let digit = Number(all[all.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function ibanValid(value: string): boolean {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const char of moved) {
    const code = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of code) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function ends(value: string, keep = 4): string {
  const clean = value.replace(/\s/g, "");
  return clean.length <= keep * 2
    ? "•".repeat(clean.length)
    : `${clean.slice(0, 3)}…${clean.slice(-keep)}`;
}

export const DEFAULT_DETECTORS: Detector[] = [
  {
    kind: "secret",
    label: "Private key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    mask: () => "a private key",
  },
  {
    kind: "secret",
    label: "API key",
    pattern:
      /\b(?:sk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35})\b/g,
  },
  {
    kind: "secret",
    label: "Access token",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    kind: "email",
    label: "Email address",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
    mask: (value) => {
      const [name = "", domain = ""] = value.split("@");
      return `${name.slice(0, 1)}•••@${domain}`;
    },
  },
  {
    kind: "card",
    label: "Card number",
    pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
    validate: luhn,
    mask: (value) => `card ending ${digits(value).slice(-4)}`,
  },
  {
    kind: "iban",
    label: "Bank account (IBAN)",
    pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g,
    validate: ibanValid,
    mask: (value) => `${value.slice(0, 2)}… ending ${value.replace(/\s/g, "").slice(-4)}`,
  },
  {
    kind: "ssn",
    label: "Social Security number",
    pattern: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    mask: (value) => `ending ${value.slice(-4)}`,
  },
  {
    kind: "phone",
    label: "Phone number",
    pattern:
      /(?<![\w+])(?:\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d{1,5}(?:[\s.-]?\d{2,5}){1,4}|\(\d{3}\)[\s.-]?\d{3}[\s.-]\d{4}|\d{3}[.-]\d{3}[.-]\d{4})(?!\w)/g,
    validate: (value) => {
      const count = digits(value).length;
      return count >= 8 && count <= 15;
    },
    mask: (value) => `ending ${digits(value).slice(-4)}`,
  },
];

/**
 * Everything sensitive in the text, in order, never overlapping. Where two
 * detectors match the same characters, the earlier detector in the list wins —
 * a key is a key before it is anything else.
 */
export function findSensitive(
  text: string,
  detectors: Detector[] = DEFAULT_DETECTORS,
): SensitiveFinding[] {
  const found: SensitiveFinding[] = [];
  const taken = (start: number, end: number) =>
    found.some((finding) => start < finding.end && end > finding.start);

  for (const detector of detectors) {
    const pattern = new RegExp(
      detector.pattern.source,
      detector.pattern.flags.includes("g")
        ? detector.pattern.flags
        : `${detector.pattern.flags}g`,
    );
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      if (!value || taken(start, end)) continue;
      if (detector.validate && !detector.validate(value)) continue;
      found.push({
        key: `${detector.kind}:${value}`,
        kind: detector.kind,
        label: detector.label,
        start,
        end,
        value,
        masked: detector.mask ? detector.mask(value) : ends(value),
      });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Placeholders already given out, by finding key. Kept for the conversation. */
export type RedactionMap = Map<string, string>;

/**
 * The placeholder each finding gets. Stable: the same value is the same
 * placeholder in every message, so a reply that refers back still resolves.
 * Pure — new placeholders are numbered after those in `known` but not added
 * to it; `commitPlaceholders` does that when the message is actually sent.
 */
export function planPlaceholders(
  findings: SensitiveFinding[],
  known: RedactionMap,
): Map<string, string> {
  const plan = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const placeholder of known.values()) {
    const kind = /^\[([A-Z]+)_/.exec(placeholder)?.[1];
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  for (const finding of findings) {
    if (plan.has(finding.key)) continue;
    const existing = known.get(finding.key);
    if (existing) {
      plan.set(finding.key, existing);
      continue;
    }
    const kind = finding.kind.toUpperCase().replace(/[^A-Z]/g, "");
    const next = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, next);
    plan.set(finding.key, `[${kind}_${String(next)}]`);
  }
  return plan;
}

/** The text with each finding not kept replaced by its placeholder. */
export function applyRedaction(
  text: string,
  findings: SensitiveFinding[],
  placeholders: Map<string, string>,
  kept: ReadonlySet<string> = new Set(),
): string {
  let result = "";
  let position = 0;
  for (const finding of findings) {
    result += text.slice(position, finding.start);
    result += kept.has(finding.key)
      ? finding.value
      : (placeholders.get(finding.key) ?? finding.value);
    position = finding.end;
  }
  return result + text.slice(position);
}

/** Records the placeholders a sent message used, so replies can be restored. */
export function commitPlaceholders(known: RedactionMap, plan: Map<string, string>): void {
  for (const [key, placeholder] of plan) known.set(key, placeholder);
}

/** A reply with every placeholder this conversation gave out put back. For display only. */
export function restoreRedacted(text: string, known: RedactionMap): string {
  let result = text;
  for (const [key, placeholder] of known) {
    const value = key.slice(key.indexOf(":") + 1);
    result = result.split(placeholder).join(value);
  }
  return result;
}
