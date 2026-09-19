import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Globe, Mail, Rss } from "lucide-react";

import { FooterSimpleBlock } from "./footer-simple";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FooterSimpleBlock> = {
  title: "Blocks/Footer simple",
  component: FooterSimpleBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FooterSimpleBlock>;

/** SmoothUI "Footer 1": brand, social links and three link columns. */
export const Default: Story = {};

/** Every source item: SmoothUI "Footer 1" (Footer Simple), with icons for the social links. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FooterSimpleBlock
        social={[
          { label: "Email", href: "mailto:hello@example.com", icon: <Mail /> },
          { label: "RSS feed", href: "#rss", icon: <Rss /> },
          { label: "Website", href: "https://example.com", icon: <Globe />, external: true },
        ]}
      />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Footer 1 — Footer Simple
      </figcaption>
    </figure>
  ),
};

/** A logo in place of the brand name. */
export const WithLogo: Story = {
  args: {
    brand: (
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-7 rounded-md bg-linear-to-br from-primary to-primary-hover"
        />
        Northwind
      </span>
    ),
  },
};
