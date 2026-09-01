"use client";

import { CodeBlock } from "@dowel-ui/react/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";

import { branding } from "~/lib/branding";

const RUNNERS = [
  { id: "pnpm", label: "pnpm", prefix: "pnpm dlx" },
  { id: "npm", label: "npm", prefix: "npx" },
  { id: "yarn", label: "yarn", prefix: "yarn dlx" },
  { id: "bun", label: "bun", prefix: "bunx" },
] as const;

/**
 * The command to install something, for whichever package manager the reader
 * uses. Copying a command that does not work in your project is a small
 * indignity that the docs can simply avoid.
 */
export function InstallCommand({ args }: { args: string }) {
  return (
    <Tabs defaultValue="pnpm" className="not-prose my-4">
      <TabsList variant="underline">
        {RUNNERS.map((runner) => (
          <TabsTrigger key={runner.id} value={runner.id} variant="underline">
            {runner.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {RUNNERS.map((runner) => {
        const command = `${runner.prefix} ${branding.cliName} ${args}`;
        return (
          <TabsContent key={runner.id} value={runner.id}>
            <CodeBlock language="bash" title="Terminal" code={command}>
              {command}
            </CodeBlock>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
