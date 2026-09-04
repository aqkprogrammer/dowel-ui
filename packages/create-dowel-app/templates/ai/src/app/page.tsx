import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">__PROJECT_NAME__</h1>
      <p className="text-pretty text-muted-foreground">
        An AI product scaffolded with __LIBRARY_NAME__. The chat surface, agent console and
        usage dashboard are source files in this repository — including the parts most component
        sets do not ship: the approval before a tool runs, and the ledger of what it did
        afterwards.
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
