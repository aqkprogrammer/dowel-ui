"use client";

import { Check, Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A heading's link to itself, which also puts that link on the clipboard.
 *
 * Following it moves the page to the heading, as any fragment link does; the
 * copy is the part a reader actually wanted, so it says when it has happened.
 */
export function SectionLink({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return (
    <a
      href={`#${id}`}
      aria-label={`Link to ${title}`}
      onClick={() => {
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        // No clipboard — an insecure origin, a refused permission — is not an
        // error: the link has still been followed, and is in the address bar.
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              setCopied(false);
            }, 1600);
          })
          .catch(() => undefined);
      }}
      // Important, because prose colours and underlines every link inside it,
      // and this one is a control beside the heading, not a link in the text.
      className="relative inline-flex items-center rounded text-muted-foreground/0! no-underline! transition-colors outline-none group-hover:text-muted-foreground! focus-visible:text-muted-foreground! focus-visible:ring-2 focus-visible:ring-ring/55 data-[copied]:text-[var(--trail)]!"
      data-copied={copied ? "" : undefined}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Hash aria-hidden="true" className="size-4" />
      )}
      {copied ? (
        <span
          role="status"
          className="docs-card-in absolute top-1/2 left-full ms-2 -translate-y-1/2 rounded-full border border-[var(--hairline-strong)] bg-background px-2 py-0.5 font-mono text-[0.625rem] font-normal tracking-wide whitespace-nowrap text-foreground"
        >
          Link copied
        </span>
      ) : null}
    </a>
  );
}
