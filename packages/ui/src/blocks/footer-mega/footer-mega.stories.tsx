import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Globe, Mail, Rss, Video } from "lucide-react";

import { FooterMegaBlock } from "./footer-mega";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FooterMegaBlock> = {
  title: "Blocks/Footer mega",
  component: FooterMegaBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FooterMegaBlock>;

/** SmoothUI "Footer 3": logo, four link columns and a newsletter over a social bar. */
export const Default: Story = {};

/** Every source item: SmoothUI "Footer 3" (Footer Mega), with icons for the social links. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FooterMegaBlock
        social={[
          { label: "Email", href: "mailto:hello@example.com", icon: <Mail /> },
          { label: "RSS feed", href: "#rss", icon: <Rss /> },
          { label: "Video channel", href: "#video", icon: <Video /> },
          { label: "Website", href: "https://example.com", icon: <Globe />, external: true },
        ]}
      />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Footer 3 — Footer Mega
      </figcaption>
    </figure>
  ),
};

/** A drawn logo mark from tokens in place of the name. */
export const WithLogo: Story = {
  args: {
    logo: (
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
