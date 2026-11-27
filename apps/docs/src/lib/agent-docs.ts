import { llmsFullTxt, llmsTxt, type AgentDocsContext } from "@dowel-ui/registry";

import { branding } from "./branding";
import { getRegistryIndex, getRegistryItems } from "./registry";

/**
 * The site's own canonical origin.
 *
 * llms.txt is a document of absolute links — a model that fetches it has no
 * base to resolve relative ones against — so this cannot fall back to a
 * relative path. Derived from the registry URL, which already has to be
 * absolute for the CLI to fetch it, rather than added as a second setting that
 * could disagree with it.
 */
const SITE_URL = branding.registryUrl.replace(/\/r$/, "");

function context(withDetail: boolean): AgentDocsContext {
  return {
    index: getRegistryIndex(),
    items: withDetail ? getRegistryItems() : undefined,
    registryUrl: branding.registryUrl,
    docsUrl: SITE_URL,
    cliPackage: branding.cliPackage,
    libraryName: branding.libraryName,
    // No components.json to read here: a model reading the site has not
    // installed anything yet, so the package form is the honest default.
    importFrom: `${branding.packageScope}/react`,
    // The questions an assistant is asked about a library before it is asked
    // about any one component: what it is, what it costs, what it runs on and
    // how it gets into a project. Each line is checked against the pricing page
    // and the package manifests; none is a claim the site does not make.
    about: [
      `${branding.libraryName} UI is a source-first React UI system: the CLI copies each component's TypeScript source into your repository, so you own and edit the code instead of depending on a runtime package.`,
      "Stack: React 19, TypeScript, Tailwind CSS 4 and Radix UI primitives, themed with OKLCH design tokens.",
      `Licensing: every component and the free blocks are MIT-licensed at no cost. Pro is a paid catalogue of whole application surfaces (CRM, command center, AI workspace, admin console); see [Pricing](${SITE_URL}/pricing).`,
      `AI interfaces: components for chat, prompt input, reasoning, tool calls, approvals and agent plans and status, plus AI chat, AI workspace and agent-console blocks; see [Blocks](${SITE_URL}/docs/blocks) and [Components](${SITE_URL}/docs/components).`,
      `Coding agents: \`${branding.cliPackage}\` can write the catalogue into AGENTS.md, and the \`${branding.packageScope}/mcp\` MCP server answers component questions live; see [AI agents](${SITE_URL}/docs/ai-agents).`,
      `Source: [GitHub](https://github.com/${branding.repository}) · npm scope [${branding.packageScope}](https://www.npmjs.com/org/${branding.packageScope.replace("@", "")}).`,
    ],
  };
}

export function renderLlmsTxt(): string {
  return llmsTxt(context(false));
}

export function renderLlmsFullTxt(): string {
  return llmsFullTxt(context(true));
}
