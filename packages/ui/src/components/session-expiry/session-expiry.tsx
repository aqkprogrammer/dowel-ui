"use client";

import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { cn } from "@/lib/utils";

/**
 * "Your session ends in two minutes. Stay signed in?"
 *
 * Every product with an idle timeout builds this, and WCAG 2.2.1 (Timing
 * Adjustable) says what it has to do: warn before the time runs out, and
 * give at least twenty seconds to extend it with a simple action. Most
 * implementations get the first half — a toast, a modal — and fail the
 * second in one of two ways: the warning can be dismissed without choosing,
 * so a reader who closed it to see the page underneath is signed out with
 * no further word; or the countdown is a live region, so a screen reader
 * user hears a number every second for two minutes and cannot hear the
 * choice they are being asked to make.
 *
 * So this is an alert dialog that cannot be waved away. Escape and the
 * backdrop do nothing, because dismissing a session warning without
 * choosing is choosing nothing, and the two buttons are the two things a
 * person can actually do. The countdown ticks on screen and is announced at
 * four moments — when the warning opens, at one minute, thirty seconds and
 * ten — which is enough to know how long is left and quiet enough to hear
 * the question.
 *
 * When time runs out, `onExpire` fires once and the dialog says so, with a
 * slot for whatever the application offers next. It does not sign anyone
 * out; the server did that, and this is the part that tells the person.
 */

export type SessionPhase = "active" | "warning" | "expired";

/** Where a session stands, given the clock. Pure, for tests and for the server. */
export function sessionPhase(expiresAt: Date, now: Date, warnBefore: number): SessionPhase {
  const remaining = expiresAt.getTime() - now.getTime();
  if (remaining <= 0) return "expired";
  if (remaining <= warnBefore) return "warning";
  return "active";
}

/** Whole seconds left, never negative. */
export function secondsLeft(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}

/** "1:59" for the screen. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes)}:${String(rest).padStart(2, "0")}`;
}

/** "1 minute 59 seconds" for the ear. */
export function describeCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}`);
  if (rest > 0 || minutes === 0)
    parts.push(`${String(rest)} ${rest === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}

/** The seconds-left values at which the countdown is said aloud. */
const ANNOUNCE_AT = [60, 30, 10];

function subscribeToClock(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => {
    clearInterval(timer);
  };
}
/** Whole seconds, so the snapshot is stable within a second and React does not re-render for nothing. */
const readClockSeconds = () => Math.floor(Date.now() / 1000);
const readNoClock = () => null;

export interface SessionExpiryProps {
  /** When the session ends. Move it forward after a successful extend. */
  expiresAt: Date;
  /** How long before the end to warn, in milliseconds. Two minutes by default. */
  warnBefore?: number;
  /**
   * The clock. Supply it to drive the countdown yourself, or in tests; omit
   * and the component ticks once a second while mounted.
   */
  now?: Date;
  /** Keep the session going. May return a promise; the button waits for it. */
  onExtend: () => void | Promise<void>;
  /** Called once when the time runs out. */
  onExpire?: () => void;
  /** Offered as the other choice. Omit to offer only staying signed in. */
  onSignOut?: () => void;
  /** The warning's heading. */
  heading?: string;
  /** What is at stake, in the reader's language: "Unsaved edits will be lost." */
  children?: ReactNode;
  /** What to offer once the session has ended: a sign-in link, usually. */
  expiredAction?: ReactNode;
  className?: string;
}

export function SessionExpiry({
  expiresAt,
  warnBefore = 120_000,
  now: nowProp,
  onExtend,
  onExpire,
  onSignOut,
  heading = "Your session is about to end",
  children,
  expiredAction,
  className,
}: SessionExpiryProps) {
  const id = useId();

  // The clock as an external store that ticks once a second. The server
  // snapshot is null, so the server and the first client render agree on
  // showing nothing; the real instant arrives in the re-render after.
  const tickSeconds = useSyncExternalStore(subscribeToClock, readClockSeconds, readNoClock);
  const tick = tickSeconds === null ? null : new Date(tickSeconds * 1000);

  const now = nowProp ?? tick;
  const phase = now ? sessionPhase(expiresAt, now, warnBefore) : "active";
  const seconds = now ? secondsLeft(expiresAt, now) : 0;

  const [announcement, setAnnouncement] = useState("");

  // Announced at the moments that matter, not every second. Tracked as the
  // last threshold spoken so a tick that skips a value still says it once.
  const [spoken, setSpoken] = useState<number | null>(null);
  const [endedFor, setEndedFor] = useState<number | null>(null);

  if (phase === "warning") {
    if (spoken === null) {
      setSpoken(Number.POSITIVE_INFINITY);
      setAnnouncement(`${heading}. ${describeCountdown(seconds)} left.`);
    } else {
      const due = ANNOUNCE_AT.find((at) => seconds <= at && at < spoken);
      if (due !== undefined) {
        setSpoken(due);
        setAnnouncement(`${describeCountdown(seconds)} left.`);
      }
    }
  } else if (spoken !== null && phase === "active") {
    // Extended. The next warning starts its announcements afresh.
    setSpoken(null);
    setAnnouncement("");
  } else if (phase === "expired" && endedFor !== expiresAt.getTime()) {
    setEndedFor(expiresAt.getTime());
    setAnnouncement("Your session has ended.");
  }

  // The one side effect: telling the application, once per expiry. A ref
  // rather than state, because nothing rendered depends on it.
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "expired" || firedFor.current === expiresAt.getTime()) return;
    firedFor.current = expiresAt.getTime();
    onExpire?.();
  }, [phase, expiresAt, onExpire]);

  const open = phase !== "active";

  // Once told to close, the dialog is left alone: the countdown it shows is
  // frozen and its props stop changing, so the clock's ticks no longer
  // re-render a surface that is mid-exit. A dialog re-rendered every second
  // while closing never finishes closing.
  const [shown, setShown] = useState(seconds);
  if (open && shown !== seconds) setShown(seconds);

  return (
    <ExpiryDialog
      id={id}
      open={open}
      phase={phase}
      seconds={shown}
      heading={heading}
      announcement={announcement}
      onExtend={onExtend}
      onSignOut={onSignOut}
      expiredAction={expiredAction}
      className={className}
    >
      {children}
    </ExpiryDialog>
  );
}

interface ExpiryDialogProps {
  id: string;
  open: boolean;
  phase: SessionPhase;
  seconds: number;
  heading: string;
  announcement: string;
  onExtend: () => void | Promise<void>;
  onSignOut?: () => void;
  expiredAction?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const ExpiryDialog = memo(function ExpiryDialog({
  id,
  open,
  phase,
  seconds,
  heading,
  announcement,
  onExtend,
  onSignOut,
  expiredAction,
  className,
  children,
}: ExpiryDialogProps) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const [extending, setExtending] = useState(false);

  const extend = () => {
    const result = onExtend();
    if (result instanceof Promise) {
      setExtending(true);
      void result.finally(() => {
        setExtending(false);
      });
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        aria-describedby={`${id}-description`}
        data-slot="session-expiry"
        data-phase={phase}
        className={cn("max-w-sm", className)}
        // Dismissing a session warning without choosing is choosing nothing,
        // so the gestures that dismiss a dialog do nothing here. The buttons
        // are the way out, and there are two of them.
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        // Focus lands on the safe choice. The first tabbable would be "Sign
        // out now", and a reflexive Enter on that is the outcome the whole
        // dialog exists to prevent.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          stayRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{phase === "expired" ? "Your session has ended" : heading}</DialogTitle>
          <DialogDescription id={`${id}-description`}>
            {phase === "expired" ? (
              "You were signed out after a period of inactivity."
            ) : (
              <>
                You will be signed out in{" "}
                <span data-slot="session-expiry-countdown" className="font-medium tabular-nums">
                  <span aria-hidden="true">{formatCountdown(seconds)}</span>
                  <span className="sr-only">{describeCountdown(seconds)}</span>
                </span>
                .
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}

        {/* The countdown above is not live. This is, and it speaks four times. */}
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>

        <DialogFooter>
          {phase === "expired" ? (
            expiredAction
          ) : (
            <>
              {onSignOut ? (
                <Button variant="outline" onClick={onSignOut}>
                  Sign out now
                </Button>
              ) : null}
              <Button ref={stayRef} loading={extending} onClick={extend}>
                Stay signed in
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
