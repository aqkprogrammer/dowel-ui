"use client";

import { cn } from "@dowel-ui/react";
import { useEffect, useState } from "react";

/**
 * The page's sections, beside it, with the one being read lit.
 *
 * The lit entry is the last heading to have passed the top third of the
 * viewport — a scroll spy, with one observer and no scroll handler.
 */
export function OnThisPage({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;
    const passed = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Above the band means scrolled past; below it means not reached.
          if (entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0))
            passed.add(entry.target.id);
          else passed.delete(entry.target.id);
        }
        const current = [...headings].reverse().find((heading) => passed.has(heading.id));
        setActive(current?.id ?? headings[0]?.id);
      },
      { rootMargin: "-30% 0px -70% 0px" },
    );
    for (const heading of headings) observer.observe(heading);
    return () => {
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav aria-label="On this page" className="text-[0.8125rem]">
      <p className="mb-3 font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
        On this page
      </p>
      <ul className="grid gap-px border-s border-[var(--hairline)]">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
              className={cn(
                "-ms-px block border-s py-1 ps-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                active === section.id
                  ? "border-[var(--cosmic-blue)] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
