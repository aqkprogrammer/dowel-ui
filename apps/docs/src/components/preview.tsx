"use client";

import { CodeBlock } from "@dowel-ui/react/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { cn } from "@dowel-ui/react";
import { useState, type ReactNode } from "react";

import type { ProPreviewStory } from "~/lib/pro-previews.generated";

import { StoryPreview, getStoryNames } from "./story-preview";

/**
 * Prerendered markup, presented as what it is: a picture.
 *
 * `inert` because everything in here looks operable and none of it is — a
 * sidebar that does not open is a worse answer than one that is plainly not
 * offering to. It also takes the whole subtree out of the tab order and out of
 * the accessibility tree, which is what makes the `role="img"` above it honest
 * rather than a label sitting on top of a hundred unreachable controls.
 */
function Still({ html, label }: { html: string; label: string }) {
  return (
    <div role="img" aria-label={label}>
      <div inert dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * A component example: what it looks like, and the code behind it.
 *
 * Tabs rather than a permanently-open code block, because the rendered result
 * is what someone is here to see first and a wall of source above it buries the
 * component.
 */
export interface PreviewProps {
  component: string;
  /** Source shown in the Code tab. */
  source?: string;
  /**
   * Markup rendered at build time, shown instead of a live example.
   *
   * How a licensed block is previewed. Rendering one live would mean importing
   * it into a client component, and a client component's imports are a chunk
   * the browser downloads — which published the whole paid catalogue from
   * pages that merely happened to show a preview.
   */
  prerendered?: ProPreviewStory[];
  /** What that markup shows, for anyone who cannot see it. */
  prerenderedLabel?: string;
  className?: string;
  children?: ReactNode;
}

export function Preview({
  component,
  source,
  prerendered,
  prerenderedLabel,
  className,
  children,
}: PreviewProps) {
  const stories = prerendered
    ? prerendered.map((entry) => entry.name)
    : getStoryNames(component);
  const [story, setStory] = useState(stories[0] ?? "");

  if (stories.length === 0 && !children) return null;

  const still = prerendered?.find((entry) => entry.name === story) ?? prerendered?.[0];

  return (
    <div className={cn("not-prose my-6 grid gap-3", className)}>
      {/* min-w-0: this is a grid item, and the default min-width:auto would
          refuse to shrink below the preview's intrinsic width, defeating the
          scroll container below and widening the whole page instead. */}
      <Tabs defaultValue="preview" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="underline">
            <TabsTrigger value="preview" variant="underline">
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" variant="underline" disabled={!source}>
              Code
            </TabsTrigger>
          </TabsList>

          {stories.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {stories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setStory(name);
                  }}
                  aria-pressed={name === story}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                    name === story
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <TabsContent value="preview">
          {/* The surface scrolls its own overflow rather than widening the page.
              A block is a full application surface and its intrinsic width can
              exceed the prose column on a narrow screen; without this the whole
              document scrolled sideways. `min-w-min` lets the inner grid grow to
              the content's own width so the scrollbar lands here, while still
              filling — and centring within — the column when content is small. */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <div className="grid min-h-40 min-w-min place-items-center p-8">
              {children ??
                (still ? (
                  <Still html={still.html} label={prerenderedLabel ?? component} />
                ) : (
                  <StoryPreview component={component} story={story} />
                ))}
            </div>
          </div>

          {still ? (
            <p className="mt-2 text-xs text-muted-foreground">
              A still, rendered at build time from the same story the tests run. The block
              itself is interactive; the copy that runs is the one the CLI installs.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="code">
          {source ? (
            <CodeBlock
              language="tsx"
              title={`${component}.tsx`}
              className="max-h-[32rem] overflow-auto"
            >
              {source}
            </CodeBlock>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
