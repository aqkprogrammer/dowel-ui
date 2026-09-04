"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Progress } from "@/components/progress";
import { cn } from "@/lib/utils";

/**
 * A setup checklist: what is done, what is next, and what is left.
 *
 * The usual version marks a finished step with a green tick and nothing else,
 * which leaves a screen reader announcing an unlabelled decoration and leaves
 * anyone who cannot distinguish the colours guessing. Here the state of every
 * step is a word, and the tick is decoration on top of it.
 *
 * Blocked is a real state, and not the same as not-yet-started. Telling someone
 * to connect a repository when they have not been invited to the organisation
 * yet wastes their time; saying why it is unavailable does not.
 */

/**
 * The tick on a finished step.
 *
 * Inline rather than from an icon package: the CLI writes this file into
 * someone else's project, and a component that drags an icon dependency in with
 * it is a component that cannot be installed without one. Every icon in the
 * library is drawn this way for that reason.
 */
function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-3.5">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type OnboardingStepStatus = "done" | "current" | "todo" | "blocked";

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  status: OnboardingStepStatus;
  /** Label for this step's action. Omit and no action is offered. */
  actionLabel?: string;
  onAction?: () => void;
  /** Why a blocked step cannot be started yet. Shown, and announced. */
  blockedReason?: string;
  /** Roughly how long it takes, e.g. "2 minutes". */
  estimate?: string;
}

export interface OnboardingBlockProps {
  title?: string;
  description?: string;
  steps: OnboardingStep[];
  /** Shown once every step is done. */
  completeTitle?: string;
  completeDescription?: string;
  /** Offered alongside the heading — "Skip setup", say. */
  actions?: ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<OnboardingStepStatus, string> = {
  done: "Done",
  current: "In progress",
  todo: "Not started",
  blocked: "Blocked",
};

const STATUS_VARIANT: Record<
  OnboardingStepStatus,
  "success" | "default" | "secondary" | "warning"
> = {
  done: "success",
  current: "default",
  todo: "secondary",
  blocked: "warning",
};

/** "3 of 6 steps done" — the number, not a percentage nobody counts in. */
export function describeProgress(steps: OnboardingStep[]): string {
  const done = steps.filter((step) => step.status === "done").length;

  if (steps.length === 0) return "Nothing to set up.";
  if (done === steps.length) return `All ${String(steps.length)} steps done.`;
  return `${String(done)} of ${String(steps.length)} steps done.`;
}

export function OnboardingBlock({
  title = "Get set up",
  description = "A few things to do before you start.",
  steps,
  completeTitle = "You are all set",
  completeDescription = "Everything is configured. This checklist will not be shown again.",
  actions,
  className,
}: OnboardingBlockProps) {
  const done = steps.filter((step) => step.status === "done").length;
  const complete = steps.length > 0 && done === steps.length;
  const percent = steps.length === 0 ? 0 : (done / steps.length) * 100;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle asChild>
            <h2>{complete ? completeTitle : title}</h2>
          </CardTitle>
          <CardDescription>{complete ? completeDescription : description}</CardDescription>
        </div>
        {actions}
      </CardHeader>

      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          {/* The count in words is the answer; the bar restates it visually and
              is hidden so the same fact is not announced twice. */}
          <p className="text-sm font-medium tabular-nums">{describeProgress(steps)}</p>
          <Progress value={percent} tone={complete ? "success" : undefined} aria-hidden />
        </div>

        <ol className="grid gap-3">
          {steps.map((step, index) => {
            const isDone = step.status === "done";
            const isBlocked = step.status === "blocked";
            const isCurrent = step.status === "current";

            return (
              <li
                key={step.id}
                // The current step is the one thing worth finding on this page,
                // so it is programmatically identifiable rather than only being
                // the one with a ring around it.
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex gap-3 rounded-lg border p-4",
                  isCurrent ? "border-primary/50 bg-primary/5" : "border-border",
                  isBlocked && "opacity-90",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums",
                    isDone
                      ? "border-success bg-success/15 text-success"
                      : isCurrent
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {isDone ? <CheckMark /> : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {step.title}
                    </p>
                    {/* The state, in a word. This is the part a tick alone
                        cannot say. */}
                    <Badge size="sm" variant={STATUS_VARIANT[step.status]}>
                      {STATUS_LABEL[step.status]}
                    </Badge>
                    {step.estimate && !isDone ? (
                      <span className="text-xs text-muted-foreground">{step.estimate}</span>
                    ) : null}
                  </div>

                  {step.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  ) : null}

                  {isBlocked && step.blockedReason ? (
                    <p className="mt-1 text-sm text-warning">{step.blockedReason}</p>
                  ) : null}

                  {step.actionLabel && !isDone ? (
                    <Button
                      className="mt-3"
                      size="sm"
                      variant={isCurrent ? "primary" : "outline"}
                      disabled={isBlocked}
                      onClick={step.onAction}
                    >
                      {/*
                        Named after its step. Six buttons all called "Start" are
                        six identical entries in a screen reader's list of
                        controls, and the label still begins with the visible
                        text so voice control matches what is on screen.
                      */}
                      <span aria-hidden>{step.actionLabel}</span>
                      <span className="sr-only">
                        {step.actionLabel}: {step.title}
                      </span>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
