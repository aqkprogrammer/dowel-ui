import Link from "next/link";

import { branding } from "~/lib/branding";
import { commerceLinks } from "~/lib/commerce";
import { FOOTER_NAV } from "~/lib/navigation";
import { version } from "~/lib/version.generated";

import { BrandMark } from "./brand-mark";
import { CreatedBy } from "./created-by";
import { CosmicBackground } from "./site/cosmic-background";

/**
 * The same footer on every page.
 *
 * It was two footers once — the full one on the home page and a line of
 * licence text on pricing, with every other page ending wherever its last
 * section did. The way out of a page should not depend on which page you
 * landed on, so there is one, and it carries the whole site map.
 */
export function SiteFooter() {
  const links = commerceLinks();
  const external = [
    { title: "GitHub", href: links.repositoryUrl },
    { title: "npm", href: `https://www.npmjs.com/package/${branding.packageScope}/react` },
    { title: "Contact", href: links.contactUrl },
  ];

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-[var(--hairline)]">
      {/* The sky again, upside down: the page ends where it began. */}
      <CosmicBackground intensity="subtle" seed={41} className="-z-10 rotate-180 opacity-70" />
      <div className="mx-auto grid max-w-[88rem] gap-12 px-4 pt-16 pb-10 sm:px-6 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            <BrandMark size={22} />
            {branding.libraryName}
          </Link>
          <p className="mt-4 text-sm text-pretty text-muted-foreground">
            Source-first UI infrastructure for React. Components, blocks and themes you install
            as code — and own from then on.
          </p>
          <p className="mt-6 font-mono text-[0.6875rem] text-muted-foreground">
            v{version} · MIT licensed
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_NAV.map((section) => (
            <div key={section.label}>
              <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
                {section.label}
              </p>
              <ul className="mt-4 grid gap-2.5 text-sm">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
              Elsewhere
            </p>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {external.map((item) => (
                <li key={item.title}>
                  <a
                    href={item.href}
                    className="rounded text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] px-4 py-5 text-xs text-muted-foreground sm:px-6">
        <span>
          © {new Date().getFullYear()} {branding.libraryName}. Built with {branding.libraryName}
          .
        </span>
        <CreatedBy />
      </div>
    </footer>
  );
}
