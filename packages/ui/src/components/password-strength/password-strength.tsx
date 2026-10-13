"use client";

// Original design.
import { useEffect, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * How strong a password is, and what would make it stronger, shown under a
 * password field as the reader types.
 *
 * Strength is counted from rules the reader can see and act on — length,
 * character variety, not one of the passwords everyone tries first — rather
 * than an entropy number nobody can do anything with. Each rule says in words
 * whether it is met; the meter gives the level in words too, so neither relies
 * on colour. The level is announced politely as it changes, the rule list is
 * not, which keeps a screen reader from reading a checklist on every key.
 *
 * Give the password field `aria-describedby` pointing at this component's id,
 * so the rules are read with the field. Nothing here is a substitute for
 * checking a password against breach data on the server.
 */

export interface PasswordRule {
  id: string;
  /** What the rule asks for, e.g. "At least 12 characters". */
  label: string;
  test: (password: string) => boolean;
}

/**
 * The first passwords any attacker tries. Deliberately short — a check against
 * a real breach corpus belongs on the server — but enough to stop the worst.
 */
const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "111111",
  "letmein",
  "iloveyou",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "abc123",
  "passw0rd",
  "trustno1",
]);

/** Whether a password is, ignoring case, one of the first everyone tries. */
export function isCommonPassword(password: string): boolean {
  return COMMON.has(password.trim().toLowerCase());
}

/** The default rules: length, mixed case, a number, a symbol, and not a common password. */
export function defaultPasswordRules(minLength = 12): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${String(minLength)} characters`,
      test: (password) => [...password].length >= minLength,
    },
    {
      id: "case",
      label: "Upper and lower case letters",
      // Case conversion rather than [A-Z], so "Ä" and "ä" count too.
      test: (password) =>
        password.toLowerCase() !== password && password.toUpperCase() !== password,
    },
    { id: "number", label: "A number", test: (password) => /[0-9]/.test(password) },
    {
      id: "symbol",
      label: "A symbol or space",
      test: (password) => /[\s!-/:-@[-`{-~]/.test(password),
    },
    {
      id: "common",
      label: "Not a commonly used password",
      test: (password) => password.length > 0 && !isCommonPassword(password),
    },
  ];
}

export const PASSWORD_LEVELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

export type PasswordLevel = (typeof PASSWORD_LEVELS)[number];

export interface PasswordScore {
  /** 0–4. */
  score: number;
  level: PasswordLevel;
  /** Each rule and whether it is met, in order. */
  results: { rule: PasswordRule; met: boolean }[];
}

/**
 * Scores a password 0–4 from the share of rules it meets. A password that
 * fails the first rule (length, by default) or is a common one cannot score
 * above Weak, however varied it is: `Aa1!` is not a good password.
 */
export function scorePassword(password: string, rules: readonly PasswordRule[]): PasswordScore {
  const results = rules.map((rule) => ({
    rule,
    met: password.length > 0 && rule.test(password),
  }));
  if (password.length === 0 || rules.length === 0) {
    return { score: 0, level: PASSWORD_LEVELS[0], results };
  }
  const met = results.filter((result) => result.met).length;
  let score = Math.round((met / rules.length) * 4);
  const gate = results[0]?.met === false || isCommonPassword(password);
  if (gate) score = Math.min(score, 1);
  return { score, level: PASSWORD_LEVELS[score] ?? PASSWORD_LEVELS[0], results };
}

/** Meter colour per score: never the only signal, the level is always written. */
const SEGMENT_TONE = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-success",
  "bg-success",
] as const;

export interface PasswordStrengthProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The password to assess. */
  value: string;
  /** The rules to check, in order. Default: `defaultPasswordRules(minLength)`. */
  rules?: readonly PasswordRule[];
  /** Minimum length for the default rules. Default 12. */
  minLength?: number;
  /** Show the rule checklist under the meter. Default true. */
  showRules?: boolean;
  /** Called with the score whenever it is computed, to gate a submit button, say. */
  onScoreChange?: (score: PasswordScore) => void;
}

/** A strength meter and rule checklist for a password field. */
export function PasswordStrength({
  value,
  rules,
  minLength = 12,
  showRules = true,
  onScoreChange,
  className,
  ...props
}: PasswordStrengthProps) {
  const active = rules ?? defaultPasswordRules(minLength);
  const result = scorePassword(value, active);
  const empty = value.length === 0;

  // Reported after render, once per change of score or of which rules pass.
  const signature = `${String(result.score)}:${result.results.map((entry) => (entry.met ? 1 : 0)).join("")}`;
  const latest = { result, onScoreChange };
  useEffect(() => {
    latest.onScoreChange?.(latest.result);
    // The signature is the change being reported; the callback is read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div data-slot="password-strength" className={cn("grid gap-2", className)} {...props}>
      <div className="flex items-center gap-3">
        <div
          role="meter"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={result.score}
          aria-valuetext={empty ? "No password yet" : result.level}
          data-slot="password-strength-meter"
          data-score={result.score}
          className="grid flex-1 grid-cols-4 gap-1"
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              aria-hidden="true"
              className={cn(
                "h-1.5 rounded-full transition-colors duration-(--duration-normal) ease-(--ease-out-quint)",
                !empty && result.score >= segment ? SEGMENT_TONE[result.score] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span
          aria-live="polite"
          data-slot="password-strength-level"
          className="min-w-16 text-end text-xs font-medium text-foreground"
        >
          {empty ? "" : result.level}
        </span>
      </div>

      {showRules ? (
        <ul data-slot="password-strength-rules" className="grid gap-1 text-xs">
          {result.results.map(({ rule, met }) => (
            <li
              key={rule.id}
              data-met={met || undefined}
              className={cn(
                "flex items-center gap-2",
                met ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  met
                    ? "border-success bg-success text-success-foreground"
                    : "border-border text-transparent",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-2.5"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span>
                {rule.label}
                <span className="sr-only">{met ? " — met" : " — not met"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
