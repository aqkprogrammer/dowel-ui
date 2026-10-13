import type { Metadata } from "next";

import { AgentDemo } from "~/components/agent-demo/agent-demo";
import { AstraHeaderShell, AstraHero } from "~/components/astra";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { pageMetadata } from "~/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "An agent operating a page, live",
  description:
    "Watch an AI agent work a real page through the page's own actions, take control back mid-run, hand it back with a note, approve what cannot be undone, and undo the rest.",
  path: "/agent-demo",
  keywords: [
    "ai agent ui",
    "agent operable ui",
    "human in the loop react",
    "webmcp react",
    "agent take over hand back",
  ],
});

export default function AgentDemoPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AstraHeaderShell>
        <SiteHeader />
      </AstraHeaderShell>
      <AstraHero variant="banner" leftLabel="Dowel" rightLabel="Agents" />

      <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">
            An agent operating a page, and you taking it back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The table below hands its own actions to the agent as tools: each one runs the same
            code your click does. So you can take the page back by touching it, hand it back
            with a note, approve or decline what cannot be undone, and undo the rest. It is
            built from <code>agent-surface</code>, <code>control-baton</code>,{" "}
            <code>agent-approvals</code>, <code>agent-ledger</code> and{" "}
            <code>agent-replay</code>, as installed.
          </p>
        </div>

        <AgentDemo />
      </main>

      <SiteFooter />
    </div>
  );
}
