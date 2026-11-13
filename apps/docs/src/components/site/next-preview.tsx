"use client";

import { LiveStage } from "../live-stage";
import { StoryPreview } from "../story-preview";

import { NO_THUMBNAIL } from "./component-card";

/**
 * The next page's component, live, in the card that leads to it.
 *
 * Its own module, loaded on demand: the table of every story's loader comes
 * with it, and a guide page that never shows a component should not carry
 * that. The stage itself mounts only near the viewport, as every preview does.
 */
export default function NextPreview({
  name,
  kind,
}: {
  name: string;
  kind: "component" | "block";
}) {
  if (NO_THUMBNAIL.has(name)) return null;
  return (
    <LiveStage
      className="absolute inset-0"
      stageWidth={kind === "block" ? 1180 : 440}
      fit={kind === "block" ? "width" : "contain"}
      maxScale={1}
    >
      <StoryPreview component={name} />
    </LiveStage>
  );
}
