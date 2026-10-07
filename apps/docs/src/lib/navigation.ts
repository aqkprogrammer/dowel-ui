/**
 * The site's map, in one place.
 *
 * The header, the sidebar, the mobile drawer, the footer and the search index
 * all read from here, so a page added to one is in all of them. Nothing in this
 * file reads the registry — that would make it server-only, and the header's
 * active state is decided in the browser. The registry-backed parts (every
 * component and block) are joined in by the callers that can read it.
 */

export interface NavLink {
  title: string;
  href: string;
  /** One line, for search results and the mobile drawer. */
  description?: string;
}

export interface NavSection {
  label: string;
  items: NavLink[];
}

export const PRIMARY_NAV: NavLink[] = [
  { title: "Docs", href: "/docs" },
  { title: "Components", href: "/docs/components" },
  { title: "Blocks", href: "/docs/blocks" },
  { title: "Playground", href: "/playground" },
  { title: "Demo", href: "/agent-demo" },
  { title: "Generate", href: "/generate" },
  { title: "Themes", href: "/docs/themes" },
  { title: "Pricing", href: "/pricing" },
];

/**
 * Which primary item a path belongs to.
 *
 * Components, blocks and themes live under /docs for historical URLs, so
 * "Docs" is what is left of /docs once those are claimed — otherwise every
 * component page would light up two items at once.
 */
export function primaryFor(pathname: string): string | undefined {
  if (pathname.startsWith("/docs/components")) return "/docs/components";
  if (pathname.startsWith("/docs/blocks")) return "/docs/blocks";
  if (pathname.startsWith("/docs/themes") || pathname.startsWith("/theme-studio")) {
    return "/docs/themes";
  }
  if (
    pathname.startsWith("/docs") ||
    pathname.startsWith("/quality") ||
    pathname.startsWith("/agentbench")
  ) {
    return "/docs";
  }
  if (pathname.startsWith("/playground")) return "/playground";
  if (pathname.startsWith("/agent-demo")) return "/agent-demo";
  if (pathname.startsWith("/generate")) return "/generate";
  if (pathname.startsWith("/pricing")) return "/pricing";
  return undefined;
}

export const GUIDES: NavSection = {
  label: "Get started",
  items: [
    {
      title: "Introduction",
      href: "/docs",
      description: "What source-first means, and what is opinionated",
    },
    {
      title: "Installation",
      href: "/docs/installation",
      description: "Set up a Next.js or Vite project in one command",
    },
    { title: "CLI", href: "/docs/cli", description: "init, add, update, diff and login" },
    {
      title: "Theming",
      href: "/docs/themes",
      description: "OKLCH tokens, presets, radius and dark mode",
    },
    {
      title: "Accessibility",
      href: "/docs/accessibility",
      description: "What every component guarantees, and how it is tested",
    },
    {
      title: "AI agents",
      href: "/docs/ai-agents",
      description: "AGENTS.md, the MCP server and llms.txt",
    },
    {
      title: "Private registries",
      href: "/docs/private-registry",
      description: "Serve your own components through the same CLI",
    },
  ],
};

export const TOOLS: NavSection = {
  label: "Tools",
  items: [
    {
      title: "Playground",
      href: "/playground",
      description: "Every variant of every component, with the code",
    },
    {
      title: "Agent demo",
      href: "/agent-demo",
      description: "A model operates a page through agent-surface; take it back any time",
    },
    {
      title: "Generate",
      href: "/generate",
      description: "Describe a screen, get the components that build it",
    },
    {
      title: "Theme Studio",
      href: "/theme-studio",
      description: "Build a preset from one colour, contrast-checked",
    },
    { title: "Quality", href: "/quality", description: "Per-component quality scores" },
    {
      title: "AgentBench",
      href: "/agentbench",
      description: "Whether the agent files and MCP server change what an agent builds",
    },
  ],
};

export const FOOTER_NAV: NavSection[] = [
  {
    label: "Product",
    items: [
      { title: "Components", href: "/docs/components" },
      { title: "Blocks", href: "/docs/blocks" },
      { title: "Playground", href: "/playground" },
      { title: "Agent demo", href: "/agent-demo" },
      { title: "Themes", href: "/docs/themes" },
      { title: "Pricing", href: "/pricing" },
    ],
  },
  {
    label: "Developers",
    items: [
      { title: "Docs", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "CLI", href: "/docs/cli" },
      { title: "AI agents", href: "/docs/ai-agents" },
      { title: "llms.txt", href: "/llms.txt" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Generate", href: "/generate" },
      { title: "Theme Studio", href: "/theme-studio" },
      { title: "Quality", href: "/quality" },
      { title: "AgentBench", href: "/agentbench" },
      { title: "Accessibility", href: "/docs/accessibility" },
      { title: "Private registries", href: "/docs/private-registry" },
    ],
  },
];
