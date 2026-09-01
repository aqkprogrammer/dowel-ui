"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Label } from "@/components/label";
import { Switch } from "@/components/switch";
import { cn } from "@/lib/utils";

/**
 * A pricing section.
 *
 * The billing-period toggle is the part that usually goes wrong. It changes
 * every price on the page at once, which is a large change nobody asked for in
 * words — so the prices update in place and the change is announced, rather
 * than silently rewriting the page under the reader.
 */

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  /** Monthly price in whole currency units. `null` means "talk to us". */
  monthly: number | null;
  /** Yearly price per month. Omit to bill yearly at the monthly rate. */
  yearlyPerMonth?: number;
  features: string[];
  /** Marks the recommended plan. At most one. */
  featured?: boolean;
  cta?: string;
  onSelect?: () => void;
}

export interface PricingBlockProps {
  title?: string;
  description?: string;
  plans: PricingPlan[];
  currency?: string;
  /** Shows the monthly/yearly toggle. */
  showPeriodToggle?: boolean;
  footnote?: ReactNode;
  className?: string;
}

export function PricingBlock({
  title = "Pricing",
  description = "Start free. Upgrade when you need to.",
  plans,
  currency = "$",
  showPeriodToggle = true,
  footnote,
  className,
}: PricingBlockProps) {
  const [yearly, setYearly] = useState(false);

  function priceOf(plan: PricingPlan): { amount: string; suffix: string } {
    if (plan.monthly === null) return { amount: "Custom", suffix: "" };
    const value = yearly ? (plan.yearlyPerMonth ?? plan.monthly) : plan.monthly;
    return { amount: `${currency}${String(value)}`, suffix: "/month" };
  }

  return (
    <section aria-labelledby="pricing-heading" className={cn("flex flex-col gap-8", className)}>
      <div className="text-center">
        <h2 id="pricing-heading" className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-pretty text-muted-foreground">{description}</p>

        {showPeriodToggle ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Label htmlFor="billing-period" className="text-sm font-normal">
              Monthly
            </Label>
            <Switch
              id="billing-period"
              checked={yearly}
              onCheckedChange={setYearly}
              aria-label="Bill yearly"
            />
            <Label htmlFor="billing-period" className="text-sm font-normal">
              Yearly
            </Label>
            <Badge size="sm" variant="success">
              Save 20%
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Every price on the page changes at once, which is a big change nobody
          asked for out loud. Announcing it politely is the difference between a
          helpful toggle and the page silently rewriting itself. */}
      <p aria-live="polite" className="sr-only">
        Showing {yearly ? "yearly" : "monthly"} pricing.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price = priceOf(plan);

          return (
            <Card
              key={plan.id}
              className={cn("flex flex-col", plan.featured && "border-primary shadow-lg")}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.featured ? <Badge size="sm">Recommended</Badge> : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums">{price.amount}</span>
                  {price.suffix ? (
                    <span className="text-sm text-muted-foreground">{price.suffix}</span>
                  ) : null}
                </p>
                {yearly && plan.monthly !== null && plan.yearlyPerMonth !== undefined ? (
                  <p className="text-xs text-muted-foreground">Billed yearly.</p>
                ) : null}
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-success"
                      >
                        <path
                          d="m5 13 4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.featured ? "primary" : "outline"}
                  onClick={plan.onSelect}
                >
                  {plan.cta ?? `Choose ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {footnote ? (
        <p className="text-center text-xs text-muted-foreground">{footnote}</p>
      ) : null}
    </section>
  );
}
