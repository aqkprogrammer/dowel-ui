---
"@dowel/ui": patch
---

Fix two packaging defects that made the published package unusable in React
Server Components applications.

The build stripped `"use client"` directives when merging modules into shared
chunks; output is now unbundled so each module keeps its own. `Button` was also
missing the directive outright, despite attaching an event handler.

Both were found by building the documentation site on the library itself.
