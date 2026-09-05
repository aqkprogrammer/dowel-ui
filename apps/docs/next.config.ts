import type { NextConfig } from "next";

const config: NextConfig = {
  // The docs render components straight from the library's TypeScript source,
  // so previews can never drift from what the registry publishes.
  //
  // That source imports `@/lib/utils`, so `@/` has to mean the library here —
  // which is why the docs app itself uses `~/`. It is the same alias collision
  // the CLI rewrites away when it installs into someone else's project.
  transpilePackages: ["@dowel-ui/react", "@dowel-ui/themes"],

  // Typed routes are off on purpose. Every component link on this site is built
  // from the registry, so the hrefs are strings by construction and typed routes
  // can only be satisfied by casting them — which would look like safety while
  // checking nothing. The real guarantee is upstream: the navigation and
  // `generateStaticParams` read the same registry, so a link to a component that
  // does not exist cannot be produced.
  typedRoutes: false,

  /**
   * Caching for the public registry.
   *
   * The registry is immutable per release: `index.json` and every item are
   * regenerated only when the package version changes, so they can be cached
   * hard. Without this every `add` revalidates against the origin, which is a
   * round trip per component for a file that cannot have changed.
   *
   * `[^/]+` is doing real work. The licensed items are served from
   * `/r/pro/<name>.json` by a route that refuses anyone without a licence and
   * answers `no-store, private`; a pattern that also matched those would make
   * paid source publicly cacheable, and a shared cache holding one customer's
   * authorised response is the whole paywall gone. Restricting the match to
   * direct children of `/r` cannot reach them.
   */
  headers: () => [
    {
      source: "/r/:file([^/]+).json",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
        // Without this a browser-based playground fetching the registry is
        // blocked. The CLI is unaffected either way.
        { key: "Access-Control-Allow-Origin", value: "*" },
      ],
    },
  ],
};

export default config;
