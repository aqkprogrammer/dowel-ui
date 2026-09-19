"use client";

// Motion from SmoothUI AI Response (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { InlineCitation } from "@/components/ai-sources";
import { cn } from "@/lib/utils";

/**
 * Streamed plain text whose words blur in as they arrive.
 *
 * Only words that arrive after the first render animate. Keys are positional,
 * so a word that already exists keeps its DOM node — and a node that is not
 * remounted does not replay its entrance. That is "animate only what arrived"
 * without reading a ref during render. There is no stagger: token arrival is
 * the stagger.
 *
 * Whitespace and bare punctuation stay text nodes, so text extraction is
 * unchanged and a line never breaks between a word and its comma. `[n]`
 * markers matching a citation become `InlineCitation`s, which carry the
 * source title in their accessible name.
 *
 * Like `Response`, this is not a live region: announcing a stream token by
 * token is unusable with a screen reader (ADR 0009).
 */

export interface ResponseCitation {
  /** Matches the `[n]` marker in the text. */
  index: number;
  /** Becomes the citation's accessible name. */
  title: string;
  /** Without one the marker is text, not a dead link. */
  href?: string;
}

export interface ResponseTextProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  /** The plain-text stream so far. Re-render it as it grows. */
  text: string;
  /** Sources for `[n]` markers. Unmatched markers stay literal text. */
  citations?: ResponseCitation[];
  /**
   * Animate the words present on first render. Off by default, so a replayed
   * transcript does not blur in its entire history.
   */
  animateInitial?: boolean;
}

const PREFIX = "dowel-ai-response";

const STYLES = `
@keyframes ${PREFIX}-word{from{opacity:0;filter:blur(4px);translate:0 2px}}
@keyframes ${PREFIX}-pop{from{opacity:0;scale:.6}}
.${PREFIX}-word{display:inline-block;animation:${PREFIX}-word calc(220ms * var(--motion-scale,1)) var(--ease-out-quint) both}
.${PREFIX}-pop{display:inline-block;animation:${PREFIX}-pop calc(250ms * var(--motion-scale,1)) var(--ease-overshoot) both}
`;

const TOKEN_SPLIT = /(\s+|\[\d+\])/;
const CITATION_MARKER = /^\[(\d+)\]$/;
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;
const WHITESPACE = /^\s+$/;

function tokenize(text: string): string[] {
  return text.split(TOKEN_SPLIT).filter((token) => token !== "");
}

export function ResponseText({
  className,
  text,
  citations,
  animateInitial = false,
  ...props
}: ResponseTextProps) {
  const tokens = tokenize(text);
  // Everything below this index was on screen at first render.
  const [baseline] = useState(() => (animateInitial ? 0 : tokens.length));

  const rendered: ReactNode[] = tokens.map((token, position) => {
    const arrived = position >= baseline;

    if (WHITESPACE.test(token)) return token;

    const marker = CITATION_MARKER.exec(token);
    if (marker) {
      const index = Number(marker[1]);
      const citation = citations?.find((candidate) => candidate.index === index);
      if (!citation) return token;
      return (
        <span
          key={position}
          data-slot="response-citation"
          className={arrived ? `${PREFIX}-pop` : undefined}
        >
          <InlineCitation index={index} title={citation.title} href={citation.href} />
        </span>
      );
    }

    if (!HAS_WORD_CHARACTER.test(token)) return token;

    return (
      <span
        key={position}
        data-slot="response-word"
        className={arrived ? `${PREFIX}-word` : undefined}
      >
        {token}
      </span>
    );
  });

  return (
    <span data-slot="response-text" className={cn(className)} {...props}>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {rendered}
    </span>
  );
}
