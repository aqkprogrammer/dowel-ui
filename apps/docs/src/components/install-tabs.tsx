"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { Terminal, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { PackageInstallCommand } from "~/components/install-command";
import { CodePanel } from "~/components/site/code-panel";
import { branding } from "~/lib/branding";
import type { ManualFile, ManualInstall } from "~/lib/manual-install";

/**
 * Installation, two ways: one CLI command, or the same thing done by hand.
 *
 * The manual steps are the CLI's work written out — the packages, the tokens
 * and utilities `init` would have added, every component this one imports and
 * the files themselves — so someone who cannot or would rather not run a CLI
 * in their project still ends up with exactly what it would have written.
 */

type Mode = "cli" | "manual";

const KEY = "docs-install-mode";
const EVENT = "docs-install-mode-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function readMode(): Mode {
  try {
    return window.localStorage.getItem(KEY) === "manual" ? "manual" : "cli";
  } catch {
    return "cli";
  }
}

function writeMode(mode: Mode): void {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // A choice that cannot be remembered still applies to this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function InstallTabs({
  cli,
  manual,
}: {
  /** The CLI view: the command and what it installs. */
  cli: ReactNode;
  /** Absent for a licensed item, whose source is not public: the CLI view alone. */
  manual?: ManualInstall;
}) {
  // Remembered, like the package manager: someone copying by hand does it for
  // every component, not one.
  const mode = useSyncExternalStore<Mode>(subscribe, readMode, () => "cli");

  // A link to `#manual` — "View code" on a block card — means the source.
  useEffect(() => {
    if (window.location.hash !== "#manual") return;
    writeMode("manual");
    // The browser jumped to the anchor before the preview above it had its
    // height, so the jump has landed somewhere above it by now.
    requestAnimationFrame(() => {
      document.getElementById("manual")?.scrollIntoView();
    });
  }, []);

  if (!manual) return <>{cli}</>;

  return (
    <Tabs
      id="manual"
      className="scroll-mt-24"
      value={mode}
      onValueChange={(value) => {
        writeMode(value === "manual" ? "manual" : "cli");
      }}
    >
      <TabsList indicator="slide" aria-label="Installation method">
        <TabsTrigger value="cli">
          <Terminal aria-hidden="true" />
          CLI
        </TabsTrigger>
        <TabsTrigger value="manual">
          <Wrench aria-hidden="true" />
          Manual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cli" className="mt-4">
        {cli}
      </TabsContent>

      <TabsContent value="manual" className="mt-6">
        <ManualSteps manual={manual} />
      </TabsContent>
    </Tabs>
  );
}

function ManualSteps({ manual }: { manual: ManualInstall }) {
  return (
    <ol className="relative ms-3.5 grid gap-10 border-s border-[var(--hairline)] ps-7 [counter-reset:step]">
      <Step title="Install the npm packages">
        <PackageInstallCommand packages={manual.dependencies} />
      </Step>

      <Step
        title="Add the design tokens"
        description={
          <>
            Paste these after <InlineCode>@import &quot;tailwindcss&quot;;</InlineCode> in the
            stylesheet that imports Tailwind. Already done if you have run{" "}
            <InlineCode>{branding.cliName} init</InlineCode> or installed another component.
          </>
        }
      >
        <Files files={[manual.tokens]} collapseAfter={12} />
      </Step>

      <Step
        title="Add the shared utilities"
        description="The class merger and the interaction-state styles every component imports. Also added once per project."
      >
        <Files files={manual.utils} collapseAfter={12} />
      </Step>

      {manual.parts.length > 0 ? (
        <Step
          title="Copy the components it imports"
          description={`${manual.parts.length === 1 ? "One component" : `${String(manual.parts.length)} components`} this one is built from. Skip any you already have.`}
        >
          <div className="grid gap-6">
            {manual.parts.map((part) => (
              <div key={part.name} className="grid gap-2">
                <Link
                  href={`/docs/components/${part.name}`}
                  className="w-fit rounded text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  {part.title}
                </Link>
                <Files files={part.files} collapseAfter={12} />
              </div>
            ))}
          </div>
        </Step>
      ) : null}

      <Step title="Copy the source code">
        <Files files={manual.files} collapseAfter={20} lineNumbers />
      </Step>

      <Step
        title="Update the import paths"
        description={
          <>
            The files import from <InlineCode>@/components/ui</InlineCode> and{" "}
            <InlineCode>@/lib</InlineCode>, the default aliases. If your project keeps them
            somewhere else, change those imports to match — the CLI reads your{" "}
            <InlineCode>tsconfig.json</InlineCode> and does this for you.
          </>
        }
      />
    </ol>
  );
}

function Step({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="relative min-w-0 [counter-increment:step]">
      <span
        aria-hidden="true"
        className="absolute -start-[2.65rem] top-0 flex size-7 items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-[var(--pane-raised)] font-mono text-xs text-foreground before:content-[counter(step)]"
      />
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4 min-w-0">{children}</div> : null}
    </li>
  );
}

function Files({
  files,
  collapseAfter,
  lineNumbers = false,
}: {
  files: ManualFile[];
  collapseAfter: number;
  lineNumbers?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {files.map((file) => (
        <CodePanel
          key={file.path}
          title={file.path}
          language={file.language}
          code={file.code}
          collapseAfter={collapseAfter}
          lineNumbers={lineNumbers}
        />
      ))}
    </div>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-[var(--pane-raised)] px-1 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}
