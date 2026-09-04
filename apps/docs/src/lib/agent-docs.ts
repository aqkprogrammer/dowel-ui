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
  };
}

export function renderLlmsTxt(): string {
  return llmsTxt(context(false));
}

export function renderLlmsFullTxt(): string {
  return llmsFullTxt(context(true));
}
