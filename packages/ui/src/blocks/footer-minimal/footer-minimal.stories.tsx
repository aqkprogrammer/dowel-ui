import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Globe, Mail, Rss } from "lucide-react";

import { FooterMinimalBlock } from "./footer-minimal";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FooterMinimalBlock> = {
  title: "Blocks/Footer minimal",
  component: FooterMinimalBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FooterMinimalBlock>;

/** SmoothUI "Footer 4": one row; links underline from the inline start on hover and focus. */
export const Default: Story = {};

/** Every source item: SmoothUI "Footer 4" (Footer Minimal), with icons for the social links. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FooterMinimalBlock
        social={[
          { label: "Email", href: "mailto:hello@example.com", icon: <Mail /> },
          { label: "RSS feed", href: "#rss", icon: <Rss /> },
          { label: "Website", href: "https://example.com", icon: <Globe />, external: true },
        ]}
      />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Footer 4 — Footer Minimal
      </figcaption>
    </figure>
  ),
};

/** Right to left: the underline grows from the inline start. */
export const RightToLeft: Story = {
  args: {
    dir: "rtl",
    logo: "أكمي",
    copyright: "© أكمي",
    links: [
      { label: "الخصوصية", href: "#privacy" },
      { label: "الشروط", href: "#terms" },
      { label: "اتصل بنا", href: "#contact" },
    ],
    social: [],
    navLabel: "تذييل",
  },
};
