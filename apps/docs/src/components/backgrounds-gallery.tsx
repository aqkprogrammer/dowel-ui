"use client";

import { cn } from "@dowel-ui/react";
import { Button } from "@dowel-ui/react/button";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { AuroraBackground } from "@ui/components/aurora-background";
import { BubbleBackground } from "@ui/components/bubble-background";
import { CosmicBackground } from "@ui/components/cosmic-background";
import { FireworksBackground } from "@ui/components/fireworks-background";
import { GradientBackground } from "@ui/components/gradient-background";
import { GravityStarsBackground } from "@ui/components/gravity-stars-background";
import { HexagonBackground } from "@ui/components/hexagon-background";
import { HoleBackground } from "@ui/components/hole-background";
import { ShaderBackground } from "@ui/components/shader-background";
import { StarsBackground } from "@ui/components/stars-background";
import { ArrowUpRight, Eye, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

import type { BackgroundCategory, BackgroundEntry, BackgroundTone } from "~/lib/backgrounds";

import { InstallCommand } from "./install-command";
import { useNearViewport } from "./live-stage";
import { CodePanel } from "./site/code-panel";
import { FilterChips } from "./site/filter-chips";

/**
 * The backgrounds, as a gallery: one large stage at the top showing the chosen
 * background behind a sample hero, and a card per background below it with a
 * live preview, the install command and a prompt to hand to a coding agent.
 *
 * Previews mount only while on screen. Fourteen of these are WebGL, and a
 * browser keeps around sixteen contexts before it starts dropping the oldest —
 * so the grid never holds more live scenes than fit in the window.
 */

export interface GalleryItem extends BackgroundEntry {
  prompt: string;
  sectionCode: string;
  pageCode: string;
}

// Each component's props differ; the catalogue holds the right ones for each.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<string, ComponentType<any>> = {
  "shader-background": ShaderBackground,
  "aurora-background": AuroraBackground,
  "bubble-background": BubbleBackground,
  "cosmic-background": CosmicBackground,
  "fireworks-background": FireworksBackground,
  "gradient-background": GradientBackground,
  "gravity-stars-background": GravityStarsBackground,
  "hexagon-background": HexagonBackground,
  "hole-background": HoleBackground,
  "stars-background": StarsBackground,
};

const STAGE_ID = "backgrounds-stage";

const TEXT: Record<BackgroundTone, string> = {
  dark: "text-white",
  light: "text-slate-950",
  theme: "text-foreground",
};

const MUTED: Record<BackgroundTone, string> = {
  dark: "text-white/75",
  light: "text-slate-700",
  theme: "text-muted-foreground",
};

function Background({
  item,
  className,
  card = false,
  children,
}: {
  item: BackgroundEntry;
  className?: string;
  /** Card-sized: shader scenes render at reduced density, which nobody can see at this size. */
  card?: boolean;
  children?: ReactNode;
}) {
  const Drawn = COMPONENTS[item.component];
  if (!Drawn) return null;
  const extra = item.component === "shader-background" && card ? { resolution: 0.6 } : {};
  return (
    <Drawn {...item.props} {...extra} className={className}>
      {children}
    </Drawn>
  );
}

function Stage({ item }: { item: GalleryItem }) {
  return (
    <section
      id={STAGE_ID}
      aria-labelledby="backgrounds-stage-title"
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-[var(--hairline)] bg-background"
    >
      <Background
        key={item.id}
        item={item}
        className="min-h-[26rem] bg-background sm:min-h-[30rem]"
      >
        <div
          className={cn(
            "flex min-h-[26rem] flex-col items-center justify-center gap-5 px-6 py-16 text-center sm:min-h-[30rem]",
            TEXT[item.tone],
          )}
        >
          <p className={cn("font-mono text-xs tracking-widest uppercase", MUTED[item.tone])}>
            {item.title}
          </p>
          <h2
            id="backgrounds-stage-title"
            className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            A background that sets the mood before the first word
          </h2>
          <p className={cn("max-w-md text-base text-pretty", MUTED[item.tone])}>
            {item.description}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CopyButton value={item.prompt} copiedLabel="Prompt copied" tone="success">
              Copy prompt
            </CopyButton>
            <Button
              asChild
              variant="outline"
              className="bg-background/60 text-foreground backdrop-blur"
            >
              <Link href={`/docs/components/${item.component}`}>
                Docs
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Background>
    </section>
  );
}

function Card({
  item,
  label,
  onPreview,
  active,
}: {
  item: GalleryItem;
  label: string;
  onPreview: () => void;
  active: boolean;
}) {
  const [ref, near] = useNearViewport<HTMLDivElement>("0px");
  return (
    <li id={item.id} className="min-w-0 scroll-mt-24">
      <article
        aria-labelledby={`${item.id}-title`}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--pane)]",
          active ? "border-[var(--cosmic-blue)]" : "border-[var(--hairline)]",
        )}
      >
        <div
          ref={ref}
          className="relative aspect-[16/10] border-b border-[var(--hairline)] bg-muted/40"
        >
          {near ? (
            <Background item={item} card className="absolute inset-0 bg-background" />
          ) : null}
          <span className="absolute top-2 left-2 z-20 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[0.625rem] text-white backdrop-blur">
            {item.engine}
            {item.interactive ? " · interactive" : ""}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`${item.id}-title`} className="font-medium text-foreground">
                {item.title}
              </h3>
              <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">{item.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton
              value={item.prompt}
              size="sm"
              copiedLabel="Copied"
              tone="success"
              aria-label={`Copy the ${item.title} prompt`}
              icon={<Sparkles aria-hidden="true" />}
            >
              Copy prompt
            </CopyButton>
            <Button
              size="sm"
              variant="outline"
              onClick={onPreview}
              aria-pressed={active}
              aria-label={`Show ${item.title} on the stage`}
            >
              <Eye aria-hidden="true" />
              Preview
            </Button>
          </div>

          <InstallCommand args={`add ${item.component}`} compact />

          <details className="group/prompt mt-auto rounded-xl border border-[var(--hairline)] [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/55">
              Prompt and code
              <span
                aria-hidden="true"
                className="text-muted-foreground transition-transform group-open/prompt:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="flex flex-col gap-3 px-3 pb-3">
              <CodePanel code={item.prompt} language="text" title="Prompt" collapseAfter={10} />
              <CodePanel code={item.sectionCode} title="Behind a section" collapseAfter={8} />
              <CodePanel code={item.pageCode} title="Behind the whole page" collapseAfter={8} />
            </div>
          </details>
        </div>
      </article>
    </li>
  );
}

export function BackgroundsGallery({
  items,
  categories,
}: {
  items: GalleryItem[];
  categories: { id: BackgroundCategory; label: string }[];
}) {
  const [filter, setFilter] = useState<"all" | BackgroundCategory>("all");
  const [stageId, setStageId] = useState(items[0]?.id ?? "");
  const stage = items.find((item) => item.id === stageId) ?? items[0];
  const labels = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.label])),
    [categories],
  );

  const chips = [
    { id: "all", label: "All", count: items.length },
    ...categories.map((category) => ({
      id: category.id,
      label: category.label,
      count: items.filter((item) => item.category === category.id).length,
    })),
  ].filter((chip) => chip.count > 0);

  const shown = filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="flex flex-col gap-8">
      {stage ? <Stage item={stage} /> : null}

      <FilterChips
        label="Filter backgrounds"
        chips={chips}
        value={filter}
        onChange={(id) => {
          setFilter(id as "all" | BackgroundCategory);
        }}
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((item) => (
          <Card
            key={item.id}
            item={item}
            label={labels[item.category] ?? item.category}
            active={item.id === stage?.id}
            onPreview={() => {
              setStageId(item.id);
              document.getElementById(STAGE_ID)?.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              });
            }}
          />
        ))}
      </ul>
    </div>
  );
}
