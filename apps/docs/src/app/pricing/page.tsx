import { Button } from "@dowel-ui/react/button";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { branding } from "~/lib/branding";
import { pageMetadata } from "~/lib/site";
import { commerceLinks, supportMailto } from "~/lib/commerce";
import { getBlocks, getComponents } from "~/lib/registry";

export const metadata: Metadata = pageMetadata({
  title: "Pricing — free React components, Pro application surfaces",
  description:
    "Every core React component is free and MIT-licensed, forever. Pro adds whole application surfaces — CRM, command center, AI workspace, admin console — and Teams adds a private registry of your own.",
  path: "/pricing",
  keywords: [
    "react ui library pricing",
    "free react component library",
    "premium react components",
    "react admin template price",
    "tailwind ui alternative",
  ],
});

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
    <SiteShell width="default">
      <div>
        <PageHeader
          eyebrow="Pricing"
          title="The components are free. The applications are Pro."
          cosmic="hero"
          seed={53}
          align="center"
          className="mx-auto max-w-4xl pt-16 sm:pt-20"
          description="Every component and every block that has ever shipped free stays free, under MIT. Pro is the catalogue of whole application surfaces built on top of them, and Teams is for organisations that want a registry of their own."
        />

        <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
          <Tier
            name="Free"
            price="$0"
            cadence="MIT, forever"
            summary="The whole component library, the blocks it started with, and every tool around them."
            features={[
              `${String(components.length)} components, installed as source you own`,
              `${String(free.length)} blocks: auth, dashboard, analytics, billing, settings, AI chat, agent console and more`,
              "The CLI, thirteen themes and the Theme Studio",
              "Agent docs, an MCP server, llms.txt and create-dowel-app",
              "Per-component quality scores and the accessibility notes behind them",
            ]}
            action={
              <div className="grid gap-2">
                <Button asChild size="lg" className="w-full">
                  <Link href="/docs/installation">Get started</Link>
                </Button>
                {/* The free tier is the one with nobody to escalate to, which
                    is exactly why it gets an address. A question about the
                    part that costs nothing is still a question. */}
                <p className="text-center text-xs text-muted-foreground">
                  Questions?{" "}
                  <a
                    href={supportMailto(links)}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {links.contactEmail}
                  </a>
                </p>
              </div>
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
                {/* Straight to the address rather than to a form. At this size
                    the conversation is with a person, and saying so — by
                    showing where the mail goes — is worth more than a button
                    that hides its destination. */}
                <Button asChild size="lg" variant="outline" className="w-full">
                  <a href={links.contactUrl}>Start a conversation</a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <a
                    href={links.contactUrl}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {links.contactEmail}
                  </a>
                  , or read how a{" "}
                  <Link href="/docs/private-registry" className="underline underline-offset-4">
                    private registry
                  </Link>{" "}
                  works.
                </p>
              </div>
            }
          />
        </div>

        <section aria-labelledby="pricing-faq" className="mx-auto mt-24 max-w-3xl">
          <p className="eyebrow">FAQ</p>
          <h2 id="pricing-faq" className="display-md text-luminous mt-4">
            Questions
          </h2>
          <dl className="mt-8 grid divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
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
      </div>
    </SiteShell>
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
          ? "relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-[var(--cosmic-blue)] bg-[var(--pane-raised)] p-6 shadow-[0_0_0_1px_var(--cosmic-blue),0_40px_120px_-40px_var(--glow-blue)] lg:-mt-4 lg:pb-10"
          : "flex flex-col gap-6 rounded-2xl border border-[var(--hairline)] bg-[var(--pane)] p-6"
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
            <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase">
              Most capable
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-4xl font-semibold tracking-tight">{price}</p>
        <p className="text-sm text-muted-foreground">{cadence}</p>
        <p className="mt-3 text-sm text-pretty text-muted-foreground">{summary}</p>
      </div>

      <ul className="grid flex-1 gap-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--cosmic-blue)]" aria-hidden />
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
    <div className="py-5">
      <dt className="font-medium">{title}</dt>
      <dd className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">{children}</dd>
    </div>
  );
}
