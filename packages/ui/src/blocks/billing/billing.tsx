"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { Progress } from "@/components/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { cn } from "@/lib/utils";

/**
 * A billing page: the plan, what it has been used for, how it is paid, and
 * what has been charged.
 *
 * Two things here are usually got wrong. Usage against a limit is shown as a
 * bar that turns red, which says nothing to a screen reader and nothing at all
 * to someone who cannot tell the colours apart — so every meter here also
 * states where it stands in words. And an invoice table gives ten links all
 * called "Download", which in a links list reads as ten identical entries; each
 * one here names the invoice it belongs to.
 */

export type InvoiceStatus = "paid" | "open" | "past-due" | "refunded" | "void";

export interface BillingPlan {
  name: string;
  /** Formatted, because the currency and interval are a presentation choice. */
  price: string;
  /** e.g. "per month, billed annually". */
  interval?: string;
  /** Machine-readable renewal date. */
  renewsAt?: string;
  /** Human label for the renewal, e.g. "3 March 2027". */
  renewsLabel?: string;
  /** Set when the plan is ending rather than renewing. */
  cancelsAtPeriodEnd?: boolean;
}

export interface BillingUsage {
  id: string;
  label: string;
  used: number;
  /** Omit for an unmetered resource; the bar is replaced by the figure alone. */
  limit?: number;
  /** e.g. "seats", "GB", "requests". Used in the spoken summary. */
  unit?: string;
  format?: (value: number) => string;
}

export interface BillingPaymentMethod {
  /** e.g. "Visa", "Mastercard". */
  brand: string;
  /** Exactly the last four digits. */
  last4: string;
  /** e.g. "04/2029". */
  expires?: string;
  /** Set when the card has expired or been declined. */
  problem?: string;
}

export interface BillingInvoice {
  id: string;
  /** Machine-readable issue date. */
  at: string;
  /** Human label, e.g. "1 February 2026". */
  label: string;
  amount: string;
  status: InvoiceStatus;
  /** Where the PDF lives. Omit and the row has no download. */
  href?: string;
}

export interface BillingBlockProps {
  plan: BillingPlan;
  usage?: BillingUsage[];
  paymentMethod?: BillingPaymentMethod;
  invoices?: BillingInvoice[];
  onChangePlan?: () => void;
  onUpdatePaymentMethod?: () => void;
  /** Anything extra beside the heading. */
  actions?: ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Paid",
  open: "Open",
  "past-due": "Past due",
  refunded: "Refunded",
  void: "Void",
};

const STATUS_VARIANT: Record<InvoiceStatus, "success" | "secondary" | "destructive"> = {
  paid: "success",
  open: "secondary",
  "past-due": "destructive",
  refunded: "secondary",
  void: "secondary",
};

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * Where a metered resource stands, in words.
 *
 * The sentence is the accessible answer *and* the visible one. A bar alone
 * requires the reader to estimate a proportion from a length, which is the one
 * thing a progress bar is bad at.
 */
export function describeUsage(usage: BillingUsage): string {
  const format = usage.format ?? defaultFormat;
  const unit = usage.unit ? ` ${usage.unit}` : "";

  if (usage.limit === undefined) {
    return `${format(usage.used)}${unit} used`;
  }

  const remaining = usage.limit - usage.used;
  const base = `${format(usage.used)} of ${format(usage.limit)}${unit} used`;

  if (remaining < 0) {
    return `${base} — ${format(Math.abs(remaining))}${unit} over the limit`;
  }
  if (remaining === 0) {
    return `${base} — at the limit`;
  }
  return `${base} — ${format(remaining)}${unit} left`;
}

/**
 * Digits, spoken one at a time.
 *
 * "4242" is announced as "four thousand two hundred and forty-two", which is
 * not what the last four digits of a card are. Spacing them forces the digit
 * reading without changing what is on screen.
 */
function spellDigits(value: string): string {
  return value.split("").join(" ");
}

export function BillingBlock({
  plan,
  usage = [],
  paymentMethod,
  invoices = [],
  onChangePlan,
  onUpdatePaymentMethod,
  actions,
  className,
}: BillingBlockProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your plan, usage and invoices.</p>
        </div>
        {actions}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Plan</h2>
            </CardTitle>
            <CardDescription>What you are subscribed to.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">{plan.name}</span>
                {plan.cancelsAtPeriodEnd ? (
                  <Badge size="sm" variant="warning">
                    Ends at period end
                  </Badge>
                ) : null}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium tabular-nums">{plan.price}</span>
                {plan.interval ? (
                  <span className="text-muted-foreground"> {plan.interval}</span>
                ) : null}
              </p>
              {plan.renewsLabel ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.cancelsAtPeriodEnd ? "Access ends " : "Renews "}
                  <time dateTime={plan.renewsAt}>{plan.renewsLabel}</time>
                </p>
              ) : null}
            </div>
            {onChangePlan ? (
              <Button variant="outline" size="sm" onClick={onChangePlan}>
                Change plan
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Payment method</h2>
            </CardTitle>
            <CardDescription>How this subscription is charged.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-4">
            {paymentMethod ? (
              <div>
                <p className="text-sm font-medium">
                  {paymentMethod.brand}{" "}
                  {/* The visible text is unchanged; only the spoken form differs. */}
                  <span aria-hidden>•••• {paymentMethod.last4}</span>
                  <span className="sr-only">ending {spellDigits(paymentMethod.last4)}</span>
                </p>
                {paymentMethod.expires ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Expires {paymentMethod.expires}
                  </p>
                ) : null}
                {paymentMethod.problem ? (
                  <p className="mt-1 text-sm text-destructive">{paymentMethod.problem}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payment method on file.</p>
            )}
            {onUpdatePaymentMethod ? (
              <Button variant="outline" size="sm" onClick={onUpdatePaymentMethod}>
                {paymentMethod ? "Update" : "Add payment method"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {usage.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Usage</h2>
            </CardTitle>
            <CardDescription>This billing period.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {usage.map((entry) => {
              const format = entry.format ?? defaultFormat;
              const over = entry.limit !== undefined && entry.used > entry.limit;
              const percent =
                entry.limit === undefined || entry.limit === 0
                  ? undefined
                  : Math.min(100, (entry.used / entry.limit) * 100);
              const description = describeUsage(entry);

              return (
                <div key={entry.id} className="grid gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{entry.label}</span>
                    <span
                      className={cn(
                        "text-sm tabular-nums",
                        over ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {entry.limit === undefined
                        ? format(entry.used)
                        : `${format(entry.used)} / ${format(entry.limit)}`}
                    </span>
                  </div>

                  {percent === undefined ? null : (
                    <Progress
                      value={percent}
                      tone={over ? "destructive" : undefined}
                      // The bar is decoration for a fact already stated below
                      // it; announcing both would say the same thing twice.
                      aria-hidden
                    />
                  )}

                  <p
                    className={cn(
                      "text-xs",
                      over ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Invoices</h2>
          </CardTitle>
          <CardDescription>Everything charged to this account.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>No invoices yet</EmptyStateTitle>
              <EmptyStateDescription>
                The first one will appear here after your first billing period.
              </EmptyStateDescription>
            </EmptyState>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                Invoices, most recent first, with amount, status and a download for each
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Date</TableHead>
                  <TableHead scope="col">Amount</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Download</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableHead scope="row" className="font-normal text-foreground">
                      <time dateTime={invoice.at}>{invoice.label}</time>
                    </TableHead>
                    <TableCell className="tabular-nums">{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge size="sm" variant={STATUS_VARIANT[invoice.status]}>
                        {STATUS_LABEL[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.href ? (
                        <Button asChild variant="link" size="sm">
                          {/*
                            Named after the invoice, not just "Download". A
                            screen reader's links list shows nothing but the
                            names, and ten identical ones are ten dead ends.

                            An aria-label rather than visually-hidden text,
                            because the accessible name is computed by trimming
                            each text node before joining them — which ran
                            "Download" straight into the suffix. The label still
                            begins with the visible word, so voice control still
                            matches what is on screen.
                          */}
                          <a
                            href={invoice.href}
                            download
                            aria-label={`Download invoice for ${invoice.label}`}
                          >
                            Download
                          </a>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
