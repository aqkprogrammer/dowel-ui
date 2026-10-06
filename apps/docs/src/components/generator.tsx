"use client";

import { cn } from "@dowel-ui/react";
import { Button } from "@dowel-ui/react/button";
// From the browser-safe entry, not the package root: the root reads the
// filesystem to build a registry, and pulling it into a client bundle drags
// `node:fs` in with it.
import {
  planUi,
  renderBrief,
  renderPlan,
  type PlanEntry,
  type RegistryIndex,
} from "@dowel-ui/registry/generate";
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  CornerDownLeft,
  LayoutTemplate,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { LiveStage } from "./live-stage";
import { CodePanel } from "./site/code-panel";
import { StoryPreview } from "./story-preview";

const EXAMPLES = [
  "an AI customer support dashboard with a ticket table and an assistant",
  "a billing page with usage and invoices",
  "a console for watching agents run, with approvals",
  "settings with notifications and an API key",
];

type OutputView = "install" | "code" | "brief";

/**
 * Describe a screen, get the components that build it.
 *
 * Everything here is resolved against the registry before anything is written,
 * so it cannot name a component that does not exist — which is the failure mode
 * of asking a model directly. It stops at the composition rather than writing
 * props: those are published on each registry item, read from its type, and
 * the output links to the page that shows them.
 *
 * The page says plainly that this is a planner, not a model. The previews
 * under a plan are the real parts it chose, live — the closest honest thing
 * to "generated UI" there is.
 */
export function Generator({ index, docsUrl }: { index: RegistryIndex; docsUrl: string }) {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [view, setView] = useState<OutputView>("install");
  const promptId = useId();

  const plan = useMemo(
    () => (submitted.trim().length > 0 ? planUi(submitted, index) : undefined),
    [submitted, index],
  );

  function run(text: string) {
    setPrompt(text);
    setSubmitted(text);
    setView("install");
  }

  const install = plan ? `npx @dowel-ui/cli add ${plan.install.join(" ")}` : "";
  const entries: PlanEntry[] = plan ? [...plan.blocks, ...plan.components] : [];

  return (
    <div className="grid gap-10">
      <form
        className="mx-auto w-full max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (prompt.trim()) run(prompt);
        }}
      >
        <div className="glass relative overflow-hidden rounded-2xl border border-[var(--hairline-strong)] shadow-[0_30px_100px_-40px_var(--glow-blue)] focus-within:border-[var(--cosmic-blue)] focus-within:shadow-[0_0_0_4px_var(--glow-blue),0_30px_100px_-40px_var(--glow-blue)]">
          <label htmlFor={promptId} className="sr-only">
            What are you building?
          </label>
          <textarea
            id={promptId}
            value={prompt}
            rows={3}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && prompt.trim()) {
                event.preventDefault();
                run(prompt);
              }
            }}
            placeholder="Create an analytics dashboard with a revenue chart and a recent activity feed…"
            className="block w-full resize-none bg-transparent px-5 pt-5 pb-2 text-base outline-none placeholder:text-muted-foreground sm:text-lg"
          />
          <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-3">
            <span className="hidden items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground sm:flex">
              <Sparkles aria-hidden="true" className="size-3.5 text-[var(--cosmic-blue)]" />
              Matched against {index.items.length} registry items
              <span aria-hidden="true">·</span>
              <kbd className="inline-flex items-center gap-0.5">
                ⌘<CornerDownLeft className="size-3" />
              </kbd>
            </span>
            <Button
              type="submit"
              disabled={prompt.trim().length === 0}
              className="ms-auto bg-foreground text-background hover:bg-foreground/90"
            >
              Plan it
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                run(example);
              }}
              className={cn(
                "rounded-full border border-[var(--hairline)] bg-[var(--pane)] px-3 py-1 text-xs text-muted-foreground",
                "transition-colors hover:border-[var(--hairline-strong)] hover:text-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              )}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* A one-line summary announces the result: the form does not move
          focus, so someone using a screen reader would otherwise submit and
          hear nothing — and reading the whole plan aloud would be too much. */}
      <p role="status" className="sr-only">
        {plan === undefined
          ? ""
          : plan.empty
            ? "Nothing in the registry matches that."
            : `Plan ready: ${String(plan.blocks.length)} blocks and ${String(plan.components.length)} components.`}
      </p>
      <div>
        {plan === undefined ? (
          <ol className="mx-auto grid max-w-3xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {[
              ["01", "Describe", "A screen, in plain words."],
              [
                "02",
                "Plan",
                "Blocks and components that exist, with the reason each was picked.",
              ],
              [
                "03",
                "Install",
                "One command, a starting file, and a brief for your coding agent.",
              ],
            ].map(([step, title, body]) => (
              <li key={step} className="rounded-2xl border border-[var(--hairline)] p-4">
                <span className="font-mono text-xs text-[var(--cosmic-blue)]">{step}</span>
                <p className="mt-2 font-medium text-foreground">{title}</p>
                <p className="mt-1 text-pretty">{body}</p>
              </li>
            ))}
          </ol>
        ) : plan.empty ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[var(--hairline-strong)] px-6 py-12 text-center">
            <p className="font-medium">Nothing in the registry matches that.</p>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              Try simpler words — &ldquo;billing&rdquo;, &ldquo;chat&rdquo;,
              &ldquo;table&rdquo;. If there really is nothing, that is the answer: build it from
              primitives rather than assuming it exists under another name.
            </p>
          </div>
        ) : (
          <div className="grid gap-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">The plan</p>
                <h2 className="display-md text-luminous mt-3">
                  {plan.blocks.length > 0
                    ? `${String(plan.blocks.length)} ${plan.blocks.length === 1 ? "block" : "blocks"}`
                    : ""}
                  {plan.blocks.length > 0 && plan.components.length > 0 ? " and " : ""}
                  {plan.components.length > 0
                    ? `${String(plan.components.length)} ${plan.components.length === 1 ? "component" : "components"}`
                    : ""}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  For &ldquo;{plan.prompt}&rdquo; — every name below is one you can install.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section aria-label="What to install">
                <ul className="grid gap-2">
                  {entries.map((item) => {
                    const block = item.entry.type === "registry:block";
                    const Icon = block ? LayoutTemplate : Box;
                    return (
                      <li key={item.entry.name}>
                        <Link
                          href={`/docs/${block ? "blocks" : "components"}/${item.entry.name}`}
                          className="group flex gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--pane)] p-4 transition-colors outline-none hover:border-[var(--hairline-strong)] focus-visible:ring-2 focus-visible:ring-ring/55"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--hairline)] bg-background">
                            <Icon
                              aria-hidden="true"
                              className="size-4 text-[var(--cosmic-blue)]"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.entry.title}</span>
                              <span className="font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                                {block ? "block" : "component"}
                              </span>
                              {item.entry.access === "pro" ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase">
                                  <Lock aria-hidden="true" className="size-2.5" />
                                  Pro
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-sm text-pretty text-muted-foreground">
                              {item.entry.description}
                            </span>
                            {/* Why it was picked, so a wrong suggestion is
                                arguable rather than mysterious. */}
                            <span className="mt-2 block font-mono text-[0.6875rem] text-muted-foreground">
                              matched on {item.because}
                            </span>
                          </span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section aria-label="Output" className="min-w-0">
                <div
                  role="group"
                  aria-label="Output"
                  className="mb-3 inline-flex items-center gap-0.5 rounded-lg border border-[var(--hairline)] bg-[var(--pane)] p-0.5"
                >
                  {(
                    [
                      ["install", "Install"],
                      ["code", "Starting file"],
                      ["brief", "Agent brief"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={view === value}
                      onClick={() => {
                        setView(value);
                      }}
                      className={cn(
                        "h-7 rounded-md px-3 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                        view === value
                          ? "bg-[var(--pane-raised)] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {view === "install" ? (
                  <CodePanel language="bash" title="Terminal" code={install} />
                ) : view === "code" ? (
                  <CodePanel
                    language="tsx"
                    title="page.tsx"
                    code={renderPlan(plan, { docsUrl })}
                    collapseAfter={30}
                  />
                ) : (
                  <CodePanel
                    language="text"
                    title="Paste into your coding agent"
                    code={renderBrief(plan, { docsUrl })}
                    collapseAfter={30}
                  />
                )}
              </section>
            </div>

            <section aria-labelledby="plan-previews">
              <h3 id="plan-previews" className="text-lg font-semibold tracking-tight">
                The parts, live
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Not a mock-up of the result: each piece the plan chose, running.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {entries.map((item) => {
                  const block = item.entry.type === "registry:block";
                  const pro = item.entry.access === "pro";
                  return (
                    <li
                      key={item.entry.name}
                      className={cn(
                        "overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]",
                        block && "sm:col-span-2",
                      )}
                    >
                      {pro ? (
                        <div className="stage-surface grid h-48 place-items-center px-6 text-center text-sm text-muted-foreground">
                          A Pro block — its preview is on its own page.
                        </div>
                      ) : (
                        <div className="relative">
                          <LiveStage
                            className={cn("stage-surface", block ? "h-80" : "h-52")}
                            stageWidth={block ? 1280 : 440}
                            fit={block ? "width" : "contain"}
                            fill={block ? 1 : 0.84}
                            maxScale={1}
                            placeholder={<div className="absolute inset-0" />}
                          >
                            <StoryPreview component={item.entry.name} />
                          </LiveStage>
                          {block ? (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--pane)] to-transparent"
                            />
                          ) : null}
                        </div>
                      )}
                      <p className="border-t border-[var(--hairline)] px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {item.entry.name}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
