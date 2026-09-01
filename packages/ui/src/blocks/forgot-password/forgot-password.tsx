"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Form, FormControl, FormField, FormLabel, FormMessage } from "@/components/form";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

/**
 * A password reset request.
 *
 * The confirmation deliberately does not say whether the address was found.
 * Telling an anonymous visitor which emails have accounts turns this form into
 * an account enumeration oracle, and the same neutral message covers both cases
 * without being a lie.
 */

export interface ForgotPasswordBlockProps {
  onSubmit?: (values: { email: string }) => void;
  /** Switches to the confirmation view. */
  sent?: boolean;
  error?: string;
  pending?: boolean;
  loginHref?: string;
  className?: string;
}

export function ForgotPasswordBlock({
  onSubmit,
  sent = false,
  error,
  pending = false,
  loginHref = "/login",
  className,
}: ForgotPasswordBlockProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const emailError =
    touched && !email.includes("@") ? "Enter a valid email address." : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!email.includes("@")) return;
    onSubmit?.({ email });
  }

  if (sent) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <CardContent className="pt-6">
          {/* Announced, because it replaces the form the user just submitted. */}
          <EmptyState role="status" aria-live="polite">
            <EmptyStateIcon>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="m3 7 9 6 9-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </EmptyStateIcon>
            <EmptyStateTitle>Check your inbox</EmptyStateTitle>
            <EmptyStateDescription>
              If an account exists for {email}, a reset link is on its way. It expires in an
              hour.
            </EmptyStateDescription>
          </EmptyState>
        </CardContent>
        <CardFooter className="justify-center">
          <a
            href={loginHref}
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Back to sign in
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the address you signed up with and we will send you a link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form onSubmit={handleSubmit} className="gap-4">
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <FormField name="email" error={emailError}>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                disabled={pending}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormField>

          <Button type="submit" loading={pending} className="w-full">
            Send reset link
          </Button>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <a
          href={loginHref}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to sign in
        </a>
      </CardFooter>
    </Card>
  );
}
