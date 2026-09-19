import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Globe, Mail, Rss, Video } from "lucide-react";

import { FooterNewsletterBlock } from "./footer-newsletter";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FooterNewsletterBlock> = {
  title: "Blocks/Footer newsletter",
  component: FooterNewsletterBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FooterNewsletterBlock>;

/** SmoothUI "Footer 2": brand, newsletter and social links beside four link columns. */
export const Default: Story = {};

/** Every source item: SmoothUI "Footer 2" (Footer Complex), with icons for the social links. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FooterNewsletterBlock
        social={[
          { label: "Email", href: "mailto:hello@example.com", icon: <Mail /> },
          { label: "RSS feed", href: "#rss", icon: <Rss /> },
          { label: "Video channel", href: "#video", icon: <Video /> },
          { label: "Website", href: "https://example.com", icon: <Globe />, external: true },
        ]}
      />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Footer 2 — Footer Complex
      </figcaption>
    </figure>
  ),
};

/** Without the sign-up form. */
export const WithoutNewsletter: Story = {
  args: { newsletter: null },
};
