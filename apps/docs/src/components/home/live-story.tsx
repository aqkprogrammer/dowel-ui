"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { LiveStage } from "../live-stage";
import { CosmicLoader } from "../site/cosmic-loader";

/**
 * The home page's stories, as their own chunk, fetched once the page is
 * interactive: the star field is what the first paint is for.
 */
const ShowcaseStory = dynamic(
  () => import("../showcase/showcase-stories").then((mod) => mod.ShowcaseStory),
  { ssr: false },
);

/**
 * One live story on the home page, laid out at its own size and scaled into
 * the box, mounted only when it nears the viewport.
 */
export function LiveStory({
  name,
  story = "Default",
  stageWidth,
  maxScale,
  fill,
  interactive = false,
  fit,
  className,
  placeholder,
}: {
  name: string;
  story?: string;
  stageWidth?: number;
  maxScale?: number;
  fill?: number;
  interactive?: boolean;
  fit?: "contain" | "width";
  className?: string;
  placeholder?: ReactNode;
}) {
  return (
    <LiveStage
      className={className}
      stageWidth={stageWidth}
      maxScale={maxScale}
      fill={fill}
      interactive={interactive}
      fit={fit}
      placeholder={
        placeholder ?? (
          // Hidden from assistive technology: a page of previews would
          // otherwise announce "loading" once per tile.
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
            <CosmicLoader size="sm" />
          </div>
        )
      }
    >
      <ShowcaseStory component={name} story={story} />
    </LiveStage>
  );
}
