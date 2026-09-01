import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

import { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage } from "./form";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-80">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Form",
  component: Form,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Form>
      <FormField name="username">
        <FormLabel>Username</FormLabel>
        <FormControl>
          <Input placeholder="ada" />
        </FormControl>
        <FormDescription>This is your public display name.</FormDescription>
        <FormMessage />
      </FormField>
      <Button type="submit">Save</Button>
    </Form>
  ),
};

export const WithError: Story = {
  render: () => (
    <Form>
      <FormField name="email" error="Enter a valid email address.">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" defaultValue="not-an-email" />
        </FormControl>
        <FormDescription>We will never share it.</FormDescription>
        <FormMessage />
      </FormField>
      <Button type="submit">Save</Button>
    </Form>
  ),
};

/**
 * The field wiring is state-agnostic — this uses plain `useState`, and the
 * markup would be identical with React Hook Form or a server action. Only the
 * source of `error` changes.
 */
export const LiveValidation: Story = {
  render: function LiveValidation() {
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const error = touched && !email.includes("@") ? "Enter a valid email address." : undefined;

    return (
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
        }}
      >
        <FormField name="email" error={error}>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
            />
          </FormControl>
          <FormDescription>Used for deploy notifications.</FormDescription>
          <FormMessage />
        </FormField>
        <Button type="submit">Continue</Button>
      </Form>
    );
  },
};

export const MixedControls: Story = {
  render: () => (
    <Form>
      <FormField name="project">
        <FormLabel>Project name</FormLabel>
        <FormControl>
          <Input placeholder="acme-inc" />
        </FormControl>
        <FormMessage />
      </FormField>

      <FormField name="region" error="Choose a region to continue.">
        <FormLabel>Region</FormLabel>
        <FormControl>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="eu">Europe</SelectItem>
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormField>

      <FormField name="terms">
        <div className="flex items-center gap-2">
          <FormControl>
            <Checkbox />
          </FormControl>
          <FormLabel>Accept terms and conditions</FormLabel>
        </div>
        <FormMessage />
      </FormField>

      <Button type="submit">Create project</Button>
    </Form>
  ),
};
