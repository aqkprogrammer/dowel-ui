import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";
import { getComponents } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Introduction",
  description: branding.description,
};

export default function DocsPage() {
  const total = getComponents().length;

  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Introduction</h1>

      <Prose>
        <p>
          {branding.libraryName} is a set of {total} React components you install as source. The
          CLI copies real files into your repository — you read them, change them, and they are
          yours. There is no runtime package between you and the markup.
        </p>

        <h2>What that means in practice</h2>
        <p>
          Because the code lives in your project, the usual escape hatches are unnecessary.
          There is no <code>styles</code> prop to thread through, no theme object to fight, and
          no wrapper to write when a component does not quite do what you need. You edit the
          file.
        </p>
        <p>
          The trade is that updates are not automatic. That is handled deliberately rather than
          ignored: <code>add</code> records a hash of every file it writes, so{" "}
          <code>update</code> can tell a file you edited from one that changed upstream, and
          never overwrites your work without being told to.
        </p>

        <h2>What is opinionated</h2>
        <ul>
          <li>
            <strong>Accessibility is not configurable.</strong> Keyboard interaction, focus
            management and announcements are part of each component, not a prop you remember to
            set. Where the accessible choice differs from the common one, the reason is written
            on the component&rsquo;s page.
          </li>
          <li>
            <strong>Composition over configuration.</strong> Components take children, not
            configuration objects. A Dialog is a Dialog, a Trigger and a Content, so anything
            can go anywhere.
          </li>
          <li>
            <strong>Semantic tokens only.</strong> Components reference <code>bg-primary</code>{" "}
            and <code>text-muted-foreground</code>, never a raw colour. Re-skinning the system
            changes tokens, not components.
          </li>
        </ul>

        <h2>Requirements</h2>
        <ul>
          <li>React 19</li>
          <li>
            Tailwind CSS <strong>v4</strong> — the tokens use <code>@theme</code>, which v3
            cannot parse. The CLI refuses to install into a v3 project rather than writing CSS
            that will not build.
          </li>
          <li>TypeScript. JavaScript output is not supported yet.</li>
        </ul>

        <h2>Next</h2>
        <p>
          <Link href="/docs/installation">Set up a project</Link>, then{" "}
          <Link href="/docs/components">browse the components</Link>.
        </p>
      </Prose>
    </article>
  );
}
