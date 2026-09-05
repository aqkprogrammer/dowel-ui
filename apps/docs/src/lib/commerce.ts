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
  /** Where Teams and Enterprise conversations start. */
  contactUrl: string;
  /** The repository, for anyone who wants to watch rather than buy. */
  repositoryUrl: string;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function commerceLinks(
  env: Record<string, string | undefined> = process.env,
): CommerceLinks {
  const repositoryUrl = `https://github.com/${branding.repository}`;
  return {
    checkoutUrl: optional(env.PRO_CHECKOUT_URL),
    contactUrl: optional(env.SALES_CONTACT_URL) ?? `${repositoryUrl}/discussions`,
    repositoryUrl,
  };
}
