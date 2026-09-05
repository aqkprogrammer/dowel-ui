import { CodeBlock } from "@dowel-ui/react/code-block";
import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";

export const metadata: Metadata = {
  title: "Private registries",
  description:
    "Publish your organisation's own components and have them installed exactly the way these are — from a registry you build and host yourself.",
};

const BUILD = `import { buildCustomRegistry, defineRegistryConfig } from "${branding.packageScope}/registry";

const result = await buildCustomRegistry(
  defineRegistryConfig({
    root: "src",
    generatedFrom: "@acme/ui@1.0.0",
    // One URL that serves both your components and everything upstream.
    extends: "${branding.registryUrl}",
    items: [
      {
        name: "acme-callout",
        title: "Acme Callout",
        description: "Acme's house callout, built on the upstream Badge.",
        category: "display",
        registryDependencies: ["badge"],
        files: ["acme-callout.tsx"],
      },
    ],
  }),
);`;

const CONFIG = `{
  "registry": "https://ui.acme.internal/r"
}`;

/**
 * The Teams story as it exists today: self-hosted, free, and the same CLI.
 *
 * Written as a guide rather than as a sales page because the capability is
 * real now and does not need a licence. The hosted version is what Teams will
 * sell; this page is honest about which is which.
 */
export default function PrivateRegistryPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Private registries</h1>

      <Prose>
        <p>
          The CLI has always installed from any registry: <code>--registry</code> takes a URL or
          a path on disk. <code>{branding.packageScope}/registry</code> builds one, so an
          organisation can publish its own components and have them installed exactly the way
          these are — with the same dependency resolution, the same content hashes, and the same{" "}
          <code>update</code> that never overwrites an edited file.
        </p>
        <p>
          This is the producer half of what the CLI has always consumed. Nothing here needs a
          licence.
        </p>

        <h2 id="build">Build one</h2>
        <p>
          Declare your items against the files that implement them. The build reads the real
          imports and refuses anything that would fail in a consumer&rsquo;s project.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="ts" title="registry.build.ts" code={BUILD}>
          {BUILD}
        </CodeBlock>
      </div>

      <Prose>
        <p>
          <code>extends</code> is the part that makes it one registry rather than two. Point a
          project at the result and <code>add acme-callout</code> installs your component,
          pulling <code>badge</code> from upstream on the way. Your developers learn one URL.
        </p>
        <p>
          <strong>A local item replaces an upstream one of the same name</strong>, and the build
          tells you which. Overriding upstream&rsquo;s Button is a legitimate thing to want and
          a catastrophic thing to do by accident, and the difference is whether anyone was told.
        </p>

        <h2 id="refuses">What it refuses</h2>
        <ul>
          <li>
            A <strong>file it cannot read.</strong>
          </li>
          <li>
            An import written against the <strong>installed</strong> path (
            <code>@/components/ui/badge</code>) rather than the authored one (
            <code>@/components/badge</code>). The leading group is rewritten to wherever the
            project keeps its components, so naming it twice produces a path that resolves
            nowhere.
          </li>
          <li>
            A component that <strong>imports something it never declared</strong>, which would
            not be installed alongside it.
          </li>
        </ul>

        <h2 id="host">Host it</h2>
        <p>
          The output is a directory of JSON: an index and one file per item. Any static host
          serves it — an S3 bucket, a Pages site, a folder behind your VPN. Serve{" "}
          <code>/r/*.json</code> with <code>Access-Control-Allow-Origin: *</code> if a browser
          will ever read it, and cache it as hard as you like: a registry is immutable per
          release.
        </p>
        <p>Then set it once per project, so nobody has to remember the flag:</p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="json" title="components.json" code={CONFIG}>
          {CONFIG}
        </CodeBlock>
      </div>

      <Prose>
        <h2 id="agents">Your agents see it too</h2>
        <p>
          <code>{branding.cliName} agents</code> and the MCP server generate from whichever
          registry the project points at, so a coding agent in your repository learns your
          components alongside these, and is told when it types a name that exists in neither.
        </p>

        <h2 id="teams">What Teams adds</h2>
        <p>
          Everything on this page is self-hosted and free. Teams is for organisations that would
          rather not run it: a hosted private registry, Pro licences for every developer in one
          agreement, and — on the roadmap — SSO and version governance across several products
          consuming one design system. It is priced by conversation, not by a table; see{" "}
          <Link href="/pricing">pricing</Link>.
        </p>
      </Prose>
    </article>
  );
}
