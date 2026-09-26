"use client";

import { useCallback, useId, useMemo, useState, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  applyRedaction,
  DEFAULT_DETECTORS,
  findSensitive,
  planPlaceholders,
  restoreRedacted,
  type Detector,
  type RedactionMap,
  type SensitiveFinding,
} from "./redact";

/**
 * A privacy check between the composer and the model.
 *
 * `usePromptRedactor` watches what is being typed and finds what should not
 * leave the page — email addresses, card numbers, API keys. `PromptRedactor`
 * shows them before sending: each by name, masked, with the placeholder it
 * will be sent as, and the option to send any of them as typed. Call
 * `redact()` when sending and send what it returns; call `restore()` on the
 * reply to put the real values back for display. Nothing leaves the browser
 * that the person did not see go.
 */

export interface PromptRedactorState {
  /** Everything found in the current text, in order. */
  findings: SensitiveFinding[];
  /** The placeholder each finding will be sent as, by key. */
  placeholders: Map<string, string>;
  isKept: (finding: SensitiveFinding) => boolean;
  /** Send this one as typed, or go back to replacing it. */
  toggle: (finding: SensitiveFinding) => void;
  /** The text as it would be sent now. */
  preview: string;
  /** The text to send. Records its placeholders so replies can be restored. */
  redact: () => string;
  /** A reply with every placeholder given out so far put back. For display only. */
  restore: (text: string) => string;
}

/**
 * `detectors` replaces the built-in list; spread `DEFAULT_DETECTORS` into it to
 * add your own. Keep the array stable (module scope) — it is a memo dependency.
 */
export function usePromptRedactor(
  value: string,
  { detectors = DEFAULT_DETECTORS }: { detectors?: Detector[] } = {},
): PromptRedactorState {
  const [known, setKnown] = useState<RedactionMap>(() => new Map());
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());

  const findings = useMemo(() => findSensitive(value, detectors), [value, detectors]);
  const placeholders = useMemo(() => planPlaceholders(findings, known), [findings, known]);
  const preview = useMemo(
    () => applyRedaction(value, findings, placeholders, kept),
    [value, findings, placeholders, kept],
  );

  const toggle = useCallback((finding: SensitiveFinding) => {
    setKept((current) => {
      const next = new Set(current);
      if (next.has(finding.key)) next.delete(finding.key);
      else next.add(finding.key);
      return next;
    });
  }, []);

  const redact = useCallback(() => {
    const used = new Map(
      [...placeholders].filter(([key]) => !kept.has(key) && !known.has(key)),
    );
    if (used.size > 0) setKnown((current) => new Map([...current, ...used]));
    return preview;
  }, [placeholders, kept, known, preview]);

  // Includes what is about to be sent, so a reply computed straight after
  // `redact()` — before the next render — still restores.
  const restore = useCallback(
    (text: string) => restoreRedacted(text, new Map([...known, ...placeholders])),
    [known, placeholders],
  );

  return {
    findings,
    placeholders,
    isKept: (finding) => kept.has(finding.key),
    toggle,
    preview,
    redact,
    restore,
  };
}

export interface PromptRedactorProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  redactor: PromptRedactorState;
  heading?: string;
}

function things(n: number): string {
  return n === 1 ? "1 thing" : `${String(n)} things`;
}

export function PromptRedactor({
  className,
  redactor,
  heading = "Before you send",
  ...props
}: PromptRedactorProps) {
  const headingId = useId();
  const { findings, placeholders, isKept, toggle, preview } = redactor;

  // One row per value, however often it appears.
  const unique = findings.filter(
    (finding, index) => findings.findIndex((other) => other.key === finding.key) === index,
  );
  const times = (finding: SensitiveFinding) =>
    findings.filter((other) => other.key === finding.key).length;
  const replaced = unique.filter((finding) => !isKept(finding));

  const status =
    unique.length === 0
      ? ""
      : replaced.length === 0
        ? `Nothing will be replaced: ${things(unique.length)} will be sent as typed.`
        : `${things(replaced.length)} will be replaced before sending.`;

  return (
    <section
      data-slot="prompt-redactor"
      // Part of the composer, not the page an agent works on.
      data-agent-ui=""
      // Named, and so a landmark, only while it has something to say.
      aria-labelledby={unique.length > 0 ? headingId : undefined}
      className={cn(
        unique.length > 0 &&
          "flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm",
        className,
      )}
      {...props}
    >
      {/* Present from the start and empty until something is found, so the
          first finding is announced while the person is still typing. */}
      <p
        data-slot="prompt-redactor-status"
        role="status"
        className={unique.length > 0 ? "font-medium" : "sr-only"}
      >
        {status}
      </p>

      {unique.length > 0 ? (
        <>
          <h3 id={headingId} className="sr-only">
            {heading}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {unique.map((finding) => {
              const keep = isKept(finding);
              const count = times(finding);
              return (
                <li
                  key={finding.key}
                  data-slot="prompt-redactor-finding"
                  data-kind={finding.kind}
                  data-kept={keep || undefined}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span className="font-medium">{finding.label}</span>
                  <span className="text-muted-foreground">{finding.masked}</span>
                  {count > 1 ? (
                    <span className="text-xs text-muted-foreground">
                      (appears {count} times)
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {keep ? (
                      "sent as typed"
                    ) : (
                      <>
                        sent as{" "}
                        <code className="rounded bg-muted px-1 font-mono">
                          {placeholders.get(finding.key)}
                        </code>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-pressed={keep}
                    onClick={() => {
                      toggle(finding);
                    }}
                    className={cn(
                      "ms-auto rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium",
                      "transition-colors duration-[var(--duration-fast)] hover:bg-accent aria-pressed:bg-accent",
                      focusRing,
                    )}
                  >
                    Send as typed
                    <span className="sr-only">
                      : {finding.label}, {finding.masked}
                    </span>
                  </button>
                  {keep && finding.kind === "secret" ? (
                    <p className="w-full text-xs text-destructive">
                      A model never needs a secret, and anyone who can read this conversation
                      could use it.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <details className="text-xs">
            <summary
              className={cn("w-fit cursor-pointer rounded text-muted-foreground", focusRing)}
            >
              What will be sent
            </summary>
            <p
              data-slot="prompt-redactor-preview"
              className="mt-1.5 rounded bg-muted/60 p-2 whitespace-pre-wrap"
            >
              {preview}
            </p>
          </details>
        </>
      ) : null}
    </section>
  );
}
