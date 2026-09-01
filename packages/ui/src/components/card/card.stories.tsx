import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = {
  title: "Display/Card",
  component: Card,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Projects group your deployments and environments.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" placeholder="acme-inc" />
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="ghost">Cancel</Button>
        <Button>Create project</Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          A card does not require a header or a footer.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Stat: Story = {
  render: () => (
    <Card className="w-56">
      <CardHeader className="pb-2">
        <CardDescription>Monthly recurring revenue</CardDescription>
        <CardTitle className="text-3xl">$48,120</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-success">+12.4% from last month</p>
      </CardContent>
    </Card>
  ),
};
