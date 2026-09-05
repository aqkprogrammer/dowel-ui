import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { commerceLinks } from "~/lib/commerce";
import { getBlocks, getComponents } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "The components are free and stay free. Pro is the catalogue of whole application surfaces on top, and Teams is for organisations that want a registry of their own.",
};

/**
 * What costs what, and — more importantly here — what does not.
 *
 * The free tier is not a trial. Every component and every block that shipped
 * before there was a paid catalogue is MIT and stays installable without a
 * licence, and this page says so before it says anything else, because the
 * first question anyone asks of a source-first library with a paid tier is
 * whether the free half is about to shrink.
 */
export default function PricingPage() {
  const components = getComponents();
  const blocks = getBlocks();
  const free = blocks.filter((block) => block.access !== "pro");
  const pro = blocks.filter((block) => block.access === "pro");
  const links = commerceLinks();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader searchEntries={[]} />

      <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            The components are free. The applications are Pro.
          </h1>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            Every component and every block that has ever shipped free stays free, under MIT.
            Pro is the catalogue of whole application surfaces built on top of them, and Teams
            is for organisations that want a registry of their own.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <Tier
            name="Free"
            price="$0"
            cadence="MIT, forever"
            summary="The whole component library, the blocks it started with, and every tool around them."
            features={[
              `${String(components.length)} components, installed as source you own`,
              `${String(free.length)} blocks: auth, dashboard, analytics, billing, settings, AI chat, agent console and more`,
              "The CLI, seven themes and the Theme Studio",
              "Agent docs, an MCP server, llms.txt and create-dowel-app",
              "Per-component quality scores and the accessibility notes behind them",
            ]}
            action={
              <Button asChild size="lg" className="w-full">
                <Link href="/docs/installation">Get started</Link>
              </Button>
            }
          />

          <Tier
            name="Pro"
            price="$79"
            cadence="per developer, per year"
            highlighted
            summary="Whole application surfaces — a CRM, a command center, an AI workspace, an admin console — installed with the same command."
            features={[
              ...pro.map((block) => `${block.title}: ${block.description.split(":")[0] ?? ""}`),
              "Everything added to the Pro catalogue while the licence is active",
              "One key for the CLI and for CI, checked against the registry when you paste it",
              "What you install is yours: the files never expire, only the ability to install and update",
            ]}
            action={
              links.checkoutUrl ? (
                <Button asChild size="lg" className="w-full">
                  <a href={links.checkoutUrl}>Get a licence</a>
                </Button>
              ) : (
                <div className="grid gap-2">
                  <Button asChild size="lg" variant="outline" className="w-full">
                    <a href={links.repositoryUrl}>Watch the repository</a>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Pro is opening soon. The previews are live now — see the{" "}
                    <Link href="/docs/blocks" className="underline underline-offset-4">
                      blocks
                    </Link>
                    .
                  </p>
                </div>
              )
            }
          />

          <Tier
            name="Teams & Enterprise"
            price="Talk to us"
            cadence="for organisations"
            summary="Your own components, installed the same way as ours, by everyone in the organisation."
            features={[
              "A registry of your own, today: build one with @dowel-ui/registry and host it anywhere",
              "One URL that serves your components and everything upstream",
              "Pro licences for every developer in one agreement",
              "Planned: a hosted private registry, organisation-wide licences, SSO, and version governance across products",
            ]}
            action={
              <div className="grid gap-2">
                <Button asChild size="lg" variant="outline" className="w-full">
                  <a href={links.contactUrl}>Start a conversation</a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Or read how a{" "}
                  <Link href="/docs/private-registry" className="underline underline-offset-4">
                    private registry
                  </Link>{" "}
                  works.
                </p>
              </div>
            }
          />
        </div>

        <section aria-labelledby="pricing-faq" className="mt-20 max-w-3xl">
          <h2 id="pricing-faq" className="text-xl font-semibold tracking-tight">
            Questions
          </h2>
          <dl className="mt-6 grid gap-6">
            <Question title="Will something I use today stop being free?">
              No. Free is a promise the build enforces: an item that has ever been installable
              without a licence is named in a test that fails the release if its access changes.
              Pro is only ever new things.
            </Question>
            <Question title="What does the licence key actually do?">
              It lets the CLI fetch the source of a Pro block.{" "}
              <code>{branding.cliName} login</code> checks the key against the registry before
              storing it, so a bad key fails when you paste it rather than during an install a
              week later. The key lives in your own config directory, never in the project; CI
              sets <code>DOWEL_TOKEN</code> from its secrets store.
            </Question>
            <Question title="What happens when it lapses?">
              Nothing, to your code. Every file the CLI wrote is in your repository and stays
              there. What stops is installing Pro blocks into new projects and pulling their
              updates.
            </Question>
            <Question title="Can I see a Pro block before paying?">
              The preview on every Pro block&rsquo;s page is the real component, rendered from
              the same story the tests run, with every one of its states. Only the source is
              withheld.
            </Question>
            <Question title="We want our own components in the registry.">
              That works today, free, and does not need a licence:{" "}
              <code>@dowel-ui/registry</code> builds a registry from your files, extends ours,
              and the CLI installs from it with <code>--registry</code>. Teams is for
              organisations that would rather we host it.
            </Question>
          </dl>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-xs text-muted-foreground">
          MIT licensed. Built with {branding.libraryName}.
        </div>
      </footer>
    </div>
  );
}

function Tier({
  name,
  price,
  cadence,
  summary,
  features,
  action,
  highlighted = false,
}: {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  action: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <section
      aria-labelledby={`tier-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className={
        highlighted
          ? "flex flex-col gap-6 rounded-2xl border-2 border-primary bg-card p-6"
          : "flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
      }
    >
      <div>
        <div className="flex items-center gap-2">
          <h2
            id={`tier-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className="text-lg font-semibold"
          >
            {name}
          </h2>
          {highlighted ? (
            <Badge size="sm" variant="default">
              Pro
            </Badge>
          ) : null}
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{price}</p>
        <p className="text-sm text-muted-foreground">{cadence}</p>
        <p className="mt-3 text-sm text-pretty text-muted-foreground">{summary}</p>
      </div>

      <ul className="grid flex-1 gap-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {action}
    </section>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{title}</dt>
      <dd className="mt-1 text-sm text-pretty text-muted-foreground">{children}</dd>
    </div>
  );
}
