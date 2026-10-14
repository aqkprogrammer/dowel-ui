"use client";

import { cn } from "@dowel-ui/react";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { useSyncExternalStore } from "react";

import { branding } from "~/lib/branding";

const RUNNERS = [
  { id: "pnpm", prefix: "pnpm dlx", add: "pnpm add" },
  { id: "npm", prefix: "npx", add: "npm install" },
  { id: "yarn", prefix: "yarn dlx", add: "yarn add" },
  { id: "bun", prefix: "bunx", add: "bun add" },
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
export function usePackageRunner(): { runner: Runner; prefix: string; add: string } {
  const runner = useSyncExternalStore<Runner>(subscribe, readRunner, () => "pnpm");
  const entry = RUNNERS.find((candidate) => candidate.id === runner);
  return { runner, prefix: entry?.prefix ?? "npx", add: entry?.add ?? "npm install" };
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
  return (
    <CommandBox
      runner={runner}
      command={prefix}
      rest={branding.cliPackage}
      args={args}
      label="Copy install command"
      className={className}
      compact={compact}
    />
  );
}

/**
 * `npm install` for a list of packages, in the reader's package manager — the
 * first step of installing a component by hand.
 */
export function PackageInstallCommand({
  packages,
  dev = false,
  className,
}: {
  packages: string[];
  /** Save them as dev dependencies; every package manager here takes `-D`. */
  dev?: boolean;
  className?: string;
}) {
  const { runner, add } = usePackageRunner();
  return (
    <CommandBox
      runner={runner}
      command={add}
      args={`${dev ? "-D " : ""}${packages.join(" ")}`}
      label={dev ? "Copy dev dependency install command" : "Copy dependency install command"}
      className={className}
    />
  );
}

function CommandBox({
  runner,
  command,
  rest,
  args,
  label,
  className,
  compact = false,
}: {
  runner: Runner;
  command: string;
  rest?: string;
  args: string;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  const full = [command, rest, args].filter(Boolean).join(" ");

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
          <span className="tok-fn">{command}</span>
          {rest ? ` ${rest}` : null} <span className="text-foreground">{args}</span>
        </code>
        <CopyButton
          value={full}
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          tone="success"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
        />
      </div>
    </div>
  );
}
