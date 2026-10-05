"use client";

import { cn } from "@dowel-ui/react";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { ArrowUpRight, Code2, Layers, Lock } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";

import { branding } from "~/lib/branding";

import { usePackageRunner } from "../install-command";
import { LiveStage } from "../live-stage";

const StoryPreview = dynamic(() => import("../story-preview").then((mod) => mod.StoryPreview), {
  ssr: false,
});

export interface BlockCardItem {
  name: string;
  title: string;
  description: string;
  /** Browsing group label, from the site's taxonomy. */
  groupLabel: string;
  components: number;
  pro: boolean;
  /** How the preview meets the card: whole screens crop, small forms fit. */
  fit: "contain" | "width";
  /** Width the block is laid out at before it is scaled into the card. */
  stageWidth: number;
  /** Build-time markup for a licensed block, which is never shipped live. */
  still?: string;
}

/**
 * One block in the gallery: a large preview first, then what it is, and the
 * three things someone does next — look at it properly, read its code,
 * install it.
 *
 * A licensed block's preview is its build-time still, scaled the same way as
 * a live one; its "code" link goes to the page that explains how its source is
 * delivered rather than to a code view that would be empty.
 */
export function BlockCard({ block, index = 0 }: { block: BlockCardItem; index?: number }) {
  const { prefix } = usePackageRunner();
  const command = `${prefix} ${branding.cliPackage} add ${block.name}`;
  const href = `/docs/blocks/${block.name}`;

  return (
    <li
      className="docs-card-in min-w-0"
      style={{ "--card-delay": `${String(Math.min(index, 8) * 40)}ms` } as CSSProperties}
    >
      <article className="group/card lift relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]">
        <ViewTransition name={`preview-${block.name}`} share="morph" default="none">
          <div className="relative h-72 border-b border-[var(--hairline)] sm:h-80">
            <LiveStage
              className="stage-surface absolute inset-0"
              stageWidth={block.stageWidth}
              fit={block.fit}
              fill={block.fit === "width" ? 1 : 0.88}
              maxScale={1}
              placeholder={
                <div className="absolute inset-0 grid place-items-center">
                  <Layers
                    aria-hidden="true"
                    className="size-5 text-muted-foreground motion-safe:animate-pulse"
                  />
                </div>
              }
            >
              {block.still ? (
                // Inert and hidden: the card's text says what this is, and none
                // of the controls in a still can be used.
                <div
                  inert
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: block.still }}
                />
              ) : (
                <StoryPreview component={block.name} />
              )}
            </LiveStage>
            {block.fit === "width" ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--pane)] to-transparent"
              />
            ) : null}
            {block.pro ? (
              <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-[var(--hairline-strong)] bg-background/85 px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase backdrop-blur-sm">
                <Lock aria-hidden="true" className="size-2.5" />
                Pro
              </span>
            ) : null}
          </div>
        </ViewTransition>

        <div className="flex flex-1 flex-col gap-1 p-5 pb-4">
          <ViewTransition name={`title-${block.name}`} share="morph-text" default="none">
            <h3 className="text-base font-medium tracking-tight">
              <Link
                href={href}
                className="outline-none after:absolute after:inset-0 after:z-20"
              >
                {block.title}
              </Link>
            </h3>
          </ViewTransition>
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
            {block.description}
          </p>
          <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
            {block.groupLabel} · built from {block.components}{" "}
            {block.components === 1 ? "component" : "components"}
          </p>
        </div>

        <div className="relative z-30 flex flex-wrap items-center gap-1.5 border-t border-[var(--hairline)] px-3 py-2.5">
          <Link
            href={href}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:bg-[var(--pane-raised)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Preview
          </Link>
          <Link
            href={`${href}#source`}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:bg-[var(--pane-raised)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            <Code2 aria-hidden="true" className="size-3.5" />
            {block.pro ? "How it installs" : "View code"}
          </Link>
          <CopyButton
            value={command}
            variant="ghost"
            size="sm"
            tone="success"
            copiedLabel="Copied"
            aria-label={`Copy install command: add ${block.name}`}
            className={cn(
              "ms-auto h-7 gap-1.5 px-2 font-mono text-[0.6875rem] text-muted-foreground hover:text-foreground [&_svg]:size-3",
            )}
          >
            Install
          </CopyButton>
        </div>
      </article>
    </li>
  );
}
