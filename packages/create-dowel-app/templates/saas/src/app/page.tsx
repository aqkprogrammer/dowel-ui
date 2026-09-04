import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">__PROJECT_NAME__</h1>
      <p className="text-pretty text-muted-foreground">
        A SaaS application scaffolded with __LIBRARY_NAME__. The dashboard, analytics, billing,
        settings and onboarding surfaces are source files in this repository — open one and
        change it.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/app">Open the app</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href="__DOCS_URL__">Documentation</a>
        </Button>
      </div>
    </main>
  );
}
