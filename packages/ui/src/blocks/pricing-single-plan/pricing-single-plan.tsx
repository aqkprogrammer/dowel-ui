"use client";

// Ported from SmoothUI Pricing 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Label } from "@/components/label";
import { PriceFlow } from "@/components/number-flow";
import { RadioGroup, RadioGroupItem } from "@/components/radio-group";
import { cn } from "@/lib/utils";

/*
 * One plan with every feature, under a monthly/annual switch.
 *
 * The switch is a segmented control: a radio group whose pill slides between
 * the two options. Changing it rewrites the price, so, as in Dowel's `pricing`
 * block, the change is announced politely, and the price rolls to its new
 * value through Price Flow rather than the source's hand-rolled digit reels.
 * The call to action carries the plan's name. The card rises in on mount; the
 * reduced-motion scale collapses it, and the pill and the digits settle
 * instantly.
 */

const PREFIX = "dowel-pricing-single-plan";

const STYLES = `
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 2.5rem}}
[data-slot=pricing-single-plan-card]{animation:${PREFIX}-rise var(--duration-slow) var(--ease-out-quint) both}
`;

export type BillingPeriod = "monthly" | "yearly";

export interface PricingTierPlan {
  id: string;
  name: string;
  /** A short line after the price, e.g. "Best for teams". */
  tagline?: string;
  description?: ReactNode;
  /** Monthly price in whole currency units. `null` means a custom price. */
  monthly: number | null;
  /** Price per month when billed yearly. Omit to bill yearly at the monthly rate. */
  yearly?: number;
  features: string[];
  /** Adds a badge and a highlighted border. */
  featured?: boolean;
  /** The call to action: a link when it has an `href`, otherwise a button. */
  cta: { label: string; href?: string; onSelect?: () => void };
}

export interface PricingSinglePlanLabels {
  /** Names the billing-period control. */
  period: string;
  monthly: string;
  yearly: string;
  /** Badge on the featured plan. */
  featured: string;
  /** Shown in place of a price when `monthly` is null. */
  custom: string;
  perMonth: string;
  perMonthBilledYearly: string;
  /** Introduces each plan's feature list. */
  included: string;
  /** Appended, visually hidden, to each call to action. */
  planSuffix: (plan: string) => string;
  /** Announced when the period changes. */
  announce: (period: BillingPeriod) => string;
}

const DEFAULT_LABELS: PricingSinglePlanLabels = {
  period: "Billing period",
  monthly: "Monthly",
  yearly: "Annually",
  featured: "Most popular",
  custom: "Custom",
  perMonth: "per month",
  perMonthBilledYearly: "per month, billed yearly",
  included: "What’s included:",
  planSuffix: (plan) => `, ${plan} plan`,
  announce: (period) => `Showing ${period} pricing.`,
};

export const DEFAULT_PRICING_SINGLE_PLAN_PLAN: PricingTierPlan = {
  id: "pro",
  name: "Pro",
  tagline: "Perfect for individuals",
  description:
    "Everything you need to build and deploy your applications. Simple, powerful and affordable.",
  monthly: 19,
  yearly: 15,
  features: [
    "Unlimited projects",
    "Email support",
    "All features",
    "Advanced analytics",
    "Team collaboration",
    "Custom domains",
    "Priority updates",
    "API access",
  ],
  cta: { label: "Get started", href: "#get-started" },
};

export interface PricingSinglePlanBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  plan?: PricingTierPlan;
  /** A note under the period control, e.g. what annual billing saves. */
  savings?: ReactNode;
  /** ISO 4217 code, formatted by Intl.NumberFormat. */
  currency?: string;
  /** Formatting locale. Defaults to the reader's. */
  locale?: Intl.LocalesArgument;
  /** Controlled billing period. */
  period?: BillingPeriod;
  /** Initial billing period when uncontrolled. */
  defaultPeriod?: BillingPeriod;
  onPeriodChange?: (period: BillingPeriod) => void;
  /** Shows the monthly/annual control. */
  showPeriodToggle?: boolean;
  /** Visible and announced text, for localisation. */
  labels?: Partial<PricingSinglePlanLabels>;
  /** Level of the section heading; the plan name is one level below. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const PERIODS: BillingPeriod[] = ["monthly", "yearly"];

/** A segmented monthly/annual control: a radio group with a sliding pill. */
function PeriodControl({
  period,
  onChange,
  labels,
}: {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  labels: PricingSinglePlanLabels;
}) {
  return (
    <RadioGroup
      value={period}
      onValueChange={(value) => {
        onChange(value as BillingPeriod);
      }}
      orientation="horizontal"
      aria-label={labels.period}
      data-slot="pricing-single-plan-period"
      className="relative mx-auto grid w-fit grid-cols-2 gap-0 rounded-full border border-border bg-background p-1"
    >
      <span
        aria-hidden="true"
        data-period={period}
        className={cn(
          "pointer-events-none absolute inset-y-1 start-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm",
          "transition-[inset-inline-start] duration-[var(--duration-slower)] ease-[var(--ease-in-out-quint)]",
          "data-[period=yearly]:start-1/2",
        )}
      />
      {PERIODS.map((value) => (
        <Label
          key={value}
          data-active={period === value || undefined}
          className={cn(
            "relative h-8 min-w-24 cursor-pointer justify-center rounded-full px-4 text-sm font-normal text-foreground",
            "transition-colors duration-[var(--duration-slow)] hover:opacity-75",
            "data-[active]:font-medium data-[active]:text-primary-foreground",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/55 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
          )}
        >
          {/* Covers the label, invisibly: the label draws the option and names the radio. */}
          <RadioGroupItem
            value={value}
            className="absolute inset-0 aspect-auto size-full rounded-full border-0 bg-transparent opacity-0 shadow-none"
          />
          <span className="relative">{labels[value]}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

/** A tick in a filled circle. Decorative: the feature's text carries the meaning. */
function Tick() {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-2.5">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
        />
      </svg>
    </span>
  );
}

/** One plan with every feature, under a monthly/annual switch, with a price that rolls. */
export function PricingSinglePlanBlock({
  heading = "Simple pricing for everyone",
  description = "One plan, all features. No hidden fees, no complicated tiers.",
  plan = DEFAULT_PRICING_SINGLE_PLAN_PLAN,
  savings = (
    <>
      <span className="font-medium text-primary">Save 20%</span> on annual billing
    </>
  ),
  currency = "EUR",
  locale,
  period: periodProp,
  defaultPeriod = "yearly",
  onPeriodChange,
  showPeriodToggle = true,
  labels: labelsProp,
  headingLevel = 2,
  className,
  ...props
}: PricingSinglePlanBlockProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const headingId = useId();
  const listId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultPeriod);
  const period = periodProp ?? uncontrolled;
  const Heading = `h${String(headingLevel)}` as "h2";
  const PlanHeading = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";

  const price =
    plan.monthly === null
      ? null
      : period === "yearly"
        ? (plan.yearly ?? plan.monthly)
        : plan.monthly;
  const cta = (
    <>
      {plan.cta.label}
      <span className="sr-only">{labels.planSuffix(plan.name)}</span>
    </>
  );

  function changePeriod(next: BillingPeriod) {
    if (periodProp === undefined) setUncontrolled(next);
    onPeriodChange?.(next);
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="pricing-single-plan"
      className={cn("w-full bg-muted/50 py-16 md:py-32", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Heading
            id={headingId}
            className="text-3xl font-bold text-balance md:text-4xl lg:text-5xl lg:tracking-tight"
          >
            {heading}
          </Heading>
          {description ? (
            <p className="mx-auto mt-4 max-w-xl text-lg text-balance text-muted-foreground">
              {description}
            </p>
          ) : null}
          {showPeriodToggle ? (
            <div className="my-12">
              <PeriodControl period={period} onChange={changePeriod} labels={labels} />
              {savings ? <p className="mt-3 text-center text-xs">{savings}</p> : null}
            </div>
          ) : (
            <div className="my-8" />
          )}
        </div>

        {/* Every price changes at once, which nobody asked for out loud. */}
        <p aria-live="polite" className="sr-only">
          {labels.announce(period)}
        </p>

        <Card
          data-slot="pricing-single-plan-card"
          data-featured={plan.featured || undefined}
          className={cn(
            "relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8",
            plan.featured && "border-primary shadow-lg ring-1 ring-primary",
          )}
        >
          <span
            aria-hidden="true"
            className="absolute end-0 top-0 h-4 w-32 rounded-es-2xl bg-linear-to-r from-primary via-info to-success"
          />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PlanHeading className="text-2xl font-bold text-foreground">
              {plan.name}
            </PlanHeading>
            {plan.featured ? <Badge size="sm">{labels.featured}</Badge> : null}
          </div>

          <div className="mb-6">
            <p className="flex flex-wrap items-baseline gap-x-2">
              {price === null ? (
                <span className="text-3xl font-semibold text-foreground">{labels.custom}</span>
              ) : (
                <PriceFlow
                  value={price}
                  locales={locale}
                  format={{ style: "currency", currency, maximumFractionDigits: 0 }}
                  className="text-3xl font-semibold text-foreground"
                />
              )}
              {plan.tagline ? (
                <>
                  <span aria-hidden="true" className="text-muted-foreground">
                    •
                  </span>
                  <span className="text-muted-foreground">{plan.tagline}</span>
                </>
              ) : null}
            </p>
            {price === null ? null : (
              <p className="mt-1 text-xs text-muted-foreground">
                {period === "yearly" && plan.yearly !== undefined
                  ? labels.perMonthBilledYearly
                  : labels.perMonth}
              </p>
            )}
          </div>

          {plan.cta.href ? (
            <Button asChild variant="gradient" className="mb-6 w-full">
              <a href={plan.cta.href}>{cta}</a>
            </Button>
          ) : (
            <Button variant="gradient" className="mb-6 w-full" onClick={plan.cta.onSelect}>
              {cta}
            </Button>
          )}

          {plan.description ? (
            <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
              {plan.description}
            </p>
          ) : null}

          <p
            id={`${listId}-${plan.id}`}
            className="mb-4 text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            {labels.included}
          </p>
          <ul aria-labelledby={`${listId}-${plan.id}`} className="flex flex-col gap-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                <Tick />
                {feature}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
