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
import { Form, FormControl, FormField, FormLabel, FormMessage } from "@/components/form";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Separator } from "@/components/separator";
import { cn } from "@/lib/utils";

/**
 * A sign-in form.
 *
 * Wired for the parts that are easy to get wrong rather than left as markup:
 * the email field is typed and autocompleted correctly, errors are announced,
 * and the submit button reports its own busy state instead of leaving people
 * wondering whether the click registered.
 *
 * Validation here is the minimum that makes the form usable offline. Real
 * validation belongs to whatever the form is submitted to — pass `error` for a
 * server response.
 */

export interface LoginBlockProps {
  /** Called with the submitted credentials. */
  onSubmit?: (values: { email: string; password: string; remember: boolean }) => void;
  /** A server-side error, shown above the fields. */
  error?: string;
  /** Disables the form and shows the submit button as busy. */
  pending?: boolean;
  /** Where "Forgot password?" goes. */
  forgotHref?: string;
  /** Where "Create an account" goes. */
  signupHref?: string;
  className?: string;
}

export function LoginBlock({
  onSubmit,
  error,
  pending = false,
  forgotHref = "/forgot-password",
  signupHref = "/signup",
  className,
}: LoginBlockProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError =
    touched && !email.includes("@") ? "Enter a valid email address." : undefined;
  const passwordError = touched && password.length === 0 ? "Enter your password." : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!email.includes("@") || password.length === 0) return;
    onSubmit?.({ email, password, remember });
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
      </CardHeader>

      <CardContent>
        <Form onSubmit={handleSubmit} className="gap-4">
          {/* A server error is assertive: it arrived after the user acted, and
              it is the reason nothing happened. */}
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

          <FormField name="password" error={passwordError}>
            <div className="flex items-center justify-between">
              <FormLabel>Password</FormLabel>
              <a
                href={forgotHref}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </a>
            </div>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={pending}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormField>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={remember}
              disabled={pending}
              onCheckedChange={(checked) => {
                setRemember(checked === true);
              }}
            />
            <Label htmlFor="remember-me" className="text-sm font-normal">
              Keep me signed in
            </Label>
          </div>

          <Button type="submit" loading={pending} className="w-full">
            Sign in
          </Button>
        </Form>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-2xs text-muted-foreground uppercase">or</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-2">
          <Button variant="outline" className="w-full" disabled={pending}>
            Continue with GitHub
          </Button>
          <Button variant="outline" className="w-full" disabled={pending}>
            Continue with Google
          </Button>
        </div>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&rsquo;t have an account?{" "}
          <a
            href={signupHref}
            className="font-medium text-primary underline underline-offset-4"
          >
            Create one
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
