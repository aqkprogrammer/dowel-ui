import { branding } from "./branding";

/**
 * Where the pricing page sends people.
 *
 * Environment, not code, because these are addresses that change without a
 * release: the checkout lives with the merchant of record, and the contact
 * address is whatever the business is using this quarter. Neither is a secret,
 * and neither belongs in git.
 *
 * Unset means the page says so honestly — "opening soon", with the repository
 * to watch — rather than a button that goes nowhere. A pricing page with a dead
 * Buy button is a page that tells everyone the product is not real.
 */
export interface CommerceLinks {
  /** The Pro checkout. Absent until the store is configured. */
  checkoutUrl?: string;
  /**
   * Where Teams and Enterprise conversations start.
   *
   * A `mailto:` unless a deployment sets something else. A form or a
   * discussions thread is a place to leave a message; an address is a reply
   * from a person, and at this size that is the more honest offer.
   */
  contactUrl: string;
  /** The same address in plain form, so the page can show where it goes. */
  contactEmail: string;
  /** The repository, for anyone who wants to watch rather than buy. */
  repositoryUrl: string;
}

/**
 * The address on the page when nothing overrides it.
 *
 * Not a secret and not a placeholder: it is published, deliberately, so that
 * someone who wants to talk can. It sits here rather than in `branding.ts`
 * because a rename does not change who reads the mail.
 */
const DEFAULT_CONTACT_EMAIL = "thefullstackbuilder@gmail.com";

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * A subject line, so the mail arrives already sorted.
 *
 * Encoded rather than interpolated raw: a subject with an `&` in it silently
 * truncates everything after it, and the next one somebody writes will have an
 * `&` in it.
 */
function mailto(address: string, subject: string): string {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}`;
}

export function commerceLinks(
  env: Record<string, string | undefined> = process.env,
): CommerceLinks {
  const repositoryUrl = `https://github.com/${branding.repository}`;
  const contactEmail = optional(env.SALES_CONTACT_EMAIL) ?? DEFAULT_CONTACT_EMAIL;

  return {
    checkoutUrl: optional(env.PRO_CHECKOUT_URL),
    contactUrl:
      optional(env.SALES_CONTACT_URL) ??
      mailto(contactEmail, `${branding.libraryName} for teams`),
    contactEmail,
    repositoryUrl,
  };
}

/** The same address, for a question about the free tier rather than a licence. */
export function supportMailto(links: CommerceLinks): string {
  return mailto(links.contactEmail, branding.libraryName);
}
