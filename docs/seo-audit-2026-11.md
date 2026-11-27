# SEO, AIEO and GEO audit: dowelui.com (27 Nov 2026)

## 1. Summary

dowelui.com was already in good technical shape before this pass. These were in place:
self-referencing canonicals on every page, a sitemap built from the registry, a robots.txt
that names AI crawlers, `/llms.txt` and `/llms-full.txt` generated from the registry,
an Organization / WebSite / SoftwareApplication graph, TechArticle + SoftwareSourceCode +
BreadcrumbList on every component and block page, per-item Open Graph images, and
`noindex` on preview hosts.

So this pass did not rebuild anything. It fixed the defects a crawl actually turned up,
and it added the one piece of AI-facing content that was missing: a plain statement of
what Dowel is, what it costs and what it runs on.

**Baseline crawl:** all 415 URLs in the sitemap. Every one returned 200 with a
self-referencing canonical. No duplicate titles, no duplicate descriptions, no `noindex`,
no `<img>` without `alt`, and no orphan pages.

## 2. Technical issues found and fixed

| #   | Issue (live, before)                                                                                | Impact                                                                                                                | Fix                                                                                                                                          | File                                                         |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `/docs/components/<unknown>` and `/docs/blocks/<unknown>` answered **500**, not 404                 | Crawlers read a 5xx as the server failing and slow down crawling. Any mistyped or removed slug looked like an outage. | `export const dynamicParams = false`. Every slug comes from the registry at build time, so an unknown one now returns 404 without rendering. | `apps/docs/src/app/docs/{components,blocks}/[name]/page.tsx` |
| 2   | `/quality` linked all 59 blocks as `/docs/components/<block>`, and each of those links hit #1 (500) | 59 broken internal links from an indexable page                                                                       | Blocks now link to `/docs/blocks/<name>`.                                                                                                    | `apps/docs/src/app/quality/page.tsx`                         |
| 3   | `www.dowelui.com` answered 200 with a full copy of the site                                         | Every page existed on two hosts. The canonical tag pointed at the apex, but a canonical is only a hint.               | Permanent (308) host redirect from www to the apex, keeping path and query                                                                   | `apps/docs/next.config.ts`                                   |
| 4   | Block titles were lowercased in full, giving "React crm template" and "React ai dashboard template" | These titles are the headlines shown in search results                                                                | New `inProse()` helper keeps all-caps words (CRM, AI, API, OTP) and lowercases the rest. Also used in component descriptions.                | `apps/docs/src/lib/site.ts`, both `[name]` pages             |
| 5   | Three titles ran past 65 characters (ai-agents 74, agentbench 76, pricing 68)                       | Truncated in search results                                                                                           | Shortened, keeping the same meaning                                                                                                          | `docs/ai-agents`, `agentbench`, `pricing` pages              |

### Reviewed and left alone, on purpose

- **Meta descriptions average about 260 characters.** Google cuts them at about 155–160.
  Each one starts with the item's own description, so the cut-off snippet still reads
  correctly. Shortening 400 strings by hand would cost more than it gains. If Search
  Console shows low click-through on component pages, revisit this.
- **Several block pages have 2–3 `<h1>` elements.** The extras sit inside the live block
  preview: a dashboard block renders its own page heading. That markup is the real
  installed component, and Google handles multiple H1s without trouble. Changing it would
  make the preview differ from what the CLI installs.
- **Block previews link to `/admin`, `/app` and similar paths, which return 404.** These
  are the demo navigation inside the blocks. They cause a few soft 404s and do no real harm.
- **Homepage canonical is `https://dowelui.com` while the sitemap lists `https://dowelui.com/`.**
  Search engines treat these as the same URL.
- **robots.txt allows training crawlers** (GPTBot, ClaudeBot, CCBot, Google-Extended and
  others) as well as search and retrieval bots. The existing comment in `robots.ts` says
  this is deliberate: the site's audience reaches it through coding assistants. That is a
  business decision, so I kept it. If you want to stay in AI _search_ but out of _training_,
  remove `GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Google-Extended`,
  `Applebot-Extended`, `Bytespider`, `meta-externalagent` and `cohere-ai`, and give them
  `disallow: "/"`.

## 3. AIEO / GEO

**Added: an `## About` section in `/llms.txt`.** It sits above the catalogue and states:

- what Dowel is (source-first: the CLI copies TypeScript source into the repo)
- the stack (React 19, TypeScript, Tailwind CSS 4, Radix UI, OKLCH tokens)
- licensing (components and free blocks are MIT at no cost; Pro is a paid catalogue of
  application surfaces), with a link to /pricing
- the AI interface components that actually exist in the registry: chat, prompt input,
  reasoning, tool calls, approvals, agent plan/status, plus the AI chat, AI workspace and
  agent-console blocks. No citation component exists, so none is claimed.
- the coding-agent tooling (AGENTS.md output, the `@dowel-ui/mcp` server)
- GitHub and npm links

Before this, llms.txt went straight from a one-line summary into 338 component links, so
a model reading it had no stated facts about pricing or licensing. The section is an
optional `about` field on `AgentDocsContext` in `@dowel-ui/registry`. It is optional
because that package also renders llms.txt for third-party registries, and Dowel's
licensing is not theirs. Covered by a new unit test.

Already in place: entity-consistent JSON-LD (one Organization `@id`, referenced
everywhere), `llms-full.txt` (418 KB), an MCP server, and robots access for
OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot and Bingbot.

Neither llms.txt nor JSON-LD guarantees that an AI system will index or cite the site.
Google Search ignores llms.txt.

## 4. Keyword → URL map

I had no keyword-volume data source in this session (DataForSEO, Ahrefs and Search
Console were not connected), so the map below is built from search intent. The terms are
unvalidated targets, not measured opportunities. Check them against Search Console query
data once it builds up.

| Intent cluster                 | Primary target                                                                        | URL                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Brand / navigational           | dowel ui                                                                              | `/`                                                                                          |
| Category: source-first library | source-first react component library, copy paste react components, shadcn alternative | `/`, `/docs`                                                                                 |
| Component catalogue            | react ui components, react component library                                          | `/docs/components`                                                                           |
| Per-component (long tail)      | react {component} component, e.g. "react data table component"                        | `/docs/components/{name}` (338)                                                              |
| Screen templates               | react {screen} template, e.g. "react dashboard template", "react login page"          | `/docs/blocks/{name}` (59)                                                                   |
| AI UI                          | react ai chat components, ai agent ui components, tool calling ui                     | `/docs/components/ai-*`, `/docs/blocks/ai-chat`, `/docs/blocks/agent-console`, `/agent-demo` |
| Coding agents                  | mcp server react components, claude code ui library                                   | `/docs/ai-agents`                                                                            |
| Theming                        | tailwind react themes, oklch theme generator                                          | `/docs/themes`, `/theme-studio`                                                              |
| Backgrounds                    | react animated backgrounds                                                            | `/docs/backgrounds`                                                                          |
| Install / how-to               | install react components cli                                                          | `/docs/installation`, `/docs/cli`                                                            |
| Accessibility                  | accessible react components                                                           | `/docs/accessibility`, `/quality`                                                            |
| Commercial                     | react ui library pricing, premium react components                                    | `/pricing`                                                                                   |

There is no cannibalisation: each cluster maps to exactly one page type.

## 5. Content gaps (proposed, not built)

No pages were generated in this pass. Writing technically accurate guides, with working
code, takes a person who knows the components, and mass-generated pages would be doorway
pages. Candidates, in priority order:

| Priority | Page                                                    | Intent                  | Links to                                                         |
| -------- | ------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| P1       | Build an AI chat interface in React                     | how-to                  | ai-chat, ai-prompt-input, ai-reasoning, ai-tool, blocks/ai-chat  |
| P1       | Source-first UI vs. npm component libraries             | comparison / definition | /docs, /docs/cli                                                 |
| P1       | Building tool-call and approval UIs for AI agents       | how-to                  | ai-tool, ai-approval-request, agent-approvals, permission-prompt |
| P2       | Build a SaaS dashboard with React and Tailwind          | how-to                  | blocks/dashboard, analytics, billing, settings                   |
| P2       | Customising Tailwind CSS 4 components with OKLCH tokens | how-to                  | /docs/themes, /theme-studio                                      |
| P3       | Accessible React components: what WCAG 2.2 AA requires  | educational             | /docs/accessibility, /quality                                    |

A `/guides/` section with `TechArticle` + `BreadcrumbList` schema, linked from the
sidebar, would hold these.

## 6. Competitor gap (qualitative)

I didn't pull live SERP data. The positioning below is the publicly known one:

- **shadcn/ui** owns "copy-paste components" and the source-first category. Dowel's
  differences are the CLI's safe re-runs, per-component quality scores, whole-screen
  blocks, and the agent tooling (MCP, AGENTS.md).
- **assistant-ui and Vercel AI Elements** own "React AI chat components". Dowel's
  differences are AI components alongside a full app UI kit, plus approval, reasoning and
  agent-status components.
- **MUI, Chakra and Mantine** are runtime-dependency libraries. A "source-first vs. npm
  library" page targets people comparing them.
- **Aceternity and Magic UI** focus on animated marketing components. Dowel's
  backgrounds and interaction components compete there.

## 7. Files changed

- `apps/docs/next.config.ts`: www → apex redirect
- `apps/docs/src/app/docs/components/[name]/page.tsx`: `dynamicParams = false`, `inProse`
- `apps/docs/src/app/docs/blocks/[name]/page.tsx`: `dynamicParams = false`, `inProse` in title and description
- `apps/docs/src/app/quality/page.tsx`: correct block links
- `apps/docs/src/lib/site.ts`: `inProse()` helper
- `apps/docs/src/lib/agent-docs.ts`: `about` facts for llms.txt
- `apps/docs/src/app/docs/ai-agents/page.tsx`, `agentbench/page.tsx`, `pricing/page.tsx`: shorter titles
- `packages/registry/src/agent-docs.ts`: optional `about` section in `llmsTxt`
- `packages/registry/src/agent-docs.test.ts`: test for it

## 8. Needs your access (not done)

- **Google Search Console:** verify `dowelui.com` as a Domain property (DNS TXT record in
  Cloudflare), submit `https://dowelui.com/sitemap.xml`, then watch Pages → "Not found
  (404)" and "Server error (5xx)". The 500s fixed above may show there for a few weeks.
- **Bing Webmaster Tools:** import from Search Console and submit the sitemap. Bing's index
  feeds Copilot and ChatGPT search.
- **Cloudflare:** optionally add a www → apex redirect rule at the edge too, so the redirect
  happens before the request reaches Railway.
- **Analytics:** none is configured. If you want organic landing-page tracking, choose a
  tool (GA4, Plausible and so on) and I can wire it in.
- **Backlinks:** list on genuine directories and communities: awesome-react-components,
  awesome-shadcn-ui style lists, the React and Tailwind subreddits, Hacker News (Show HN),
  Product Hunt, newsletters like React Status and This Week in React, and the MCP server
  directories for `@dowel-ui/mcp`.

## 9. Roadmap

- **30 days:** deploy; verify Search Console and Bing; submit the sitemap; confirm
  `www` returns a 308 and unknown slugs return 404; start collecting query data.
- **60 days:** write the three P1 guides; use Search Console queries to decide which
  component descriptions to tighten; list in directories.
- **90 days:** P2 and P3 guides; review which component pages get impressions without
  clicks and rewrite their descriptions; reassess the training-crawler policy.
