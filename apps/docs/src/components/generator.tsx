"use client";

import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { CodeBlock } from "@dowel-ui/react/code-block";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@dowel-ui/react/empty-state";
import { Input } from "@dowel-ui/react/input";
import { Label } from "@dowel-ui/react/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { cn } from "@dowel-ui/react";
// From the browser-safe entry, not the package root: the root reads the
// filesystem to build a registry, and pulling it into a client bundle drags
// `node:fs` in with it.
import {
  planUi,
  renderBrief,
  renderPlan,
  type RegistryIndex,
} from "@dowel-ui/registry/generate";
import { useMemo, useState } from "react";

const EXAMPLES = [
  "an AI customer support dashboard with a ticket table and an assistant",
  "a billing page with usage and invoices",
  "a console for watching agents run, with approvals",
  "settings with notifications and an API key",
];

/**
 * Describe a screen, get the components that build it.
 *
 * Everything here is resolved against the registry before anything is written,
 * so it cannot name a component that does not exist — which is the failure mode
 * of asking a model directly. It also does not guess at props: the registry
 * publishes what a component is and what it depends on, not the shape of its
 * arguments, so the output stops at the composition and links to the page where
 * the props are documented.
 */
export function Generator({ index, docsUrl }: { index: RegistryIndex; docsUrl: string }) {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState("");

  const plan = useMemo(
    () => (submitted.trim().length > 0 ? planUi(submitted, index) : undefined),
    [submitted, index],
  );

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(prompt);
        }}
      >
        <Label htmlFor="generator-prompt">What are you building?</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="generator-prompt"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            placeholder="a billing page with usage and invoices"
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={prompt.trim().length === 0}>
            Plan it
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setPrompt(example);
                setSubmitted(example);
              }}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground",
                "transition-colors hover:bg-accent hover:text-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              )}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* Results announce themselves: the form does not move focus, so someone
          using a screen reader would otherwise submit and hear nothing. */}
      <div aria-live="polite">
        {plan === undefined ? null : plan.empty ? (
          <EmptyState bordered>
            <EmptyStateTitle>Nothing in the registry matches that</EmptyStateTitle>
            <EmptyStateDescription>
              Try simpler words — &ldquo;billing&rdquo;, &ldquo;chat&rdquo;,
              &ldquo;table&rdquo;. If there really is nothing, that is the answer: build it from
              primitives rather than assuming it exists under another name.
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <div className="grid gap-5">
            <section aria-label="What to install" className="grid gap-3">
              {[...plan.blocks, ...plan.components].map((item) => (
                <div
                  key={item.entry.name}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border p-4"
                >
                  <a
                    href={`${docsUrl}/docs/${
                      item.entry.type === "registry:block" ? "blocks" : "components"
                    }/${item.entry.name}`}
                    className="font-mono text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                  >
                    {item.entry.name}
                  </a>
                  <Badge size="sm" variant="secondary">
                    {item.entry.type === "registry:block" ? "block" : "component"}
                  </Badge>
                  <p className="w-full text-sm text-muted-foreground">
                    {item.entry.description}
                  </p>
                  {/* Why it was picked, so a wrong suggestion is arguable
                      rather than mysterious. */}
                  <p className="w-full text-xs text-muted-foreground">
                    Matched on {item.because}.
                  </p>
                </div>
              ))}
            </section>

            <Tabs defaultValue="install">
              <TabsList variant="underline">
                <TabsTrigger value="install" variant="underline">
                  Install
                </TabsTrigger>
                <TabsTrigger value="code" variant="underline">
                  Starting file
                </TabsTrigger>
                <TabsTrigger value="brief" variant="underline">
                  Agent brief
                </TabsTrigger>
              </TabsList>

              <TabsContent value="install">
                <CodeBlock
                  language="bash"
                  title="Terminal"
                  code={`npx @dowel-ui/cli add ${plan.install.join(" ")}`}
                >
                  {`npx @dowel-ui/cli add ${plan.install.join(" ")}`}
                </CodeBlock>
              </TabsContent>

              <TabsContent value="code">
                <CodeBlock language="tsx" title="page.tsx" code={renderPlan(plan, { docsUrl })}>
                  {renderPlan(plan, { docsUrl })}
                </CodeBlock>
              </TabsContent>

              <TabsContent value="brief">
                <CodeBlock
                  language="text"
                  title="Paste into your coding agent"
                  code={renderBrief(plan, { docsUrl })}
                >
                  {renderBrief(plan, { docsUrl })}
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
