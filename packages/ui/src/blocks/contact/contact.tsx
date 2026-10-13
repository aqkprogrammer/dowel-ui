"use client";

// Original design.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
} from "react";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Form, FormControl, FormField, FormLabel, FormMessage } from "@/components/form";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { RadioGroup, RadioGroupItem } from "@/components/radio-group";
import { Textarea } from "@/components/textarea";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A contact page section: how to reach the team on the start side, a form on
 * the end side.
 *
 * The details are a description list with real mailto:, tel: and <address>.
 * The form checks itself on submit — never while someone is still typing —
 * marks what is wrong in words beside each field, and moves focus to the
 * first problem. While it sends, the button says so; when it is sent, the
 * form gives way to a confirmation that takes focus, so a screen reader
 * hears it. A failure from `onSubmit` is shown above the form and keeps
 * everything that was typed.
 */

export interface ContactValues {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

export interface ContactDetail {
  label: string;
  value: string;
  /** mailto:, tel: or any link. Plain text without one. */
  href?: string;
  /** Render as a postal address. */
  address?: boolean;
}

export interface ContactBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title" | "onSubmit"
> {
  title?: string;
  description?: string;
  details?: ContactDetail[];
  /** What people can write about. An empty list hides the choice. */
  topics?: string[];
  /** Sends the message. Throw (or reject) to show an error and keep the form. */
  onSubmit?: (values: ContactValues) => void | Promise<void>;
  /** Shown once the message is sent. */
  successMessage?: string;
  /** The headline's level. */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
}

const DEFAULT_DETAILS: ContactDetail[] = [
  { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" },
  { label: "Phone", value: "+44 20 7946 0000", href: "tel:+442079460000" },
  { label: "Office", value: "1 Example Street\nLondon EC1A 1AA", address: true },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<keyof ContactValues, string>>;

function validate(values: ContactValues, needsTopic: boolean): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL.test(values.email.trim()))
    errors.email = "Enter an email address like name@example.com.";
  if (needsTopic && !values.topic) errors.topic = "Choose what this is about.";
  if (values.message.trim().length < 10)
    errors.message = "Write at least a sentence, so we can help.";
  return errors;
}

/** How to reach the team, and a form that checks itself, sends, and confirms. */
export function ContactBlock({
  title = "Get in touch",
  description = "Questions about plans, a bug, or a partnership — we reply within one working day.",
  details = DEFAULT_DETAILS,
  topics = ["Sales", "Support", "Partnerships"],
  onSubmit,
  successMessage = "Thanks — your message is on its way. We'll reply by email within one working day.",
  headingLevel = 2,
  className,
  ...props
}: ContactBlockProps) {
  const headingId = useId();
  const topicLabelId = useId();
  const topicErrorId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const SubHeading = `h${String(headingLevel + 1)}` as `h${2 | 3 | 4 | 5 | 6}`;
  const [values, setValues] = useState<ContactValues>({
    name: "",
    email: "",
    company: "",
    topic: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // A fresh object each submit, so the same field is focused again on a second try.
  const [focusRequest, setFocusRequest] = useState<{ field: keyof ContactValues } | null>(null);

  // The confirmation takes focus as it appears, so it is heard. Stable, so
  // it runs once on mount rather than on every render.
  const focusOnMount = useCallback((node: HTMLElement | null) => {
    node?.focus();
  }, []);

  // After a failed check renders, move focus to the first problem.
  useEffect(() => {
    if (!focusRequest) return;
    const { field } = focusRequest;
    form.current
      ?.querySelector<HTMLElement>(field === "topic" ? '[role="radio"]' : `[name="${field}"]`)
      ?.focus();
  }, [focusRequest]);

  const set = (field: keyof ContactValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as it is edited; re-check on the next submit.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values, topics.length > 0);
    setErrors(found);
    setFailure(null);
    const first = (Object.keys(found) as (keyof ContactValues)[])[0];
    if (first) {
      // Focused once React has rendered the messages (see the effect below).
      setFocusRequest({ field: first });
      return;
    }
    setPending(true);
    try {
      await onSubmit?.(values);
      setSent(true);
    } catch (cause) {
      setFailure(
        cause instanceof Error && cause.message
          ? cause.message
          : "Your message couldn't be sent. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="contact"
      className={cn("px-4 py-16 sm:px-6 md:py-24", className)}
      {...props}
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Heading
              id={headingId}
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {title}
            </Heading>
            {description ? <p className="text-muted-foreground">{description}</p> : null}
          </div>
          {details.length > 0 ? (
            <dl className="flex flex-col gap-5">
              {details.map((detail) => (
                <div key={detail.label} className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">{detail.label}</dt>
                  <dd className="text-foreground">
                    {detail.address ? (
                      <address className="whitespace-pre-line not-italic">
                        {detail.value}
                      </address>
                    ) : detail.href ? (
                      <a
                        href={detail.href}
                        className={cn(
                          "rounded-sm underline-offset-4 hover:underline",
                          focusRing,
                        )}
                      >
                        {detail.value}
                      </a>
                    ) : (
                      detail.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <Card className="p-6 sm:p-8">
          {sent ? (
            <div
              ref={focusOnMount}
              tabIndex={-1}
              role="status"
              data-slot="contact-sent"
              className="flex flex-col items-start gap-3 rounded-md outline-none"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-success/15 text-success"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
              <SubHeading className="text-lg font-semibold text-foreground">
                Message sent
              </SubHeading>
              <p className="text-muted-foreground">{successMessage}</p>
            </div>
          ) : (
            <Form
              ref={form}
              onSubmit={(event) => void handleSubmit(event)}
              className="gap-5"
              aria-label="Contact form"
            >
              {failure ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {failure}
                </p>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField name="name" error={errors.name}>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      name="name"
                      autoComplete="name"
                      value={values.name}
                      disabled={pending}
                      onChange={(event) => {
                        set("name")(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
                <FormField name="email" error={errors.email}>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={values.email}
                      disabled={pending}
                      onChange={(event) => {
                        set("email")(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
              </div>
              <FormField name="company">
                <FormLabel>
                  Company <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    name="company"
                    autoComplete="organization"
                    value={values.company}
                    disabled={pending}
                    onChange={(event) => {
                      set("company")(event.target.value);
                    }}
                  />
                </FormControl>
              </FormField>
              {topics.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span id={topicLabelId} className="text-sm font-medium text-foreground">
                    What is it about?
                  </span>
                  <RadioGroup
                    aria-labelledby={topicLabelId}
                    aria-describedby={errors.topic ? topicErrorId : undefined}
                    aria-invalid={errors.topic ? true : undefined}
                    value={values.topic}
                    disabled={pending}
                    onValueChange={set("topic")}
                    className="flex flex-wrap gap-x-5 gap-y-2"
                  >
                    {topics.map((topic) => {
                      const id = `${topicLabelId}-${topic}`;
                      return (
                        <div key={topic} className="flex items-center gap-2">
                          <RadioGroupItem
                            id={id}
                            value={topic}
                            aria-invalid={errors.topic ? true : undefined}
                          />
                          <Label htmlFor={id} className="font-normal">
                            {topic}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {errors.topic ? (
                    <p id={topicErrorId} className="text-sm text-destructive">
                      {errors.topic}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <FormField name="message" error={errors.message}>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    name="message"
                    rows={5}
                    value={values.message}
                    disabled={pending}
                    onChange={(event) => {
                      set("message")(event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
              <Button type="submit" loading={pending} className="justify-self-start">
                {pending ? "Sending…" : "Send message"}
              </Button>
            </Form>
          )}
        </Card>
      </div>
    </section>
  );
}
