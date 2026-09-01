import type { Meta, StoryObj } from "@storybook/react-vite";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

/**
 * Annotated rather than inferred with `satisfies`. These components are direct
 * re-exports of Radix primitives, and inferring the meta type makes the emitted
 * declaration reference Radix-internal prop types that are not nameable from
 * this path (TS2883).
 */
const meta: Meta<typeof Accordion> = {
  title: "Data/Accordion",
  component: Accordion,
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;

/** Typed from the component: Accordion's props are a discriminated union on
 * `type`, which collapses to `never` if inferred through the meta. */
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="shipping">
      <AccordionItem value="shipping">
        <AccordionTrigger>How long does shipping take?</AccordionTrigger>
        <AccordionContent>
          Orders ship within two business days and arrive in three to five days after that.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>What is the return policy?</AccordionTrigger>
        <AccordionContent>
          Return anything unused within thirty days for a full refund.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="support">
        <AccordionTrigger>How do I contact support?</AccordionTrigger>
        <AccordionContent>
          Email support@example.com and someone will reply within one business day.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

/** Independent sections, so more than one can be open at a time. */
export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={["build"]}>
      <AccordionItem value="build">
        <AccordionTrigger>Build settings</AccordionTrigger>
        <AccordionContent>
          Framework preset, build command and output directory.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="env">
        <AccordionTrigger>Environment variables</AccordionTrigger>
        <AccordionContent>Values available at build and run time.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="domains">
        <AccordionTrigger>Domains</AccordionTrigger>
        <AccordionContent>Custom domains and certificates.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Accordion type="single" collapsible>
      <AccordionItem value="a">
        <AccordionTrigger>Available section</AccordionTrigger>
        <AccordionContent>Anyone can open this.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger disabled>Enterprise only</AccordionTrigger>
        <AccordionContent>Upgrade to view.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
