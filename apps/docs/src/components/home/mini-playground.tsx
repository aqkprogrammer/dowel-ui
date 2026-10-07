"use client";

import { cn } from "@dowel-ui/react";
import { Button, type ButtonProps } from "@dowel-ui/react/button";
import { Switch } from "@dowel-ui/react/switch";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { CodePanel } from "../site/code-panel";

/**
 * The playground, in miniature, on the home page.
 *
 * Real: the button is the library's, the options are the ones its `cva()`
 * call declares (handed down from the generated variant table on the server),
 * and the code is written the way the full playground writes it — a prop left
 * at its default is left out. It is the full playground's idea at the size of
 * one component, with a link to the rest.
 */

export interface MiniAxis {
  prop: string;
  options: string[];
  fallback?: string;
}

/** Sizes that hold a label; the icon sizes need an icon child instead. */
const LABELLED_SIZES = new Set(["sm", "md", "lg"]);

function jsx(values: Record<string, string>, axes: MiniAxis[], loading: boolean): string {
  const attributes = axes
    .filter((axis) => values[axis.prop] !== axis.fallback)
    .map((axis) => `${axis.prop}="${values[axis.prop] ?? ""}"`);
  if (loading) attributes.push("loading");
  const open = attributes.length > 0 ? `<Button ${attributes.join(" ")}>` : "<Button>";
  return `import { Button } from "@/components/ui/button";\n\nexport function Continue() {\n  return ${open}Continue</Button>;\n}`;
}

export function MiniPlayground({ axes }: { axes: MiniAxis[] }) {
  const usable = axes
    .filter((axis) => axis.prop === "variant" || axis.prop === "size" || axis.prop === "shape")
    .map((axis) =>
      axis.prop === "size"
        ? { ...axis, options: axis.options.filter((option) => LABELLED_SIZES.has(option)) }
        : axis,
    );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      usable.map((axis) => [axis.prop, axis.fallback ?? axis.options[0] ?? ""]),
    ),
  );
  const [loading, setLoading] = useState(false);
  const loadingId = useId();
  const code = jsx(values, usable, loading);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]">
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
          <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
          <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
        </span>
        <span className="ms-2 font-mono text-xs text-muted-foreground">
          playground · button
        </span>
        <Link
          href="/playground?c=button"
          className="ms-auto inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
        >
          Open full playground
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>

      <div className="grid md:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="grid content-start gap-5 border-b border-[var(--hairline)] p-5 md:border-e md:border-b-0">
          {usable.map((axis) => (
            <fieldset key={axis.prop} className="grid gap-2">
              <legend className="mb-2 font-mono text-[0.6875rem] tracking-wide text-muted-foreground">
                {axis.prop}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {axis.options.map((option) => {
                  const active = values[axis.prop] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setValues((current) => ({ ...current, [axis.prop]: option }));
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                        active
                          ? "border-[var(--hairline-strong)] bg-[var(--pane-raised)] text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={loadingId}
              className="font-mono text-[0.6875rem] tracking-wide text-muted-foreground"
            >
              loading
            </label>
            <Switch id={loadingId} checked={loading} onCheckedChange={setLoading} />
          </div>
        </div>

        <div className="grid min-w-0 grid-rows-[minmax(11rem,1fr)_auto]">
          <div className="stage-surface grid place-items-center p-8">
            <Button
              variant={values.variant as ButtonProps["variant"]}
              size={values.size as ButtonProps["size"]}
              shape={values.shape as ButtonProps["shape"]}
              loading={loading}
            >
              Continue
            </Button>
          </div>
          <CodePanel
            code={code}
            language="tsx"
            title="continue.tsx"
            highlight={[4]}
            className="rounded-none border-x-0 border-b-0"
          />
        </div>
      </div>
    </div>
  );
}
