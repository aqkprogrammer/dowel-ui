import { Badge } from "@dowel-ui/react/badge";
import { CodeBlock } from "@dowel-ui/react/code-block";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstallCommand } from "~/components/install-command";
import { Preview } from "~/components/preview";
import { Prose } from "~/components/prose";
import { QualityChecks } from "~/components/quality-checks";
import { branding } from "~/lib/branding";
import { getComponents, getRegistryItem } from "~/lib/registry";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = getComponents().find((component) => component.name === name);
  if (!item) return {};

  return { title: item.title, description: item.description };
}

export default async function ComponentPage({ params }: PageProps) {
  const { name } = await params;
  if (!getComponents().some((component) => component.name === name)) notFound();

  const item = getRegistryItem(name);
  const source = item.files.map((file) => file.content).join("\n\n");

  return (
    <article className="max-w-3xl">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          {item.status === "stable" ? null : (
            <Badge size="sm" variant="warning">
              {item.status}
            </Badge>
          )}
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

      <QualityChecks name={item.name} />

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
    </article>
  );
}

function formatList(values: string[]): string {
  if (values.length === 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1] ?? ""}`;
}
