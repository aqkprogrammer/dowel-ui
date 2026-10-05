/**
 * How blocks are grouped on this site.
 *
 * The registry's `category` describes what a block is built from — most of the
 * marketing sections say "layout" — which is right for the CLI and useless for
 * finding one. This is a browsing taxonomy layered on top, by name: it changes
 * nothing that is installed, and a block it does not recognise falls back to a
 * group chosen from its registry category rather than disappearing.
 *
 * Only groups that have blocks in them are shown, so a group listed here with
 * nothing in it yet costs nothing and claims nothing.
 */

export interface BlockGroup {
  id: string;
  label: string;
  blurb: string;
}

export const BLOCK_GROUPS: BlockGroup[] = [
  {
    id: "dashboards",
    label: "Dashboards",
    blurb: "Overviews, analytics, admin consoles and operations views.",
  },
  {
    id: "saas",
    label: "SaaS",
    blurb: "Billing, settings, onboarding and the pipeline — the pages every product has.",
  },
  {
    id: "ai",
    label: "AI",
    blurb: "Chat, agent consoles, AI usage and whole AI workspaces.",
  },
  {
    id: "auth",
    label: "Authentication",
    blurb: "Sign in, sign up and password reset, validated and accessible.",
  },
  {
    id: "heroes",
    label: "Heroes",
    blurb: "Openings for a landing page, from quiet to cinematic.",
  },
  {
    id: "sections",
    label: "Sections",
    blurb: "Features, calls to action, FAQs, testimonials, logos, stats and team.",
  },
  {
    id: "pricing",
    label: "Pricing",
    blurb: "Plan tables with billing-period switches.",
  },
  {
    id: "footers",
    label: "Footers",
    blurb: "From one row to a full mega footer with a newsletter.",
  },
];

const BY_NAME: Record<string, string> = {
  dashboard: "dashboards",
  analytics: "dashboards",
  "admin-dashboard": "dashboards",
  "admin-users": "dashboards",
  "command-center": "dashboards",
  billing: "saas",
  settings: "saas",
  onboarding: "saas",
  crm: "saas",
  "ai-chat": "ai",
  "ai-dashboard": "ai",
  "ai-workspace": "ai",
  "agent-console": "ai",
  login: "auth",
  signup: "auth",
  "forgot-password": "auth",
  pricing: "pricing",
};

const BY_PREFIX: [string, string][] = [
  ["hero-", "heroes"],
  ["footer-", "footers"],
  ["pricing-", "pricing"],
  ["ai-", "ai"],
  ["agent-", "ai"],
  ["features-", "sections"],
  ["cta-", "sections"],
  ["faq-", "sections"],
  ["testimonial-", "sections"],
  ["logo-", "sections"],
  ["stats-", "sections"],
  ["team-", "sections"],
];

export function blockGroupOf(block: { name: string; category: string }): string {
  const named = BY_NAME[block.name];
  if (named) return named;
  const prefixed = BY_PREFIX.find(([prefix]) => block.name.startsWith(prefix));
  if (prefixed) return prefixed[1];
  if (block.category === "ai") return "ai";
  if (block.category === "form") return "auth";
  if (block.category === "data") return "dashboards";
  return "sections";
}

export function blockGroupLabel(id: string): string {
  return BLOCK_GROUPS.find((group) => group.id === id)?.label ?? id;
}
