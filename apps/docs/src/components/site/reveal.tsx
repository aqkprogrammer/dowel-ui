"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveals every `[data-reveal]` inside it as each scrolls into view, once.
 *
 * One observer for a whole section rather than one per element. The hidden
 * starting state is declared in CSS only for browsers that run script, so
 * nothing is lost to a page that never hydrates, and reduced motion shows
 * everything in place from the start.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
