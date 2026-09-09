import Link from "next/link";

import { branding } from "~/lib/branding";
import { commerceLinks } from "~/lib/commerce";

import { CreatedBy } from "./created-by";

/**
 * The same footer on every page.
 *
 * It was two footers before this: the full one on the home page, and a single
 * line of licence text on pricing, with every other page ending at whatever its
 * last section happened to be. That is the shape a site takes when the footer
 * is written inline — the first page gets the real one and nothing else gets
 * updated — and the cost is that the way out of a page depends on which page
 * you landed on.
 */
export function SiteFooter() {
  const links = commerceLinks();

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
        <span>MIT licensed. Built with {branding.libraryName}.</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs/private-registry" className="hover:text-foreground">
            Private registries
          </Link>
          <a href={links.contactUrl} className="hover:text-foreground">
            Contact
          </a>
          <a href={links.repositoryUrl} className="hover:text-foreground">
            GitHub
          </a>
          <a
            href={`https://www.npmjs.com/package/${branding.packageScope}/react`}
            className="hover:text-foreground"
          >
            npm
          </a>
          <Link href="/llms.txt" className="hover:text-foreground">
            llms.txt
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-4 flex max-w-5xl justify-end px-4">
        <CreatedBy />
      </div>
    </footer>
  );
}
