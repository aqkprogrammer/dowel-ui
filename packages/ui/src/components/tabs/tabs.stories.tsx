import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

/**
 * Annotated rather than inferred with `satisfies`. These components are direct
 * re-exports of Radix primitives, and inferring the meta type makes the emitted
 * declaration reference Radix-internal prop types that are not nameable from
 * this path (TS2883).
 */
const meta: Meta<typeof Tabs> = {
  title: "Navigation/Tabs",
  component: Tabs,
  parameters: { controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Update your account details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="tabs-name">Name</Label>
            <Input id="tabs-name" defaultValue="Ada Lovelace" />
          </CardContent>
          <CardFooter className="justify-end">
            <Button>Save</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="tabs-password">New password</Label>
            <Input id="tabs-password" type="password" />
          </CardContent>
          <CardFooter className="justify-end">
            <Button>Update password</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList variant="underline">
        <TabsTrigger value="overview" variant="underline">
          Overview
        </TabsTrigger>
        <TabsTrigger value="deployments" variant="underline">
          Deployments
        </TabsTrigger>
        <TabsTrigger value="settings" variant="underline">
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-muted-foreground">
        Traffic, errors and latency for the last 24 hours.
      </TabsContent>
      <TabsContent value="deployments" className="text-sm text-muted-foreground">
        42 deployments this week.
      </TabsContent>
      <TabsContent value="settings" className="text-sm text-muted-foreground">
        Environment variables and build settings.
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-96">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="text-sm text-muted-foreground">
        General settings.
      </TabsContent>
      <TabsContent value="team" className="text-sm text-muted-foreground">
        Invite and manage teammates.
      </TabsContent>
      <TabsContent value="billing" className="text-sm text-muted-foreground">
        Upgrade to manage billing.
      </TabsContent>
    </Tabs>
  ),
};

/** Manual activation stops arrow keys from loading each panel in passing. */
export const ManualActivation: Story = {
  render: () => (
    <Tabs defaultValue="one" activationMode="manual" className="w-96">
      <TabsList>
        <TabsTrigger value="one">Expensive one</TabsTrigger>
        <TabsTrigger value="two">Expensive two</TabsTrigger>
      </TabsList>
      <TabsContent value="one" className="text-sm text-muted-foreground">
        Arrow to the next tab, then press Enter or Space to load it.
      </TabsContent>
      <TabsContent value="two" className="text-sm text-muted-foreground">
        Loaded on purpose, not in passing.
      </TabsContent>
    </Tabs>
  ),
};
