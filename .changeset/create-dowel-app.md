---
"create-dowel-app": minor
"@dowel-ui/cli": patch
---

Add `create-dowel-app`, and fix a dependency gap in `add` that building with it
uncovered.

```bash
npx create-dowel-app my-app
```

Asks what you are building and which theme, writes a Next.js app, and fetches
the components. Three templates: `starter`, `saas` (dashboard, analytics,
billing, settings, onboarding) and `ai` (chat, agent console, usage dashboard).

The templates carry application files and a list of registry names — not the
components. The scaffolder runs the same CLI a user would, so a project created
today is built from today's registry rather than from whatever was current when
the template was written, and a template stays a dozen files instead of a
hundred.

**`add` fix.** Missing npm packages were computed _after_ the "already up to
date" early return, so a project whose component files were current but whose
packages were absent — anything added with `--skip-install` — never got them,
and the components could not resolve. The check is now "nothing to write and
nothing to install".
