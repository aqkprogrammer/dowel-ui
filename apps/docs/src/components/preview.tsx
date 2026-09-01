"use client";

import { CodeBlock } from "@dowel-ui/react/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { cn } from "@dowel-ui/react";
import { useState, type ReactNode } from "react";

import { StoryPreview, getStoryNames } from "./story-preview";

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
  className?: string;
  children?: ReactNode;
}

export function Preview({ component, source, className, children }: PreviewProps) {
  const stories = getStoryNames(component);
  const [story, setStory] = useState(stories[0] ?? "");

  if (stories.length === 0 && !children) return null;

  return (
    <div className={cn("not-prose my-6 grid gap-3", className)}>
      <Tabs defaultValue="preview">
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
          <div className="grid min-h-40 place-items-center rounded-xl border border-border p-8">
            {children ?? <StoryPreview component={component} story={story} />}
          </div>
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
