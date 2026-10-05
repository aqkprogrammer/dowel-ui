import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InstallCommand } from "~/components/install-command";
import { JsonLd } from "~/components/json-ld";
import { LicensedNotice } from "~/components/licensed-notice";
import { Preview } from "~/components/preview";
import { PropsTable } from "~/components/props-table";
import { CodePanel } from "~/components/site/code-panel";
import { CosmicBackground } from "~/components/site/cosmic-background";
import { DocSection } from "~/components/site/doc-section";
import { OnThisPage } from "~/components/site/on-this-page";
import { blockGroupLabel, blockGroupOf } from "~/lib/block-taxonomy";
import { branding } from "~/lib/branding";
import { proPreviews } from "~/lib/pro-previews.generated";
import { componentProps } from "~/lib/props.generated";
import { getBlocks, getComponents, getRegistryItem, isLicensed } from "~/lib/registry";
import { componentKeywords } from "~/lib/site";
import { breadcrumbSchema, componentSchema, graph } from "~/lib/structured-data";
import { usageFor } from "~/lib/usage";

/**
 * A block's page, generated from the registry like a component's.
 *
 * The one addition is the list of components it is assembled from — the point
 * of a block is that it is not magic, and the way to show that is to name every
 * piece and link to it.
 */

interface PageProps {
  params: Promise<{ name: string }>;
}

export function generateStaticParams() {
  return getBlocks().map((block) => ({ name: block.name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const block = getBlocks().find((entry) => entry.name === name);
  if (!block) return {};

  // A block is a whole screen, and that is how it is searched for — "react
  // dashboard template", not "dashboard". The title says which of the two it is.
  const title = `React ${block.title.toLowerCase()} template`;
  const description = `${block.description} A ready-made React ${block.title.toLowerCase()} UI built from accessible ${branding.libraryName} components with Tailwind CSS — installed as source you own with "${branding.cliName} add ${block.name}".`;
  const path = `/docs/blocks/${block.name}`;

  return {
    title,
    description,
    keywords: [
      `react ${block.title.toLowerCase()} template`,
      `react ${block.title.toLowerCase()} page`,
      `${block.title.toLowerCase()} ui react`,
      `tailwind ${block.title.toLowerCase()} template`,
      ...componentKeywords(block.title),
    ],
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlockPage({ params }: PageProps) {
  const { name } = await params;
  const entry = getBlocks().find((block) => block.name === name);
  if (!entry) notFound();

  const item = getRegistryItem(name);
  const licensed = isLicensed(item);
  // A licensed item's files arrive with no content, and an empty code view
  // would look like a bug rather than a decision.
  const source = licensed ? undefined : item.files.map((file) => file.content).join("\n\n");
  const usage = licensed ? undefined : usageFor(item);
  const group = blockGroupOf(entry);
  const componentTitles = new Map(
    getComponents().map((component) => [component.name, component.title]),
  );
  const hasProps = (componentProps[item.name]?.length ?? 0) > 0;
  // Rendered bare only if it can be: a block whose main export requires a prop
  // gets the import alone, rather than a snippet that does not type-check.
  const renderable =
    usage !== undefined &&
    !componentProps[item.name]
      ?.find((part) => part.component === usage.exportName)
      ?.props.some((prop) => prop.required);

  const sections = [
    { id: "installation", title: "Installation" },
    ...(usage ? [{ id: "usage", title: "Usage" }] : []),
    { id: "built-from", title: "Built from" },
    ...(hasProps ? [{ id: "api", title: "API" }] : []),
    ...(item.a11y ? [{ id: "accessibility", title: "Accessibility" }] : []),
    { id: "source", title: "Source" },
  ];

  const structuredData = graph(
    ...componentSchema({
      name: item.name,
      title: item.title,
      description: item.description,
      kind: "block",
      dependencies: item.registryDependencies,
      free: !licensed,
    }),
    breadcrumbSchema([
      { name: "Docs", path: "/docs" },
      { name: "Blocks", path: "/docs/blocks" },
      { name: item.title, path: `/docs/blocks/${item.name}` },
    ]),
  );

  return (
    <article className="min-w-0">
      <JsonLd json={structuredData} />

      <header className="relative isolate pt-8 pb-8">
        <CosmicBackground
          intensity="subtle"
          seed={item.name.length * 13}
          className="-inset-x-[50vw] -top-24 bottom-0 -z-10"
        />
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1">
              <Link
                href="/docs/blocks"
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                Blocks
              </Link>
              <ChevronRight aria-hidden="true" className="size-3" />
            </li>
            <li className="flex items-center gap-1">
              <Link
                href={`/docs/blocks#${group}`}
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                {blockGroupLabel(group)}
              </Link>
              <ChevronRight aria-hidden="true" className="size-3" />
            </li>
            <li aria-current="page" className="text-foreground">
              {item.title}
            </li>
          </ol>
        </nav>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <h1 className="display-md text-luminous">{item.title}</h1>
          <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase">
            Block
          </span>
          {licensed ? (
            <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase">
              Pro
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          {item.description}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 font-mono text-[0.6875rem] text-muted-foreground">
          <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
            {blockGroupLabel(group)}
          </li>
          <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
            {item.registryDependencies.length} components
          </li>
          <li className="rounded-full border border-[var(--hairline)] px-2.5 py-1">
            {item.files.length === 1 ? "1 file" : `${String(item.files.length)} files`}
          </li>
        </ul>
      </header>

      {/* A licensed block is previewed from markup rendered at build time. A
            live preview would mean a client component importing the block, and
            that import is a chunk any visitor can read — the source the registry
            is careful never to serve. */}
      <Preview
        component={item.name}
        source={source}
        sourceTitle={item.files[0] ? `components/${item.files[0].path}` : undefined}
        prerendered={licensed ? proPreviews[item.name] : undefined}
        prerenderedLabel={`${item.title}: ${item.description}`}
        size="block"
      />

      {/* The screen gets the full width; the rail starts with the reading. */}
      <div className="mt-16 xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-12">
        <div className="min-w-0">
          <DocSection
            id="installation"
            title="Installation"
            description={
              licensed
                ? "The block is written to your blocks directory with everything it is built from. This one needs a licence: sign in once with the CLI and the install is the same command."
                : "The block is written to your blocks directory, and everything it is built from is installed alongside it."
            }
          >
            <InstallCommand args={`add ${item.name}`} />
          </DocSection>

          {usage ? (
            <DocSection
              id="usage"
              title="Usage"
              description="A starting point, not a black box: render it, then edit the layout, the copy and the fields — they are yours."
            >
              <CodePanel
                title="app/page.tsx"
                code={
                  renderable
                    ? `import { ${usage.exportName} } from "${usage.importPath}";\n\nexport default function Page() {\n  return <${usage.exportName} />;\n}`
                    : `import { ${usage.exportName} } from "${usage.importPath}";`
                }
                highlight={renderable ? [4] : undefined}
              />
            </DocSection>
          ) : null}

          <DocSection
            id="built-from"
            title="Built from"
            description="Every piece is a component you already have documentation for, and can change independently."
          >
            <ul className="flex flex-wrap gap-2">
              {item.registryDependencies.map((dependency) => (
                <li key={dependency}>
                  <Link
                    href={`/docs/components/${dependency}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--pane)] px-3 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:border-[var(--hairline-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                  >
                    {componentTitles.get(dependency) ?? dependency}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </DocSection>

          {hasProps ? (
            <DocSection id="api" title="API">
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

          <DocSection
            id="source"
            title="Source"
            description={
              licensed ? (
                <>
                  {item.files.length === 1 ? "One file" : `${String(item.files.length)} files`},
                  written by{" "}
                  <code className="font-mono text-foreground">
                    {branding.cliName} add {item.name}
                  </code>{" "}
                  with imports rewritten to your own path alias, and yours to edit from then on.
                </>
              ) : (
                <>
                  Exactly what{" "}
                  <code className="font-mono text-foreground">
                    {branding.cliName} add {item.name}
                  </code>{" "}
                  writes, with imports rewritten to your own path alias. It is a starting point
                  — edit it.
                </>
              )
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

        <div className="hidden xl:block">
          <div className="sticky top-24">
            <OnThisPage sections={sections} />
          </div>
        </div>
      </div>
    </article>
  );
}
