import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderPlus, Search } from "lucide-react";

import { Button } from "@/components/button";

import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "./empty-state";

const meta = {
  title: "Feedback/Empty State",
  component: EmptyState,
  args: { size: "md", bordered: true },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    bordered: { control: "boolean" },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing created yet: this is where a call to action belongs. */
export const NothingYet: Story = {
  render: (args) => (
    <EmptyState className="w-96" {...args}>
      <EmptyStateIcon>
        <FolderPlus />
      </EmptyStateIcon>
      <EmptyStateTitle>No projects yet</EmptyStateTitle>
      <EmptyStateDescription>
        Projects group your deployments and environments. Create one to get started.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button>New project</Button>
        <Button variant="outline">Import from Git</Button>
      </EmptyStateActions>
    </EmptyState>
  ),
};

/** Nothing matched a search: a different message, and a different next step. */
export const NoResults: Story = {
  render: (args) => (
    <EmptyState className="w-96" {...args}>
      <EmptyStateIcon>
        <Search />
      </EmptyStateIcon>
      <EmptyStateTitle>No results for “analytics”</EmptyStateTitle>
      <EmptyStateDescription>
        Check the spelling, or try a broader search term.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button variant="outline">Clear filters</Button>
      </EmptyStateActions>
    </EmptyState>
  ),
};

export const Minimal: Story = {
  render: (args) => (
    <EmptyState className="w-96" {...args}>
      <EmptyStateTitle>Nothing here</EmptyStateTitle>
    </EmptyState>
  ),
};
