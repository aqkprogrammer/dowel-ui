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
import { Spinner } from "@/components/spinner";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * "Add this record at your DNS provider."
 *
 * Vercel, Resend, Cloudflare, Postmark, Google Workspace and every product
 * that verifies a domain or routes its mail draws this card by hand, and
 * they all learn the same three things the hard way.
 *
 * The parts are copied separately. A provider's form has a Name field, a
 * Type field and a Value field, so one button that copies the whole line
 * copies something nobody can paste anywhere.
 *
 * The Name field is a trap. Some providers want the host relative to the
 * zone, `_dmarc`; some want the full name, `_dmarc.acme.com`; and some take
 * the relative form and append the zone themselves, so a full name pasted
 * in becomes `_dmarc.acme.com.acme.com` and the check fails for a reason
 * nobody can see. So the host is shown both ways, with the sentence that
 * explains which to use.
 *
 * A failed check says what was found. "Not verified" sends people back to
 * their provider to stare at a record that is correct and has not
 * propagated yet; "found v=spf1 -all, expected v=spf1 include:…" sends them
 * to the typo. And nothing found at all is said as nothing found, with how
 * long that can take, because it is not the same as wrong.
 */

export type DnsRecordStatus = "pending" | "checking" | "verified" | "failed";

export interface DnsHostForms {
  /** Relative to the zone: `_dmarc`, or `@` for the zone itself. */
  relative: string;
  /** Fully qualified: `_dmarc.acme.com`. */
  full: string;
}

/**
 * The host both ways a provider might want it. Accepts either form and a
 * trailing dot, so the record can be declared however the backend has it.
 */
export function dnsHostForms(name: string, zone: string): DnsHostForms {
  const cleanZone = zone.replace(/\.$/, "");
  const cleanName = name.replace(/\.$/, "");
  if (cleanName === "@" || cleanName === "" || cleanName === cleanZone) {
    return { relative: "@", full: cleanZone };
  }
  if (cleanName.endsWith(`.${cleanZone}`)) {
    return { relative: cleanName.slice(0, -cleanZone.length - 1), full: cleanName };
  }
  return { relative: cleanName, full: `${cleanName}.${cleanZone}` };
}

export interface DnsRecordProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  type: string;
  /** The host, relative or fully qualified. */
  name: string;
  value: string;
  /** The zone the record belongs to. Enables the host to be shown both ways. */
  zone?: string;
  ttl?: number | string;
  priority?: number;
  /** What the record is for, in the reader's language: "Proves you own acme.com". */
  purpose?: string;
  status?: DnsRecordStatus;
  /** What the check found instead, when it failed. The useful part. */
  found?: string[];
  checkedAt?: Date;
  locale?: string;
  onCheck?: () => void;
  children?: ReactNode;
}

type CopyState = "idle" | "copied" | "error";

export function DnsRecord({
  className,
  type,
  name,
  value,
  zone,
  ttl,
  priority,
  purpose,
  status = "pending",
  found,
  checkedAt,
  locale,
  onCheck,
  children,
  ...props
}: DnsRecordProps) {
  const id = useId();
  const forms = zone ? dnsHostForms(name, zone) : null;
  const host = forms ? forms.relative : name;

  // Which part was copied, and whether it worked, so the button that was
  // pressed is the one that says so.
  const [copy, setCopy] = useState<{ part: string; state: CopyState } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copyPart = (part: string, text: string) => {
    const settle = (state: CopyState) => {
      setCopy({ part, state });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setCopy(null);
      }, 2000);
    };
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => {
          settle("copied");
        },
        () => {
          settle("error");
        },
      );
  };

  const statusText =
    status === "verified"
      ? "Verified"
      : status === "checking"
        ? "Checking…"
        : status === "failed"
          ? found && found.length > 0
            ? "Not verified. Something else was found."
            : "Not verified. Nothing found yet — DNS changes can take up to 48 hours to appear."
          : "Not checked yet";

  const checked =
    checkedAt !== undefined
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
          checkedAt,
        )
      : null;

  const parts: { key: string; label: string; text: string; note?: ReactNode }[] = [
    { key: "type", label: "Type", text: type },
    {
      key: "name",
      label: "Name",
      text: host,
      note: forms ? (
        forms.relative === "@" ? (
          <>
            Some providers want <code className="font-mono">{forms.full}</code> or leave it
            blank instead of <code className="font-mono">@</code>.
          </>
        ) : (
          <>
            Some providers want the full name, <code className="font-mono">{forms.full}</code>.
            If the field already ends in <code className="font-mono">{zone}</code>, enter just
            the part shown.
          </>
        )
      ) : undefined,
    },
    {
      key: "value",
      label: "Value",
      text: value,
      note:
        type.toUpperCase() === "TXT"
          ? "Enter without quotes; your provider adds them if it needs to."
          : undefined,
    },
    ...(priority !== undefined
      ? [{ key: "priority", label: "Priority", text: String(priority) }]
      : []),
    ...(ttl !== undefined ? [{ key: "ttl", label: "TTL", text: String(ttl) }] : []),
  ];

  return (
    <section
      data-slot="dns-record"
      data-status={status}
      aria-labelledby={`${id}-heading`}
      aria-busy={status === "checking" || undefined}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-sm font-medium">
          {type} record
          {purpose ? (
            <span className="font-normal text-muted-foreground"> · {purpose}</span>
          ) : null}
        </h3>
        {/* Status as a word, and announced when it changes: a check was asked
            for, and the answer should arrive where the asker is. */}
        <p
          data-slot="dns-record-status"
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-1.5 text-xs",
            status === "verified" && "text-success",
            status === "failed" && "text-destructive",
            (status === "pending" || status === "checking") && "text-muted-foreground",
          )}
        >
          {status === "checking" ? <Spinner size="sm" /> : null}
          {statusText}
          {checked && status !== "checking" ? (
            <span className="text-muted-foreground"> · checked {checked}</span>
          ) : null}
        </p>
      </div>

      {children}

      <dl className="m-0 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
        {parts.map((part) => (
          <div key={part.key} className="contents">
            <dt className="text-xs font-medium text-muted-foreground sm:pt-1.5">
              {part.label}
            </dt>
            <dd className="m-0 flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <code
                  data-slot="dns-record-part"
                  data-part={part.key}
                  className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1 font-mono text-xs break-all"
                >
                  {part.text}
                </code>
                <button
                  type="button"
                  aria-label={`Copy ${part.label.toLowerCase()}`}
                  data-state={copy?.part === part.key ? copy.state : "idle"}
                  className={cn(
                    "shrink-0 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                    focusRing,
                  )}
                  onClick={() => {
                    copyPart(part.key, part.text);
                  }}
                >
                  {copy?.part === part.key && copy.state === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
              {copy?.part === part.key && copy.state === "error" ? (
                <p data-slot="dns-record-copy-error" className="text-xs text-destructive">
                  Could not copy. Select it and copy by hand.
                </p>
              ) : null}
              {part.note ? <p className="text-xs text-muted-foreground">{part.note}</p> : null}
            </dd>
          </div>
        ))}
      </dl>

      {status === "failed" && found && found.length > 0 ? (
        <div
          data-slot="dns-record-found"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs"
        >
          <p className="font-medium text-destructive">Found instead:</p>
          <ul className="m-0 mt-1 list-none p-0">
            {found.map((entry) => (
              <li key={entry}>
                <code className="font-mono break-all">{entry}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* A separate region from the verification status, so "Copied name"
          never replaces or interrupts a check result that is being read.
          Present from the start, so the first copy is heard. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copy?.state === "copied"
          ? `Copied ${copy.part}`
          : copy?.state === "error"
            ? `Could not copy ${copy.part}. Select it and copy by hand.`
            : ""}
      </span>

      {onCheck ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" loading={status === "checking"} onClick={onCheck}>
            {status === "verified" ? "Check again" : "Check now"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
