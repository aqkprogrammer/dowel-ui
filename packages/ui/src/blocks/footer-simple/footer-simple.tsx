"use client";

// Ported from SmoothUI Footer 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A site footer: the brand, a line about it and social links on one side,
 * three columns of links on the other, and the copyright underneath.
 *
 * The source fades each group up in turn as the footer scrolls into view, and
 * scales social icons on hover. Both are CSS here: a transition keyed off one
 * `data-reveal` state (only a footer that starts below the fold is hidden
 * first, never under reduced motion), and a hover scale gated on
 * `motion-safe`. Social links carry their names as text — an icon is optional
 * decoration, never the only label.
 */

const PREFIX = "dowel-footer-simple";

const STYLES = `
[data-slot=footer-simple][data-reveal] [data-slot=footer-simple-part]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1))}
[data-slot=footer-simple][data-reveal=pending] [data-slot=footer-simple-part]{opacity:0;translate:0 1.25rem}
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

export const DEFAULT_FOOTER_SIMPLE_GROUPS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Documentation", href: "#docs" },
      { label: "API", href: "#api" },
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
    title: "Support",
    links: [
      { label: "Help centre", href: "#help" },
      { label: "Community", href: "#community" },
      { label: "Status", href: "#status" },
      { label: "Security", href: "#security" },
    ],
  },
];

export const DEFAULT_FOOTER_SIMPLE_SOCIAL: FooterSocialLink[] = [
  { label: "Newsletter", href: "#newsletter" },
  { label: "RSS", href: "#rss" },
  { label: "Community", href: "#community" },
];

export interface FooterSimpleBlockProps extends ComponentPropsWithRef<"footer"> {
  /** The brand: a name or a logo. */
  brand?: ReactNode;
  description?: ReactNode;
  groups?: FooterLinkGroup[];
  social?: FooterSocialLink[];
  copyright?: ReactNode;
  /** Accessible name of the link navigation. */
  navLabel?: string;
  /** Accessible name of the social links list. */
  socialLabel?: string;
  /** Level of each link group's heading. */
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
      // One string, so the warning is read as part of the name rather than
      // run into it ("Forum(opens…").
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
    "data-slot": "footer-simple-part",
    style: { [`--${PREFIX}-index`]: index } as CSSProperties,
  }) as const;

/** A footer with the brand and social links beside three columns of links. */
export function FooterSimpleBlock({
  brand = "Acme",
  description = "Build beautiful interfaces, effortlessly.",
  groups = DEFAULT_FOOTER_SIMPLE_GROUPS,
  social = DEFAULT_FOOTER_SIMPLE_SOCIAL,
  copyright = "© Acme. All rights reserved.",
  navLabel = "Footer",
  socialLabel = "Social links",
  headingLevel = 2,
  className,
  ref,
  ...props
}: FooterSimpleBlockProps) {
  const [node, reveal] = useReveal(ref);
  const GroupHeading = `h${String(headingLevel)}` as "h2";

  return (
    <footer
      ref={node}
      data-slot="footer-simple"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("w-full border-t border-border bg-background", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div {...part(1)} className="lg:col-span-2">
            <div className="mb-4 text-2xl font-bold text-foreground">{brand}</div>
            {description ? (
              <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
            ) : null}
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

          <nav
            aria-label={navLabel}
            className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-3"
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
        </div>

        {copyright ? (
          <div
            {...part(groups.length + 2)}
            className="mt-12 border-t border-border pt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">{copyright}</p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
