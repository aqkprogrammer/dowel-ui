import { Globe } from "lucide-react";

/**
 * Who made it, in the corner of the footer.
 *
 * The LinkedIn glyph is drawn here rather than imported: the icon set the rest
 * of the site uses dropped its brand marks, and a brand is the one kind of
 * icon that cannot be substituted with something close enough.
 */

const LINKS = {
  site: "https://techhub.cafe/me",
  linkedin: "https://www.linkedin.com/in/aqadirkhan/",
} as const;

function LinkedInGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.04c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function CreatedBy() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Created by</span>
      <a
        href={LINKS.site}
        target="_blank"
        rel="noreferrer"
        aria-label="Abdul Qadir Khan on techhub.cafe"
        title="techhub.cafe"
        className="rounded-md p-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        <Globe className="size-4" aria-hidden="true" />
      </a>
      <a
        href={LINKS.linkedin}
        target="_blank"
        rel="noreferrer"
        aria-label="Abdul Qadir Khan on LinkedIn"
        title="LinkedIn"
        className="rounded-md p-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        <LinkedInGlyph />
      </a>
    </div>
  );
}
