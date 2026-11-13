"use client";

import styles from "./docs-journey.module.css";
import { usePageStops } from "./page-stops";

/**
 * The current page's sections, as a timeline under its entry in the sidebar.
 *
 * The sidebar says which page; this says where on it. Sections already read
 * are lit, the one being read glows, and each is a link to itself — so the
 * navigation follows the scroll and the scroll can follow the navigation.
 */
export function SidebarSections({ onNavigate }: { onNavigate?: () => void }) {
  const { stops, active } = usePageStops();
  if (stops.length < 2) return null;

  return (
    <ol className={styles.sections} aria-label="Sections of this page">
      {stops.map((stop, index) => (
        <li key={stop.id}>
          <a
            href={`#${stop.id}`}
            onClick={onNavigate}
            aria-current={index === active ? "location" : undefined}
            data-state={index < active ? "done" : index === active ? "current" : "ahead"}
            className={styles.section}
          >
            <span className="truncate">{stop.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
