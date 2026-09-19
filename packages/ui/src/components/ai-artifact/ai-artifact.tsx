"use client";

// Ported from SmoothUI AI Artifact (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A frame around something the model produced: a title, a rendered preview,
 * the raw source, and a copy action.
 *
 * The two panes live on one horizontal axis — preview before code, always —
 * so switching has a direction: code arrives from the inline end, preview from
 * the inline start, and after one go the user knows where the other pane went.
 * A cross-fade would leave no such memory. The slide is a CSS keyframe that
 * only runs after the first switch (not on mount), mirrors in right-to-left
 * layouts, and stops under reduced motion.
 *
 * SmoothUI slides a shared indicator between the tabs with Motion's layoutId;
 * that belongs to Tabs itself, so this composes Dowel's Tabs as they are.
 */

const PREFIX = "dowel-ai-artifact";
const STYLES = `
.${PREFIX}{--artifact-dir:1}
.${PREFIX}:dir(rtl){--artifact-dir:-1}
.${PREFIX}[data-switched] [data-slot=artifact-pane][data-state=active]{animation:${PREFIX}-in var(--duration-normal) var(--ease-out-quint)}
@keyframes ${PREFIX}-in{from{opacity:0;transform:translateX(calc(var(--artifact-from) * var(--artifact-dir)))}}
`;

export type ArtifactPane = "preview" | "code";

export interface ArtifactProps extends Omit<ComponentPropsWithRef<"div">, "title"> {
  /** Names the artifact so it can be referred to in conversation. */
  title: ReactNode;
  /** The rendered form. */
  preview?: ReactNode;
  /** The raw form — source, JSON, markup. Pre-highlighted markup is fine. */
  code?: ReactNode;
  /** Plain text for the clipboard. Omit to hide the copy action. */
  copyValue?: string;
  /** Controlled pane. */
  pane?: ArtifactPane;
  /** Initial pane when uncontrolled. */
  defaultPane?: ArtifactPane;
  onPaneChange?: (pane: ArtifactPane) => void;
  /** Extra toolbar actions, after the pane switch. */
  actions?: ReactNode;
  /** Tab labels. */
  labels?: Partial<Record<ArtifactPane, string>>;
}

const paneClass = "mt-0 rounded-b-xl";

/** A titled frame for generated output, with preview and code panes. */
export function Artifact({
  className,
  title,
  preview,
  code,
  copyValue,
  pane: paneProp,
  defaultPane = "preview",
  onPaneChange,
  actions,
  labels,
  ...props
}: ArtifactProps) {
  const titleId = useId();
  const [uncontrolled, setUncontrolled] = useState<ArtifactPane>(defaultPane);
  const [switched, setSwitched] = useState(false);
  const available: ArtifactPane[] = [];
  if (preview != null) available.push("preview");
  if (code != null) available.push("code");
  const requested = paneProp ?? uncontrolled;
  const pane = available.includes(requested) ? requested : (available[0] ?? "preview");
  const tabbed = available.length > 1;
  const names = { preview: "Preview", code: "Code", ...labels };

  function change(next: string) {
    const value = next as ArtifactPane;
    setSwitched(true);
    if (paneProp === undefined) setUncontrolled(value);
    onPaneChange?.(value);
  }

  const codeBlock = (
    <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
      {code}
    </pre>
  );
  const previewBlock = <div className="p-3">{preview}</div>;

  const toolbar = (
    <div
      data-slot="artifact-header"
      className="flex items-center gap-2 border-b border-border px-2 py-1.5"
    >
      <span id={titleId} className="min-w-0 truncate px-1 text-xs font-medium text-foreground">
        {title}
      </span>
      <div className="ms-auto flex items-center gap-1">
        {tabbed ? (
          <TabsList className="h-auto gap-0.5 p-0.5">
            {available.map((candidate) => (
              <TabsTrigger key={candidate} value={candidate} className="h-6 px-2 text-xs">
                {names[candidate]}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        {actions}
        {copyValue !== undefined ? (
          <CopyButton
            value={copyValue}
            variant="ghost"
            size="icon-sm"
            aria-label="Copy"
            className="size-7 text-muted-foreground"
          />
        ) : null}
      </div>
    </div>
  );

  const root = cn(
    PREFIX,
    "w-full overflow-hidden rounded-xl border border-border bg-background",
    className,
  );

  if (!tabbed) {
    return (
      <div
        role="group"
        aria-labelledby={titleId}
        data-slot="artifact"
        data-pane={pane}
        className={root}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        {toolbar}
        {pane === "code" ? (
          // A scroll box must be reachable by keyboard, so it is a focusable,
          // named region (ADR 0009).
          <div
            role="region"
            aria-labelledby={titleId}
            tabIndex={0}
            className={cn("rounded-b-xl", focusRingInset)}
          >
            {codeBlock}
          </div>
        ) : (
          previewBlock
        )}
      </div>
    );
  }

  return (
    <Tabs value={pane} onValueChange={change} asChild>
      <div
        role="group"
        aria-labelledby={titleId}
        data-slot="artifact"
        data-pane={pane}
        data-switched={switched ? "" : undefined}
        className={root}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        {toolbar}
        <div className="overflow-hidden">
          <TabsContent
            value="preview"
            data-slot="artifact-pane"
            className={paneClass}
            style={{ ["--artifact-from" as string]: "-24px" }}
          >
            {previewBlock}
          </TabsContent>
          <TabsContent
            value="code"
            data-slot="artifact-pane"
            className={paneClass}
            style={{ ["--artifact-from" as string]: "24px" }}
          >
            {codeBlock}
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
