import type { NextConfig } from "next";

const config: NextConfig = {
  // The docs render components straight from the library's TypeScript source,
  // so previews can never drift from what the registry publishes.
  //
  // That source imports `@/lib/utils`, so `@/` has to mean the library here —
  // which is why the docs app itself uses `~/`. It is the same alias collision
  // the CLI rewrites away when it installs into someone else's project.
  transpilePackages: ["@dowel/ui", "@dowel/themes"],

  // Typed routes are off on purpose. Every component link on this site is built
  // from the registry, so the hrefs are strings by construction and typed routes
  // can only be satisfied by casting them — which would look like safety while
  // checking nothing. The real guarantee is upstream: the navigation and
  // `generateStaticParams` read the same registry, so a link to a component that
  // does not exist cannot be produced.
  typedRoutes: false,
};

export default config;
