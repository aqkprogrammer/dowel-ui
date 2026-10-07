import { Alert, AlertDescription, AlertTitle } from "@dowel-ui/react/alert";
import { Badge } from "@dowel-ui/react/badge";
import type { ReactNode } from "react";

import { isUnreleased, publishedVersion } from "~/lib/release";

/**
 * Marks a feature that is documented but not yet on npm.
 *
 * Renders nothing once the package version reaches `since`, so cutting the
 * release clears every marker without touching the pages that carry them.
 */
export function UnreleasedBadge({ since }: { since: string }) {
  if (!isUnreleased(since)) return null;
  return (
    <Badge variant="outline" size="sm" className="ms-2 align-middle font-sans">
      {since}
    </Badge>
  );
}

/** A note above a section whose commands need a release that has not been cut. */
export function UnreleasedNote({ since, children }: { since: string; children: ReactNode }) {
  if (!isUnreleased(since)) return null;
  return (
    <Alert variant="info" className="not-prose my-4">
      <AlertTitle>Ships in {since}</AlertTitle>
      <AlertDescription>
        {children} The published packages are {publishedVersion}; until {since} is on npm, this
        is on <code>main</code> only.
      </AlertDescription>
    </Alert>
  );
}
