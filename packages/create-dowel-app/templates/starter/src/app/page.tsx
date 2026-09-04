import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const NEXT_STEPS = [
  {
    title: "Add a component",
    description: "npx __CLI_PACKAGE__ add dialog — it lands in src/components/ui as your file.",
  },
  {
    title: "Change the theme",
    description:
      "Swap data-theme on <html> in layout.tsx. Seven presets ship, all AA in both modes.",
  },
  {
    title: "Teach your agent",
    description:
      "npx __CLI_PACKAGE__ agents writes the catalogue for Claude, Cursor and the rest.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <Badge variant="secondary">__LIBRARY_NAME__</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
          __PROJECT_NAME__
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          The components below are files in this repository, not a dependency. Open{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">
            src/components/ui/button.tsx
          </code>{" "}
          and change something — it is yours.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button>Get started</Button>
        <Button variant="outline" asChild>
          <a href="__DOCS_URL__">Documentation</a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {NEXT_STEPS.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </main>
  );
}
