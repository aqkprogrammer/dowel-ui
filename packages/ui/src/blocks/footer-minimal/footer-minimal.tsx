"use client";

// Ported from SmoothUI Footer 4 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A one-row footer: the logo and copyright, a few links, and social links.
 *
 * The source fades the row up as it scrolls into view and draws an underline
 * under each link on hover. The fade is a CSS transition keyed off one
 * `data-reveal` state (only a footer that starts below the fold is hidden
 * first, never under reduced motion). The underline grows from the inline
 * start, so it runs the reading direction in RTL too, and it is also drawn on
 * keyboard focus — hover is not the only way to point at a link.
 */

const PREFIX = "dowel-footer-minimal";

const STYLES = `
[data-slot=footer-minimal][data-reveal] [data-slot=footer-minimal-row]{transition:opacity var(--duration-slow) var(--ease-out-quint),translate var(--duration-slow) var(--ease-out-quint)}
[data-slot=footer-minimal][data-reveal=pending] [data-slot=footer-minimal-row]{opacity:0;translate:0 0.625rem}
`;

export interface FooterLink {
  label: string;
  href: string;
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

export const DEFAULT_FOOTER_MINIMAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" },
  { label: "Contact", href: "#contact" },
];

export const DEFAULT_FOOTER_MINIMAL_SOCIAL: FooterSocialLink[] = [
  { label: "RSS", href: "#rss" },
  { label: "Community", href: "#community" },
];

export interface FooterMinimalBlockProps extends ComponentPropsWithRef<"footer"> {
  /** The logo, or the brand's name. */
  logo?: ReactNode;
  copyright?: ReactNode;
  links?: FooterLink[];
  social?: FooterSocialLink[];
  /** Accessible name of the link navigation. */
  navLabel?: string;
  /** Accessible name of the social links list. */
  socialLabel?: string;
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
        link.icon && "motion-safe:hover:scale-110 motion-safe:active:scale-95",
        focusRing,
      )}
    >
      {link.icon ? <span aria-hidden="true">{link.icon}</span> : null}
      <span className={link.icon ? "sr-only" : undefined}>{link.label}</span>
    </a>
  );
}

/** A one-row footer: logo and copyright, a few links, and social links. */
export function FooterMinimalBlock({
  logo = "Acme",
  copyright = "© Acme",
  links = DEFAULT_FOOTER_MINIMAL_LINKS,
  social = DEFAULT_FOOTER_MINIMAL_SOCIAL,
  navLabel = "Footer",
  socialLabel = "Social links",
  className,
  ref,
  ...props
}: FooterMinimalBlockProps) {
  const [node, reveal] = useReveal(ref);

  return (
    <footer
      ref={node}
      data-slot="footer-minimal"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("w-full border-t border-border bg-background", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="footer-minimal-row"
        className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-6 sm:px-6 md:flex-row"
      >
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-foreground">{logo}</div>
          {copyright ? (
            <>
              <span aria-hidden="true" className="h-4 w-px bg-border" />
              <p className="text-sm text-muted-foreground">{copyright}</p>
            </>
          ) : null}
        </div>

        {links.length > 0 ? (
          <nav aria-label={navLabel}>
            <ul className="flex flex-wrap items-center justify-center gap-6">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={cn(
                      "relative rounded-sm text-sm text-muted-foreground hover:text-foreground",
                      "transition-colors duration-[var(--duration-fast)]",
                      "after:absolute after:start-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-foreground",
                      "after:transition-[width] after:duration-[var(--duration-normal)] after:ease-[var(--ease-out-quint)]",
                      "hover:after:w-full focus-visible:after:w-full",
                      focusRing,
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {social.length > 0 ? (
          <ul aria-label={socialLabel} className="flex items-center gap-4">
            {social.map((link) => (
              <li key={link.label}>
                <SocialLink link={link} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  );
}
