"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

/**
 * An API key, token or signing secret, in the three states it actually has.
 *
 * Stripe, GitHub, OpenAI, Vercel and every developer product with a settings
 * page draw this by hand, and the states are the same everywhere: shown once
 * at creation and never again; hidden but revealable, for a secret the server
 * can show again; and gone, where only a prefix and the last four remain and
 * the only thing left to do is regenerate. No component library ships it —
 * the nearest thing is a password input, which is a control for entering a
 * secret you know, not for handling one you have just been given.
 *
 * "Shown once" is a first-class state rather than a toast, because it is the
 * one that costs people money: the key is on screen, the tab closes, and the
 * next hour is spent regenerating it and updating every client. So the field
 * says it in a sentence beside the value, and the way out is a button that
 * says what it means — "I have saved it" — rather than the value quietly
 * vanishing on navigation.
 *
 * While hidden, the secret is not in the DOM. The preview is what is
 * rendered, so a screenshot, an extension or a devtools pane sees the prefix
 * and the last four, which is what the server itself keeps. Reveals are
 * reported, since an audit log of who looked is the reason the hidden state
 * exists. Copy works while hidden, because the point of the key is to be
 * pasted, not read.
 */

export type SecretFieldState = "shown" | "hidden" | "revealed" | "gone";

export interface SecretFieldProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  label: string;
  /** The secret. Omit once it can no longer be shown. */
  value?: string;
  /** What stands in for it while hidden or gone. Derived from the value when there is one. */
  preview?: string;
  /** This is the only time the value can be seen. */
  once?: boolean;
  /** The reader has saved a shown-once value. Drop `value` in response. */
  onAcknowledge?: () => void;
  /** Called each time the value is shown or hidden, so reveals can be logged. */
  onRevealChange?: (revealed: boolean) => void;
  /** Offers to regenerate. Confirmed inline first, because it revokes the current one. */
  onRegenerate?: () => void;
  /** Said before regenerating. */
  regenerateWarning?: string;
  /** Metadata — when it was created, when it was last used. */
  children?: ReactNode;
}

/**
 * A prefix and the last four, the way a server keeps a key it has hashed.
 * The prefix is kept through the last underscore in the first twelve
 * characters — `sk_live_`, `ghp_`, `whsec_` — so the reader can tell which
 * key this is without being shown any of it.
 */
export function maskSecret(value: string, keepEnd = 4): string {
  const underscore = value.slice(0, 12).lastIndexOf("_");
  let prefix = underscore > 0 ? value.slice(0, underscore + 1) : value.slice(0, 4);
  // Never show enough of a short secret to reconstruct it.
  if (prefix.length + keepEnd + 4 > value.length) prefix = "";
  if (value.length < keepEnd + 4) return "••••••••";
  return `${prefix}…${value.slice(-keepEnd)}`;
}

export function SecretField({
  className,
  label,
  value,
  preview,
  once = false,
  onAcknowledge,
  onRevealChange,
  onRegenerate,
  regenerateWarning = "Regenerating revokes this one immediately. Anything still using it stops working.",
  children,
  ...props
}: SecretFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const state: SecretFieldState =
    value === undefined ? "gone" : once ? "shown" : revealed ? "revealed" : "hidden";
  const visible = state === "shown" || state === "revealed";
  const masked = preview ?? (value !== undefined ? maskSecret(value) : "••••••••");

  const copyValue = () => {
    if (value === undefined) return;
    const settle = (next: "copied" | "error") => {
      setCopy(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setCopy("idle");
      }, 2000);
    };
    // Wrapped so a missing clipboard API throws into the same failure path
    // as a refused one, rather than throwing out of the click handler.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(value))
      .then(
        () => {
          settle("copied");
        },
        () => {
          settle("error");
        },
      );
  };

  const setReveal = (next: boolean) => {
    setRevealed(next);
    onRevealChange?.(next);
  };

  const note =
    state === "shown"
      ? "Shown once. Copy it now — it cannot be shown again."
      : state === "gone"
        ? "Cannot be shown again."
        : state === "hidden"
          ? "Hidden. Copy works without revealing it."
          : "Revealed.";

  return (
    <div
      data-slot="secret-field"
      data-state={state}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <label htmlFor={`${id}-value`} className="text-xs font-medium">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {/* Read-only rather than disabled, so it can be focused, selected and
            read. While hidden the DOM holds the preview, not the secret. */}
        <Input
          id={`${id}-value`}
          readOnly
          inputSize="sm"
          value={visible ? value : masked}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={`${id}-note`}
          // Claims a readable width first; the buttons wrap under it when the
          // row is short, rather than the key being squeezed to a fragment.
          className="min-w-0 flex-1 basis-64 font-mono"
          onFocus={(event) => {
            if (visible) event.currentTarget.select();
          }}
        />

        {value !== undefined && !once ? (
          <Button
            variant="outline"
            size="sm"
            aria-pressed={revealed}
            aria-label={`${revealed ? "Hide" : "Reveal"} — ${label}`}
            onClick={() => {
              setReveal(!revealed);
            }}
          >
            {revealed ? "Hide" : "Reveal"}
          </Button>
        ) : null}

        {value !== undefined ? (
          <Button
            variant="outline"
            size="sm"
            data-state={copy}
            aria-label={`Copy — ${label}`}
            onClick={copyValue}
          >
            {copy === "copied" ? "Copied" : "Copy"}
          </Button>
        ) : null}

        {state === "shown" && onAcknowledge ? (
          <Button variant="primary" size="sm" onClick={onAcknowledge}>
            I have saved it
          </Button>
        ) : null}

        {onRegenerate && !confirming ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Regenerate — ${label}`}
            onClick={() => {
              setConfirming(true);
            }}
          >
            Regenerate…
          </Button>
        ) : null}
      </div>

      <p
        id={`${id}-note`}
        data-slot="secret-field-note"
        className={cn("text-xs", state === "shown" ? "text-warning" : "text-muted-foreground")}
      >
        {note}
      </p>

      {/* Present from the start, so the first copy is heard. Failure is said
          too: the clipboard can be refused, and a button that only ever says
          "Copied" would be lying the one time it matters. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copy === "copied"
          ? "Copied to the clipboard"
          : copy === "error"
            ? "Could not copy. Select the value and copy it by hand."
            : ""}
      </span>
      {copy === "error" ? (
        <p data-slot="secret-field-copy-error" className="text-xs text-destructive">
          Could not copy. Select the value and copy it by hand.
        </p>
      ) : null}

      {children}

      {confirming ? (
        <div
          data-slot="secret-field-confirm"
          role="group"
          aria-labelledby={`${id}-confirm`}
          className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3"
        >
          <p id={`${id}-confirm`} className="text-xs text-destructive">
            {regenerateWarning}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirming(false);
                onRegenerate?.();
              }}
            >
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
