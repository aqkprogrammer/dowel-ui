import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Package, Zap } from "lucide-react";

import { CodeTabs, type CodeTab } from "./code-tabs";

const INSTALL: CodeTab[] = [
  {
    value: "pnpm",
    label: "pnpm",
    code: "pnpm dlx @dowel-ui/cli@latest init\npnpm dlx @dowel-ui/cli@latest add code-tabs",
    icon: <Package className="size-3.5" />,
  },
  {
    value: "npm",
    label: "npm",
    code: "npx @dowel-ui/cli@latest init\nnpx @dowel-ui/cli@latest add code-tabs",
    icon: <Box className="size-3.5" />,
  },
  {
    value: "yarn",
    label: "yarn",
    code: "yarn dlx @dowel-ui/cli@latest init\nyarn dlx @dowel-ui/cli@latest add code-tabs\n\n# Yarn 1 has no dlx:\nnpx @dowel-ui/cli@latest add code-tabs",
    icon: <Package className="size-3.5" />,
  },
  {
    value: "bun",
    label: "bun",
    code: "bunx --bun @dowel-ui/cli@latest add code-tabs",
    icon: <Zap className="size-3.5" />,
  },
];

const RUN: CodeTab[] = [
  { value: "pnpm", label: "pnpm", code: "pnpm dev" },
  { value: "npm", label: "npm", code: "npm run dev" },
  { value: "yarn", label: "yarn", code: "yarn dev" },
  { value: "bun", label: "bun", code: "bun run dev" },
];

const meta: Meta<typeof CodeTabs> = {
  title: "Data/Code Tabs",
  component: CodeTabs,
  args: {
    tabs: INSTALL,
    indicator: "pill",
    listLabel: "Package manager",
    copyLabel: "Copy command",
    hideCopy: false,
  },
  argTypes: {
    indicator: { control: "inline-radio", options: ["pill", "underline"] },
    tabs: { control: false },
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[min(36rem,90vw)]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CodeTabs>;

/**
 * Switch package managers: the pill springs across, the old snippet lifts
 * away in a blur as the new one settles, and the panel eases to the new
 * height. The copy button always copies what is on screen.
 */
export const Default: Story = {};

/** The underline indicator, for a lighter header. */
export const Underline: Story = {
  args: { indicator: "underline" },
};

/**
 * Both blocks share `syncKey="package-manager"`: pick yarn in one and the other
 * follows. Reload the page — or open it in another tab — and your choice is
 * still there.
 */
export const Synced: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">1. Add the component</p>
      <CodeTabs tabs={INSTALL} syncKey="package-manager" listLabel="Package manager" />
      <p className="text-muted-foreground">2. Start the dev server</p>
      <CodeTabs tabs={RUN} syncKey="package-manager" listLabel="Package manager" />
    </div>
  ),
};

const FETCH: CodeTab[] = [
  {
    value: "ts",
    label: "TypeScript",
    language: "ts",
    code: `const response = await fetch("/api/projects", {
  headers: { Authorization: \`Bearer \${token}\` },
});
const projects: Project[] = await response.json();`,
  },
  {
    value: "python",
    label: "Python",
    language: "python",
    code: `import requests

projects = requests.get(
    "https://example.com/api/projects",
    headers={"Authorization": f"Bearer {token}"},
).json()`,
  },
  {
    value: "curl",
    label: "cURL",
    language: "bash",
    code: 'curl -H "Authorization: Bearer $TOKEN" https://example.com/api/projects',
  },
];

/** Languages of very different lengths — watch the panel's height spring between them. */
export const Languages: Story = {
  args: { tabs: FETCH, listLabel: "Language", copyLabel: "Copy snippet" },
};
