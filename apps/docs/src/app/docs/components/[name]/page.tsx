import { Badge } from "@dowel-ui/react/badge";
import { CodeBlock } from "@dowel-ui/react/code-block";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InstallCommand } from "~/components/install-command";
import { JsonLd } from "~/components/json-ld";
import { LicensedNotice } from "~/components/licensed-notice";
import { Preview } from "~/components/preview";
import { PropsTable } from "~/components/props-table";
import { Prose } from "~/components/prose";
import { QualityChecks } from "~/components/quality-checks";
import { branding } from "~/lib/branding";
import { getBlocksUsing, getComponents, getRegistryItem, isLicensed } from "~/lib/registry";
import { componentKeywords } from "~/lib/site";
import { breadcrumbSchema, componentSchema, graph } from "~/lib/structured-data";

/**
 * A component's documentation page.
 *
 * Generated entirely from the registry: the description, dependencies, source
 * and accessibility notes on this page are the same bytes the CLI installs.
 * Nothing here is written twice, so nothing here can go stale.
 */

interface PageProps {
  params: Promise<{ name: string }>;
}

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
  if (!getComponents().some((component) => component.name === name)) notFound();

  const item = getRegistryItem(name);
  const licensed = isLicensed(item);
  const source = licensed ? undefined : item.files.map((file) => file.content).join("\n\n");
  const usedIn = getBlocksUsing(item.name);

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
    <article className="max-w-3xl">
      <JsonLd json={structuredData} />
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          {item.status === "stable" ? null : (
            <Badge size="sm" variant="warning">
              {item.status}
            </Badge>
          )}
          {licensed ? (
            <Badge size="sm" variant="default">
              Pro
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-pretty text-muted-foreground">{item.description}</p>
      </header>

      <Preview component={item.name} source={source} />

      <Prose>
        <h2 id="installation">Installation</h2>
        <InstallCommand args={`add ${item.name}`} />

        {item.registryDependencies.length > 0 ? (
          <p>
            Installs {formatList(item.registryDependencies)} as well, because this component
            imports {item.registryDependencies.length === 1 ? "it" : "them"}.
          </p>
        ) : null}

        {item.dependencies.length > 0 ? (
          <p>
            npm packages installed:{" "}
            {item.dependencies.map((dependency, index) => (
              <span key={dependency}>
                {index > 0 ? ", " : ""}
                <code>{dependency}</code>
              </span>
            ))}
            .
          </p>
        ) : (
          <p>No npm packages are needed beyond what {branding.libraryName} already requires.</p>
        )}

        {item.a11y ? (
          <>
            <h2 id="accessibility">Accessibility</h2>
            <p>{item.a11y}</p>
          </>
        ) : null}
      </Prose>

      <PropsTable name={item.name} />

      <QualityChecks name={item.name} />

      {usedIn.length > 0 ? (
        <>
          <Prose>
            <h2 id="used-in">Used in</h2>
            <p>
              Whole screens assembled from this component. Installing one brings this and
              everything else it needs with it.
            </p>
          </Prose>
          <ul className="not-prose mt-4 flex flex-wrap gap-2">
            {usedIn.map((block) => (
              <li key={block.name}>
                <Link
                  href={`/docs/blocks/${block.name}`}
                  className="inline-flex rounded-md border border-border px-2 py-1 text-xs transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  {block.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Prose>
        <h2 id="source">Source</h2>
        <p>
          This is exactly what{" "}
          <code>
            {branding.cliName} add {item.name}
          </code>{" "}
          writes into your project, with imports rewritten to your own path alias.
        </p>
      </Prose>

      {licensed ? (
        <LicensedNotice name={item.name} />
      ) : (
        <div className="not-prose mt-4">
          {item.files.map((file) => (
            <CodeBlock
              key={file.path}
              language="tsx"
              title={file.path}
              code={file.content}
              className="mb-4 max-h-[36rem] overflow-auto"
            >
              {file.content}
            </CodeBlock>
          ))}
        </div>
      )}
    </article>
  );
}

function formatList(values: string[]): string {
  if (values.length === 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1] ?? ""}`;
}
