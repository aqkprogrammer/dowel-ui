"use client";

import type { ReactNode } from "react";

import {
  ActivityContent,
  ActivityDescription,
  ActivityFeed,
  ActivityIndicator,
  ActivityItem,
  ActivityTime,
  ActivityTitle,
} from "@/components/activity-feed";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

/**
 * An overview page: headline numbers and what happened recently.
 *
 * The trend on a stat is stated in words as well as by direction and colour —
 * "up 12.4%" rather than a green triangle — because a triangle is unreadable to
 * a screen reader and ambiguous to anyone who cannot tell the colours apart.
 */

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  /** Signed change, e.g. 12.4 or -3.1. Omit when there is nothing to compare to. */
  change?: number;
  /** What the change is measured against. */
  comparison?: string;
  /** Whether a rise is good. Churn going up is not. */
  higherIsBetter?: boolean;
}

export interface DashboardEvent {
  id: string;
  title: string;
  detail?: string;
  /** Machine-readable timestamp. */
  at: string;
  /** Human label, e.g. "12 minutes ago". */
  label: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export interface DashboardBlockProps {
  title?: string;
  description?: string;
  stats: DashboardStat[];
  events?: DashboardEvent[];
  /** Renders placeholders instead of content. */
  loading?: boolean;
  /** Anything to put beside the heading — a date range picker, an action. */
  actions?: ReactNode;
  className?: string;
}

function formatChange(change: number): string {
  const rounded = Math.abs(change).toFixed(1);
  return `${change >= 0 ? "up" : "down"} ${rounded}%`;
}

export function DashboardBlock({
  title = "Overview",
  description = "How things are going.",
  stats,
  events = [],
  loading = false,
  actions,
  className,
}: DashboardBlockProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const good =
            stat.change === undefined
              ? undefined
              : (stat.higherIsBetter ?? true)
                ? stat.change >= 0
                : stat.change < 0;

          return (
            <Card key={stat.id}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                {/* Not a heading: a number is data, and making it one both
                    breaks the heading order and litters the outline. */}
                <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
                  {loading ? <Skeleton className="h-7 w-24" /> : stat.value}
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : stat.change === undefined ? null : (
                  <p className={cn("text-xs", good ? "text-success" : "text-destructive")}>
                    {/* In words: direction and magnitude, not a coloured arrow. */}
                    {formatChange(stat.change)}
                    {stat.comparison ? (
                      <span className="text-muted-foreground"> {stat.comparison}</span>
                    ) : null}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {events.length > 0 || loading ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Recent activity</h2>
            </CardTitle>
            <CardDescription>The last few things that happened.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-3">
                    <Skeleton className="size-6 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityFeed>
                {events.map((event, index) => (
                  <ActivityItem key={event.id} last={index === events.length - 1}>
                    <ActivityIndicator
                      className={cn(
                        event.tone === "success" && "border-success/40 text-success",
                        event.tone === "warning" && "border-warning/40 text-warning",
                        event.tone === "destructive" &&
                          "border-destructive/40 text-destructive",
                      )}
                    />
                    <ActivityContent>
                      <ActivityTitle className="flex flex-wrap items-center gap-2">
                        {event.title}
                        {event.tone && event.tone !== "default" ? (
                          <Badge
                            size="sm"
                            variant={
                              event.tone === "success"
                                ? "success"
                                : event.tone === "warning"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {event.tone === "success"
                              ? "Succeeded"
                              : event.tone === "warning"
                                ? "Warning"
                                : "Failed"}
                          </Badge>
                        ) : null}
                      </ActivityTitle>
                      {event.detail ? (
                        <ActivityDescription>{event.detail}</ActivityDescription>
                      ) : null}
                      <ActivityTime dateTime={event.at}>{event.label}</ActivityTime>
                    </ActivityContent>
                  </ActivityItem>
                ))}
              </ActivityFeed>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
