import { branding } from "./branding";

/**
 * What a template is, here.
 *
 * A directory of application files, plus a list of registry items to install
 * into it. The components are *not* in the template — they are fetched from the
 * registry at creation time by the same CLI a user would run themselves.
 *
 * That is the whole design. A template that carries its own copy of Button is a
 * copy that is wrong by the next release, and the person who generated from it
 * has no way to know. Fetching means a project created today is built from
 * today's registry, and means a template is a dozen files rather than a hundred.
 */

export interface Template {
  id: string;
  title: string;
  /** One line, shown in the picker. */
  description: string;
  /**
   * Template directories layered in order, so shared files are written once.
   * Later directories overwrite earlier ones.
   */
  layers: string[];
  /** Registry items installed with `add` after the files are written. */
  items: string[];
  /** Routes the template ships, for the "what next" summary. */
  routes: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: "starter",
    title: "Starter",
    description: `A Next.js app wired to ${branding.libraryName}: tokens, aliases and a landing page.`,
    layers: ["base", "starter"],
    items: ["button", "card", "badge"],
    routes: ["/"],
  },
  {
    id: "saas",
    title: "SaaS",
    description:
      "Adds an application shell with dashboard, analytics, billing, settings and onboarding.",
    layers: ["base", "app-shell", "saas"],
    items: ["sidebar", "dashboard", "analytics", "billing", "settings", "onboarding"],
    routes: ["/", "/app", "/app/analytics", "/app/billing", "/app/settings"],
  },
  {
    id: "ai",
    title: "AI product",
    description: "Adds a chat surface, an agent console and a usage dashboard.",
    layers: ["base", "app-shell", "ai"],
    items: ["sidebar", "ai-chat", "agent-console", "ai-dashboard"],
    routes: ["/", "/app", "/app/agents", "/app/usage"],
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

/** Presets the scaffolder offers, mirroring what the theme layer ships. */
export const THEMES = [
  "default",
  "ocean",
  "emerald",
  "violet",
  "rose",
  "amber",
  "monochrome",
] as const;

export type Theme = (typeof THEMES)[number];

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}
