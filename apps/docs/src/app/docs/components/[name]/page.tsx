import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";

import { InstallCommand } from "~/components/install-command";
import { JsonLd } from "~/components/json-ld";
import { LicensedNotice } from "~/components/licensed-notice";
import { Preview } from "~/components/preview";
import { PropsTable } from "~/components/props-table";
import { QualityChecks } from "~/components/quality-checks";
import { CodePanel } from "~/components/site/code-panel";
import { CosmicBackground } from "~/components/site/cosmic-background";
import { DocSection } from "~/components/site/doc-section";
import { OnThisPage } from "~/components/site/on-this-page";
import { StoryGallery } from "~/components/story-gallery";
import { branding } from "~/lib/branding";
import { categoryMeta } from "~/lib/category-meta";
import { componentProps } from "~/lib/props.generated";
import { componentQuality } from "~/lib/quality.generated";
import {
  CATEGORY_LABELS,
  getBlocksUsing,
  getComponents,
  getRegistryItem,
  isLicensed,
} from "~/lib/registry";
import { componentKeywords } from "~/lib/site";
import { breadcrumbSchema, componentSchema, graph } from "~/lib/structured-data";
import { usageFor } from "~/lib/usage";

/**
 * A component's documentation page.
 *
 * Generated entirely from the registry: the description, dependencies, source
 * and accessibility notes on this page are the same bytes the CLI installs.
 * Nothing here is written twice, so nothing here can go stale.
 *
 * It reads top to bottom in the order someone deciding on a component asks:
 * what does it look like, how do I get it, how do I use it, what are its
 * variants, what does it take, and is it any good. The source is last.
 */

interface PageProps {
  params: Promise<{ name: string }>;
}

/** Stories that open over the page or need a viewport of scroll: shown one at a time only. */
const NO_GALLERY = new Set(["session-expiry", "scroll-reveal-text"]);

export function generateStaticParams() {
  return getComponents().map((item) => ({ name: item.name }));
}

/**
 * The searchable description of one component.
 *
 * The registry's own description is one clause — accurate, and far short of the
 * length a search result will show. The rest is composed from facts the registry
 * already holds, so it stays true as the component changes, and it names the
 * words someone actually types: the framework, the styling, and the fact that
 * the code is copied rather than depended on.
 */
function describe(item: { title: string; description: string; name: string }): string {
  return `${item.description} A free, accessible React ${item.title.toLowerCase()} component built with TypeScript and Tailwind CSS. Copy the source or install it with "${branding.cliName} add ${item.name}".`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = getComponents().find((component) => component.name === name);
  if (!item) return {};

  // "React <X> component" rather than "<X>": the bare noun is a word, and the
  // phrase is the search. The template appends the brand.
  const title = `React ${item.title} component`;
  const description = describe(item);
  const path = `/docs/components/${item.name}`;

  return {
    title,
    description,
    keywords: componentKeywords(item.title, item.category),
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ComponentPage({ params }: PageProps) {
  const { name } = await params;
  const entry = getComponents().find((component) => component.name === name);
  if (!entry) notFound();

  const item = getRegistryItem(name);
  const licensed = isLicensed(item);
  const source = licensed ? undefined : item.files.map((file) => file.content).join("\n\n");
  const usedIn = getBlocksUsing(item.name);
  const usage = licensed ? undefined : usageFor(item);
  const categoryLabel = CATEGORY_LABELS[entry.category] ?? entry.category;
  const CategoryIcon = categoryMeta(entry.category).icon;
  const hasProps = (componentProps[item.name]?.length ?? 0) > 0;
  const hasQuality = componentQuality[item.name] !== undefined;
  const mainPath = item.files[0]?.path;

  const sections = [
    { id: "installation", title: "Installation" },
    ...(usage ? [{ id: "usage", title: "Usage" }] : []),
    ...(NO_GALLERY.has(item.name) ? [] : [{ id: "examples", title: "Examples" }]),
    ...(hasProps ? [{ id: "api", title: "API" }] : []),
    ...(item.a11y ? [{ id: "accessibility", title: "Accessibility" }] : []),
    ...(hasQuality ? [{ id: "quality", title: "Quality" }] : []),
    ...(usedIn.length > 0 ? [{ id: "used-in", title: "Used in" }] : []),
    { id: "source", title: "Source" },
  ];

  const structuredData = graph(
    ...componentSchema({
      name: item.name,
      title: item.title,
      description: item.description,
      kind: "component",
      dependencies: item.dependencies,
      free: !licensed,
    }),
    breadcrumbSchema([
      { name: "Docs", path: "/docs" },
      { name: "Components", path: "/docs/components" },
      { name: item.title, path: `/docs/components/${item.name}` },
    ]),
  );

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-12">
      <article className="min-w-0">
        <JsonLd json={structuredData} />

        <header className="relative isolate pt-8 pb-8">
          <CosmicBackground
            intensity="subtle"
            seed={item.name.length * 7}
            className="-inset-x-[50vw] -top-24 bottom-0 -z-10"
          />
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1">
                <Link
                  href="/docs/components"
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  Components
                </Link>
                <ChevronRight aria-hidden="true" className="size-3" />
              </li>
              <li className="flex items-center gap-1">
                <Link
                  href={`/docs/components#${entry.category}`}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  {categoryLabel}
                </Link>
                <ChevronRight aria-hidden="true" className="size-3" />
              </li>
              <li aria-current="page" className="text-foreground">
                {item.title}
              </li>
            </ol>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ViewTransition name={`title-${item.name}`} share="morph-text" default="none">
              <h1 className="display-md text-luminous">{item.title}</h1>
            </ViewTransition>
            {item.status === "stable" ? null : (
              <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase">
                {item.status}
              </span>
            )}
            {licensed ? (
              <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-blue)] uppercase">
                Pro
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
            {item.description}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 font-mono text-[0.6875rem] text-muted-foreground">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] px-2.5 py-1">
              <CategoryIcon aria-hidden="true" className="size-3 text-[var(--cosmic-blue)]" />
              {categoryLabel}
            </li>
            <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
              {item.files.length === 1 ? "1 file" : `${String(item.files.length)} files`}
            </li>
            <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
              {item.dependencies.length === 0
                ? "No extra npm packages"
                : `${String(item.dependencies.length)} npm ${item.dependencies.length === 1 ? "package" : "packages"}`}
            </li>
            {item.a11y ? (
              <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
                Accessibility notes
              </li>
            ) : null}
          </ul>
        </header>

        <Preview
          component={item.name}
          transitionName={`preview-${item.name}`}
          source={source}
          sourceTitle={mainPath ? `components/${mainPath}` : undefined}
          playgroundHref={licensed ? undefined : `/playground?c=${item.name}`}
        />

        <div className="mt-16">
          <DocSection
            id="installation"
            title="Installation"
            description={
              item.registryDependencies.length > 0
                ? `Installs ${formatList(item.registryDependencies)} as well, because this component imports ${item.registryDependencies.length === 1 ? "it" : "them"}.`
                : "One command, and the file is in your project."
            }
          >
            <InstallCommand args={`add ${item.name}`} />
            <p className="mt-3 text-sm text-muted-foreground">
              {item.dependencies.length > 0 ? (
                <>
                  npm packages installed:{" "}
                  {item.dependencies.map((dependency, index) => (
                    <span key={dependency}>
                      {index > 0 ? ", " : ""}
                      <code className="rounded bg-[var(--pane-raised)] px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                        {dependency}
                      </code>
                    </span>
                  ))}
                  .
                </>
              ) : (
                <>
                  No npm packages are needed beyond what {branding.libraryName} already
                  requires.
                </>
              )}
            </p>
          </DocSection>

          {usage ? (
            <DocSection
              id="usage"
              title="Usage"
              description="Imported from your own path — the file is yours, so this is an import like any other."
            >
              <CodePanel
                title="app/page.tsx"
                code={`import { ${usage.exportName} } from "${usage.importPath}";`}
              />
            </DocSection>
          ) : null}

          {NO_GALLERY.has(item.name) ? null : (
            <DocSection
              id="examples"
              title="Examples"
              description="Every example the tests run, live and operable, side by side."
            >
              <StoryGallery component={item.name} />
            </DocSection>
          )}

          {hasProps ? (
            <DocSection
              id="api"
              title="API"
              description="Generated from the component's own types, so a prop cannot appear here without existing."
            >
              <PropsTable name={item.name} />
            </DocSection>
          ) : null}

          {item.a11y ? (
            <DocSection id="accessibility" title="Accessibility">
              <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--pane)] p-5 text-sm leading-relaxed text-pretty text-muted-foreground">
                {item.a11y}
              </div>
            </DocSection>
          ) : null}

          {hasQuality ? (
            <DocSection
              id="quality"
              title="Quality"
              description="Measured from the source and its tests at build time."
              action={
                <Link
                  href="/quality"
                  className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  All scores
                  <ArrowUpRight aria-hidden="true" className="size-3" />
                </Link>
              }
            >
              <QualityChecks name={item.name} />
            </DocSection>
          ) : null}

          {usedIn.length > 0 ? (
            <DocSection
              id="used-in"
              title="Used in"
              description="Whole screens assembled from this component. Installing one brings this and everything else it needs with it."
            >
              <ul className="flex flex-wrap gap-2">
                {usedIn.map((block) => (
                  <li key={block.name}>
                    <Link
                      href={`/docs/blocks/${block.name}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--pane)] px-3 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:border-[var(--hairline-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                    >
                      {block.title}
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </DocSection>
          ) : null}

          <DocSection
            id="source"
            title="Source"
            description={
              <>
                Exactly what{" "}
                <code className="font-mono text-foreground">
                  {branding.cliName} add {item.name}
                </code>{" "}
                writes into your project, with imports rewritten to your own path alias.
              </>
            }
          >
            {licensed ? (
              <LicensedNotice name={item.name} />
            ) : (
              <div className="grid gap-4">
                {item.files.map((file) => (
                  <CodePanel
                    key={file.path}
                    title={`components/${file.path}`}
                    code={file.content}
                    collapseAfter={40}
                    lineNumbers
                  />
                ))}
              </div>
            )}
          </DocSection>
        </div>
      </article>

      <div className="hidden xl:block">
        <div className="sticky top-24 pt-10">
          <OnThisPage sections={sections} />
        </div>
      </div>
    </div>
  );
}

function formatList(values: string[]): string {
  if (values.length === 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1] ?? ""}`;
}
