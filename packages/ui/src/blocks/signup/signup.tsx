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
import { Checkbox } from "@/components/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/form";
import { Input } from "@/components/input";
import { Progress } from "@/components/progress";
import { cn } from "@/lib/utils";

/**
 * An account creation form.
 *
 * The password strength meter is the interesting part. It is a hint, not a
 * gate: the requirement is a length minimum, and the meter tells people how
 * they are doing without inventing rules about symbols that push everyone
 * towards the same predictable substitutions.
 */

export interface SignupBlockProps {
  onSubmit?: (values: { name: string; email: string; password: string }) => void;
  error?: string;
  pending?: boolean;
  loginHref?: string;
  /** Minimum password length. Length is the requirement that actually helps. */
  minPasswordLength?: number;
  className?: string;
}

interface Strength {
  score: number;
  label: string;
  tone: "destructive" | "warning" | "success";
}

/**
 * A rough strength estimate.
 *
 * Deliberately crude, and deliberately not a validation rule. Its only job is
 * to nudge; the form is gated on length alone.
 */
export function estimatePasswordStrength(password: string, minLength: number): Strength {
  if (password.length === 0)
    return { score: 0, label: "Enter a password", tone: "destructive" };

  let score = Math.min(60, (password.length / (minLength * 2)) * 60);
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 10;
  if (/[^\w\s]/.test(password)) score += 15;

  const rounded = Math.min(100, Math.round(score));
  if (password.length < minLength)
    return { score: rounded, label: "Too short", tone: "destructive" };
  if (rounded < 60) return { score: rounded, label: "Weak", tone: "warning" };
  if (rounded < 85) return { score: rounded, label: "Good", tone: "success" };
  return { score: rounded, label: "Strong", tone: "success" };
}

export function SignupBlock({
  onSubmit,
  error,
  pending = false,
  loginHref = "/login",
  minPasswordLength = 12,
  className,
}: SignupBlockProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);

  const strength = estimatePasswordStrength(password, minPasswordLength);
  const emailError =
    touched && !email.includes("@") ? "Enter a valid email address." : undefined;
  const passwordError =
    touched && password.length < minPasswordLength
      ? `Use at least ${String(minPasswordLength)} characters.`
      : undefined;
  const termsError = touched && !accepted ? "Accept the terms to continue." : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!email.includes("@") || password.length < minPasswordLength || !accepted) return;
    onSubmit?.({ name, email, password });
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start building in a couple of minutes.</CardDescription>
      </CardHeader>

      <CardContent>
        <Form onSubmit={handleSubmit} className="gap-4">
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <FormField name="name">
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={name}
                disabled={pending}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </FormControl>
          </FormField>

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

          <FormField name="password" error={passwordError}>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                disabled={pending}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            </FormControl>
            <FormDescription>At least {minPasswordLength} characters.</FormDescription>
            <FormMessage />
          </FormField>

          {password.length > 0 ? (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength</span>
                <span
                  className={cn(
                    strength.tone === "success"
                      ? "text-success"
                      : strength.tone === "warning"
                        ? "text-warning"
                        : "text-destructive",
                  )}
                >
                  {strength.label}
                </span>
              </div>
              {/* The label above already says the strength, so the bar is a
                  summary rather than a second thing to read. */}
              <Progress
                value={strength.score}
                size="sm"
                tone={
                  strength.tone === "success"
                    ? "success"
                    : strength.tone === "warning"
                      ? "warning"
                      : "destructive"
                }
                aria-hidden="true"
              />
            </div>
          ) : null}

          <FormField name="terms" error={termsError}>
            <div className="flex items-start gap-2">
              <FormControl>
                <Checkbox
                  className="mt-0.5"
                  checked={accepted}
                  disabled={pending}
                  onCheckedChange={(checked) => {
                    setAccepted(checked === true);
                  }}
                />
              </FormControl>
              {/* FormLabel, not a Label with a guessed htmlFor: the field
                  generates the control's id, so anything hard-coded points at
                  nothing and leaves the checkbox unnamed. */}
              <FormLabel className="text-sm leading-snug font-normal">
                I agree to the terms of service and privacy policy.
              </FormLabel>
            </div>
            <FormMessage />
          </FormField>

          <Button type="submit" loading={pending} className="w-full">
            Create account
          </Button>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href={loginHref} className="font-medium text-primary underline underline-offset-4">
            Sign in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
