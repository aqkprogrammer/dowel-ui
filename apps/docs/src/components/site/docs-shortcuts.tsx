"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dowel-ui/react/dialog";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { SidebarTree } from "~/lib/sidebar";

import { neighbours, typing } from "./docs-continue";
import styles from "./docs-journey.module.css";
import { usePageStops } from "./page-stops";

/**
 * The documentation, by keyboard.
 *
 * `j` and `k` step through the sections of a page, `n` and `p` through the
 * pages themselves, and `?` lists them. Single letters, so they are heard only
 * when nothing is being typed into and no modifier is held — a browser's or an
 * assistive tool's own shortcuts are never taken.
 */
const KEYS: { keys: string[]; does: string }[] = [
  { keys: ["j"], does: "Next section" },
  { keys: ["k"], does: "Previous section" },
  { keys: ["n"], does: "Next page" },
  { keys: ["p"], does: "Previous page" },
  { keys: ["⌘", "K"], does: "Search" },
  { keys: ["?"], does: "This list" },
];

export function DocsShortcuts({ tree }: { tree: SidebarTree }) {
  const pathname = usePathname();
  const router = useRouter();
  const { stops, active } = usePageStops();
  const [open, setOpen] = useState(false);
  const { previous, next } = useMemo(() => neighbours(tree, pathname), [tree, pathname]);
  const nextHref = next?.href;
  const previousHref = previous?.href;

  useEffect(() => {
    const visit = (index: number) => {
      if (index < 0) {
        window.scrollTo({ top: 0 });
        return;
      }
      const stop = stops[Math.min(index, stops.length - 1)];
      if (stop) document.getElementById(stop.id)?.scrollIntoView();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing(event.target)) return;
      switch (event.key) {
        case "j":
          visit(active + 1);
          break;
        case "k":
          visit(active - 1);
          break;
        case "n":
          if (nextHref) router.push(nextHref, { transitionTypes: ["docs-forward"] });
          break;
        case "p":
          if (previousHref) router.push(previousHref, { transitionTypes: ["docs-back"] });
          break;
        case "?":
          setOpen(true);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [stops, active, nextHref, previousHref, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            For reading the documentation without the mouse.
          </DialogDescription>
        </DialogHeader>
        <dl className={styles.keys}>
          {KEYS.map((entry) => (
            <div key={entry.does} className="contents">
              <dt>
                {entry.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{entry.does}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
