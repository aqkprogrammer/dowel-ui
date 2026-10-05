"use client";

import { cn } from "@dowel-ui/react";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { useSyncExternalStore } from "react";

import { branding } from "~/lib/branding";

const RUNNERS = [
  { id: "pnpm", prefix: "pnpm dlx" },
  { id: "npm", prefix: "npx" },
  { id: "yarn", prefix: "yarn dlx" },
  { id: "bun", prefix: "bunx" },
] as const;

type Runner = (typeof RUNNERS)[number]["id"];

const KEY = "docs-package-runner";
const EVENT = "docs-package-runner-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function readRunner(): Runner {
  try {
    const stored = window.localStorage.getItem(KEY);
    return RUNNERS.some((runner) => runner.id === stored) ? (stored as Runner) : "pnpm";
  } catch {
    return "pnpm";
  }
}

function writeRunner(runner: Runner): void {
  try {
    window.localStorage.setItem(KEY, runner);
  } catch {
    // A choice that cannot be remembered still applies to this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The reader's package manager, as chosen on any install command on the site. */
export function usePackageRunner(): { runner: Runner; prefix: string } {
  const runner = useSyncExternalStore<Runner>(subscribe, readRunner, () => "pnpm");
  return { runner, prefix: RUNNERS.find((entry) => entry.id === runner)?.prefix ?? "npx" };
}

/**
 * The command to install something, for whichever package manager the reader
 * uses — chosen once, and every command on the site follows. Copying a command
 * that does not work in your project is a small indignity the docs can avoid.
 */
export function InstallCommand({
  args,
  className,
  compact = false,
}: {
  args: string;
  className?: string;
  /** One line, no package-manager switch: for a hero or a card. */
  compact?: boolean;
}) {
  const { runner, prefix } = usePackageRunner();
  // cliPackage, not cliName: this follows the runner, so it is the npm package
  // name — which is not the same as the binary it installs.
  const command = `${prefix} ${branding.cliPackage} ${args}`;

  return (
    <div
      data-slot="install-command"
      className={cn(
        "not-prose min-w-0 overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--pane)]",
        className,
      )}
    >
      {compact ? null : (
        <div
          role="radiogroup"
          aria-label="Package manager"
          className="flex items-center gap-1 border-b border-[var(--hairline)] px-2 py-1.5"
        >
          {RUNNERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={entry.id === runner}
              onClick={() => {
                writeRunner(entry.id);
              }}
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                entry.id === runner
                  ? "bg-[var(--pane-raised)] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.id}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 ps-4 pe-1.5">
        <code className="code-tokens min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto py-3 font-mono text-[0.8125rem] whitespace-nowrap">
          <span aria-hidden="true" className="me-2 text-muted-foreground/60 select-none">
            $
          </span>
          <span className="tok-fn">{prefix}</span> {branding.cliPackage}{" "}
          <span className="text-foreground">{args}</span>
        </code>
        <CopyButton
          value={command}
          variant="ghost"
          size="icon-sm"
          aria-label="Copy install command"
          tone="success"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
        />
      </div>
    </div>
  );
}
