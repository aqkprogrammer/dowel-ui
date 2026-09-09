import { branding } from "./branding";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

/**
 * JSON-LD for the pages that have something a search engine can use.
 *
 * Only types that earn something are emitted. Google shows rich results for
 * BreadcrumbList and reads Organization/WebSite for entity understanding;
 * TechArticle and SoftwareSourceCode are not rich-result types but are the
 * vocabulary AI answer engines use to decide what a page is, which is the
 * traffic this site is realistically competing for.
 *
 * Nothing here invents a fact. There is no `aggregateRating`, because there are
 * no ratings — a fabricated one is a manual action, not a ranking trick.
 */

type Json = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): Json {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: branding.libraryName,
    url: SITE_URL,
    logo: absoluteUrl("/icon.svg"),
    description: branding.description,
    sameAs: [
      `https://github.com/${branding.repository}`,
      `https://www.npmjs.com/org/${branding.packageScope.replace("@", "")}`,
    ],
  };
}

export function webSiteSchema(): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: branding.description,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * The library itself, as a thing that can be installed.
 *
 * `offers` is the honest shape of the product: the components are free, and
 * there is a paid catalogue on top. Both are declared, so a price shown against
 * this entity is one we actually charge.
 */
export function softwareApplicationSchema(componentCount: number): Json {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "React UI component library",
    operatingSystem: "Any",
    url: SITE_URL,
    description: `${branding.description} ${String(componentCount)} accessible React components installed as source with the ${branding.cliName} CLI.`,
    softwareRequirements: "React 19, Node.js 20+",
    programmingLanguage: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
    downloadUrl: `https://www.npmjs.com/package/${branding.packageScope}/react`,
    codeRepository: `https://github.com/${branding.repository}`,
    publisher: { "@id": ORGANIZATION_ID },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      category: "free",
      url: absoluteUrl("/pricing"),
    },
  };
}

/**
 * One documented component or block.
 *
 * TechArticle describes the page (documentation about a thing); SoftwareSourceCode
 * describes the thing itself. Both are emitted because they answer different
 * questions, and an assistant asked "is there a React <x> component" is looking
 * for the second one.
 */
export function componentSchema(item: {
  name: string;
  title: string;
  description: string;
  kind: "component" | "block";
  dependencies?: readonly string[];
  free: boolean;
}): Json[] {
  const path =
    item.kind === "component" ? `/docs/components/${item.name}` : `/docs/blocks/${item.name}`;
  const url = absoluteUrl(path);
  const headline = `React ${item.title} ${item.kind === "component" ? "component" : "block"}`;

  return [
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline,
      name: headline,
      description: item.description,
      url,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORGANIZATION_ID },
      about: { "@id": `${url}#code` },
      proficiencyLevel: "Beginner",
      dependencies: "React 19, Tailwind CSS 4",
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${url}#code`,
      name: item.title,
      description: item.description,
      url,
      codeRepository: `https://github.com/${branding.repository}`,
      programmingLanguage: { "@type": "ComputerLanguage", name: "TypeScript" },
      runtimePlatform: "React",
      targetProduct: { "@id": `${SITE_URL}/#software` },
      license: item.free ? "https://opensource.org/licenses/MIT" : absoluteUrl("/pricing"),
      isAccessibleForFree: item.free,
      ...(item.dependencies && item.dependencies.length > 0
        ? { softwareRequirements: item.dependencies.join(", ") }
        : {}),
    },
  ];
}

/** The trail shown under a result. Every segment must be a page that exists. */
export function breadcrumbSchema(trail: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** An index page: what it collects, in order, so the whole set is discoverable. */
export function collectionSchema(options: {
  name: string;
  description: string;
  path: string;
  items: { name: string; title: string; description: string; path: string }[];
}): Json {
  return {
    "@type": "CollectionPage",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: options.items.length,
      itemListElement: options.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        description: item.description,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

/** Wraps a graph of the above into the single script tag a page emits. */
export function graph(...nodes: Json[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
