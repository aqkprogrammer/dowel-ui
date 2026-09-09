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
import { branding } from "~/lib/branding";
import { proPreviews } from "~/lib/pro-previews.generated";
import { getBlocks, getRegistryItem, isLicensed } from "~/lib/registry";
import { componentKeywords } from "~/lib/site";
import { breadcrumbSchema, componentSchema, graph } from "~/lib/structured-data";

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
  if (!getBlocks().some((block) => block.name === name)) notFound();

  const item = getRegistryItem(name);
  const licensed = isLicensed(item);
  // A licensed item's files arrive with no content, and an empty Code tab
  // would look like a bug rather than a decision.
  const source = licensed ? undefined : item.files.map((file) => file.content).join("\n\n");

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
    <article className="max-w-3xl">
      <JsonLd json={structuredData} />
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <Badge size="sm" variant="secondary">
            Block
          </Badge>
          {licensed ? (
            <Badge size="sm" variant="default">
              Pro
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-pretty text-muted-foreground">{item.description}</p>
      </header>

      {/* A licensed block is previewed from markup rendered at build time. A
          live preview would mean a client component importing the block, and
          that import is a chunk any visitor can read — the source the registry
          is careful never to serve. */}
      <Preview
        component={item.name}
        source={source}
        prerendered={licensed ? proPreviews[item.name] : undefined}
        prerenderedLabel={`${item.title}: ${item.description}`}
      />

      <Prose>
        <h2 id="installation">Installation</h2>
        <p>
          The block is written to your blocks directory, and everything it is built from is
          installed alongside it.
          {licensed
            ? " This one needs a licence: sign in once with the CLI and the install is the same command."
            : ""}
        </p>
      </Prose>

      <InstallCommand args={`add ${item.name}`} />

      <Prose>
        <h2 id="built-from">Built from</h2>
        <p>
          A block is not a black box. Every piece is a component you already have documentation
          for, and can change independently.
        </p>
      </Prose>

      <ul className="not-prose mt-4 flex flex-wrap gap-2">
        {item.registryDependencies.map((dependency) => (
          <li key={dependency}>
            <Link
              href={`/docs/components/${dependency}`}
              className="inline-flex rounded-md border border-border px-2 py-1 font-mono text-xs transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              {dependency}
            </Link>
          </li>
        ))}
      </ul>

      <PropsTable name={item.name} />

      {item.a11y ? (
        <Prose>
          <h2 id="accessibility">Accessibility</h2>
          <p>{item.a11y}</p>
        </Prose>
      ) : null}

      <Prose>
        <h2 id="source">Source</h2>
        {licensed ? (
          <p>
            {item.files.length === 1 ? "One file" : `${String(item.files.length)} files`},
            written by{" "}
            <code>
              {branding.cliName} add {item.name}
            </code>{" "}
            with imports rewritten to your own path alias, and yours to edit from then on.
          </p>
        ) : (
          <p>
            This is exactly what{" "}
            <code>
              {branding.cliName} add {item.name}
            </code>{" "}
            writes, with imports rewritten to your own path alias. It is a starting point — edit
            it.
          </p>
        )}
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
