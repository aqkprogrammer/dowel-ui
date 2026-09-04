import { CodeBlock } from "@dowel-ui/react/code-block";
import type { Metadata } from "next";
import Link from "next/link";

import { InstallCommand } from "~/components/install-command";
import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";

export const metadata: Metadata = {
  title: "Installation",
  description: `Set a project up to use ${branding.libraryName}.`,
};

const CREATE = `npx create-dowel-app my-app`;

const USAGE = `import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function CreateProject() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Project name" />
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Create project</Button>
      </CardFooter>
    </Card>
  );
}`;

export default function InstallationPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Installation</h1>

      <Prose>
        <h2>Starting from nothing</h2>
        <p>
          If there is no project yet, the scaffolder writes one and fetches the components for
          it. It asks what you are building — a starter, a SaaS application or an AI product —
          and which of the seven themes to start on.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="bash" title="Terminal" code={CREATE}>
          {CREATE}
        </CodeBlock>
      </div>

      <Prose>
        <p>
          The templates do not contain the components. They are the application files plus a
          list of registry names, and the scaffolder runs the same CLI you would run yourself —
          so a project created today is built from today&rsquo;s registry rather than from
          whatever was current when the template was written.
        </p>

        <h2>Adding it to a project you already have</h2>
        <p>You need a React 19 project with Tailwind CSS v4 already set up, and TypeScript.</p>

        <h2>1. Initialise</h2>
        <p>
          This inspects the project, writes <code>components.json</code>, adds the{" "}
          <code>cn()</code> utility and appends the design tokens to your stylesheet. Nothing
          you already had is rewritten.
        </p>
      </Prose>

      <InstallCommand args="init" />

      <Prose>
        <p>
          It detects your package manager, path alias and stylesheet, and asks only about what
          it cannot work out. If your project is not supported — Tailwind v3, or JavaScript — it
          says so and stops rather than writing files that will not build.
        </p>

        <h2>2. Add components</h2>
        <p>
          Each component is installed with whatever it depends on. Adding a date picker also
          installs the calendar, popover and button it is built from.
        </p>
      </Prose>

      <InstallCommand args="add button card input" />

      <Prose>
        <h2>3. Use them</h2>
        <p>Imports are rewritten to your project&rsquo;s own alias as the files are written.</p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="tsx" title="create-project.tsx" code={USAGE}>
          {USAGE}
        </CodeBlock>
      </div>

      <Prose>
        <h2>Keeping up to date</h2>
        <p>
          <code>update</code> compares what you have against the registry and reports each file
          as up to date, out of date, or locally modified. Files you have edited are left alone
          unless you pass <code>--overwrite</code>.
        </p>
        <p>
          See the <Link href="/docs/cli">CLI reference</Link> for every command and flag.
        </p>
      </Prose>
    </article>
  );
}
