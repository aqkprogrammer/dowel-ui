import { Button } from "@dowel-ui/react/button";
import Link from "next/link";

import { branding } from "~/lib/branding";

/**
 * What a licensed item's page says where a free item's page shows its source.
 *
 * The preview above it is real — the same story the tests run — so what is
 * being sold is visible. What is withheld is the file, and this says so
 * plainly rather than showing an empty code block or, worse, nothing at all,
 * which reads as a page that failed to build.
 */
export function LicensedNotice({ name }: { name: string }) {
  return (
    <div className="not-prose mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <p className="text-sm font-medium">This is a Pro block.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The preview is the real thing. The source is installed by the CLI once this machine is
        signed in with a licence key —{" "}
        <code className="font-mono">{branding.cliName} login</code> checks the key against the
        registry before storing it — and lands in your project as a file you own, exactly like a
        free block.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/pricing">Get a licence</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/docs/cli#licensed-components`}>How licensing works</Link>
        </Button>
      </div>
      <p className="sr-only">Registry name: {name}</p>
    </div>
  );
}
