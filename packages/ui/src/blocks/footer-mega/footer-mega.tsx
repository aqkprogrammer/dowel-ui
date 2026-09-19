"use client";

// Ported from SmoothUI Footer 3 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type Ref,
} from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A mega footer: the logo and a line about the product, four columns of
 * links, and a newsletter sign-up across the top; the copyright and social
 * links along the bottom.
 *
 * The newsletter is a real form — a labelled email field and a submit button —
 * that validates the address, ties any error to the field, and confirms the
 * subscription in a status region. The source's candy button is Dowel's
 * `gradient` button. Its spring fade-up, staggered per group as the footer
 * scrolls in, is a CSS transition keyed off one `data-reveal` state, and
 * social icons scale on hover only under `motion-safe`.
 */

const PREFIX = "dowel-footer-mega";

const STYLES = `
[data-slot=footer-mega][data-reveal] [data-slot=footer-mega-part]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 50ms * var(--motion-scale,1))}
[data-slot=footer-mega][data-reveal=pending] [data-slot=footer-mega-part]{opacity:0;translate:0 1.25rem}
`;

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  /** The link's name. Shown as text unless an icon is given, then visually hidden. */
  label: string;
  href: string;
  /** Decorative; the label still names the link. */
  icon?: ReactNode;
  /** Opens in a new tab, and says so. */
  external?: boolean;
}

export interface FooterNewsletter {
  title: ReactNode;
  description?: ReactNode;
  /** The email field's label. Visually hidden; the placeholder is only a hint. */
  inputLabel?: string;
  placeholder?: string;
  buttonLabel?: string;
  /** Shown in a status region once subscribed. */
  successMessage?: string;
  /** Shown under the field when the address is not valid. */
  invalidMessage?: string;
}

export const DEFAULT_FOOTER_MEGA_GROUPS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#changelog" },
      { label: "Documentation", href: "#docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community", href: "#community" },
      { label: "Source code", href: "#source" },
      { label: "Help centre", href: "#help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "#privacy" },
      { label: "Terms of service", href: "#terms" },
      { label: "Cookie policy", href: "#cookies" },
    ],
  },
];

export const DEFAULT_FOOTER_MEGA_SOCIAL: FooterSocialLink[] = [
  { label: "RSS", href: "#rss" },
  { label: "Community", href: "#community" },
  { label: "Events", href: "#events" },
];

const DEFAULT_NEWSLETTER: FooterNewsletter = {
  title: "Subscribe to our newsletter",
  description: "Get the latest updates and news delivered to your inbox.",
};

export interface FooterMegaBlockProps extends ComponentPropsWithRef<"footer"> {
  /** The logo, or the brand's name. */
  logo?: ReactNode;
  description?: ReactNode;
  /** The sign-up form's text. `null` removes the form. */
  newsletter?: FooterNewsletter | null;
  /** Called with a valid email address on submit. */
  onSubscribe?: (email: string) => void;
  groups?: FooterLinkGroup[];
  social?: FooterSocialLink[];
  copyright?: ReactNode;
  /** Accessible name of the link navigation. */
  navLabel?: string;
  /** Accessible name of the social links list. */
  socialLabel?: string;
  /** Level of the newsletter's and each link group's heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Reveal = "static" | "pending" | "shown";

/** Hides the content only if it starts below the fold, and shows it once it scrolls in. */
function useReveal<T extends HTMLElement>(ref: Ref<T> | undefined) {
  const node = useRef<T>(null);
  // The consumer's ref, object or callback, gets the same element.
  useImperativeHandle(ref, () => node.current as T, []);
  const [reveal, setReveal] = useState<Reveal>("static");

  useEffect(() => {
    const element = node.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setReveal("pending");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setReveal("shown");
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [node, reveal] as const;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewsletterFormProps {
  newsletter: FooterNewsletter;
  onSubscribe?: (email: string) => void;
  headingLevel: number;
}

/** A labelled email sign-up that validates, and confirms in a status region. */
function NewsletterForm({ newsletter, onSubscribe, headingLevel }: NewsletterFormProps) {
  const {
    title,
    description,
    inputLabel = "Email address",
    placeholder = "Enter your email",
    buttonLabel = "Subscribe",
    successMessage = "Thanks — you are subscribed.",
    invalidMessage = "Enter a valid email address.",
  } = newsletter;
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "invalid" | "done">("idle");
  const Heading = `h${String(headingLevel)}` as "h2";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setState("invalid");
      return;
    }
    onSubscribe?.(value);
    setEmail("");
    setState("done");
  }

  return (
    <div data-slot="footer-mega-form">
      <Heading id={`${id}-title`} className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </Heading>
      {description ? <p className="mb-4 text-sm text-muted-foreground">{description}</p> : null}
      <form
        noValidate
        aria-labelledby={`${id}-title`}
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Label htmlFor={`${id}-email`} className="sr-only">
          {inputLabel}
        </Label>
        <Input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          placeholder={placeholder}
          aria-invalid={state === "invalid" || undefined}
          aria-describedby={state === "invalid" ? `${id}-error` : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state !== "idle") setState("idle");
          }}
          className="flex-1"
        />
        <Button type="submit" variant="gradient">
          {buttonLabel}
        </Button>
      </form>
      {state === "invalid" ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-destructive">
          {invalidMessage}
        </p>
      ) : null}
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        {state === "done" ? successMessage : ""}
      </p>
    </div>
  );
}

const linkClass = cn(
  "rounded-sm text-sm text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-primary",
  focusRing,
);

/** A link to a social profile, named in text whether or not it shows an icon. */
function SocialLink({ link }: { link: FooterSocialLink }) {
  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      // One string, so the warning is read as part of the name.
      aria-label={link.external ? `${link.label} (opens in a new tab)` : undefined}
      className={cn(
        "inline-flex items-center rounded-sm text-sm text-muted-foreground hover:text-primary [&_svg]:size-5",
        "transition-[color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        link.icon && "motion-safe:hover:scale-110 motion-safe:active:scale-90",
        focusRing,
      )}
    >
      {link.icon ? <span aria-hidden="true">{link.icon}</span> : null}
      <span className={link.icon ? "sr-only" : undefined}>{link.label}</span>
    </a>
  );
}

const part = (index: number) =>
  ({
    "data-slot": "footer-mega-part",
    style: { [`--${PREFIX}-index`]: index } as CSSProperties,
  }) as const;

/** A mega footer: logo, four link columns and a newsletter, over a copyright and social bar. */
export function FooterMegaBlock({
  logo = "Acme",
  description = "Accessible, animated React components for building modern interfaces with delightful interactions.",
  newsletter = DEFAULT_NEWSLETTER,
  onSubscribe,
  groups = DEFAULT_FOOTER_MEGA_GROUPS,
  social = DEFAULT_FOOTER_MEGA_SOCIAL,
  copyright = "© Acme. All rights reserved.",
  navLabel = "Footer",
  socialLabel = "Social links",
  headingLevel = 2,
  className,
  ref,
  ...props
}: FooterMegaBlockProps) {
  const [node, reveal] = useReveal(ref);
  const GroupHeading = `h${String(headingLevel)}` as "h2";

  return (
    <footer
      ref={node}
      data-slot="footer-mega"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("w-full border-t border-border bg-background", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div {...part(1)} className="lg:col-span-3">
            <div className="mb-4 text-2xl font-bold text-foreground">{logo}</div>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <nav
            aria-label={navLabel}
            className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-5"
          >
            {groups.map((group, index) => (
              <div key={group.title} {...part(index + 2)}>
                <GroupHeading className="mb-4 text-sm font-semibold tracking-wide text-foreground uppercase">
                  {group.title}
                </GroupHeading>
                <ul className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {newsletter ? (
            <div {...part(groups.length + 2)} className="lg:col-span-4">
              <NewsletterForm
                newsletter={newsletter}
                onSubscribe={onSubscribe}
                headingLevel={headingLevel}
              />
            </div>
          ) : null}
        </div>

        {copyright || social.length > 0 ? (
          <div
            {...part(groups.length + 3)}
            className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row"
          >
            {copyright ? (
              <p className="text-sm text-muted-foreground">{copyright}</p>
            ) : (
              <span />
            )}
            {social.length > 0 ? (
              <ul aria-label={socialLabel} className="flex flex-wrap gap-4">
                {social.map((link) => (
                  <li key={link.label}>
                    <SocialLink link={link} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
