import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import {
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarContent,
  NavbarMobileMenu,
  NavbarSkipLink,
} from "./navbar";

const meta = {
  title: "Navigation/Navbar",
  component: Navbar,
  args: { variant: "default", behavior: "sticky", elevate: true },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "floating", "glass"] },
    behavior: { control: "inline-radio", options: ["static", "sticky", "hide-on-scroll"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const LINKS = ["Components", "Blocks", "Backgrounds", "Docs", "Pricing"];

/** Scroll the page: the bar lifts off the content. Narrow the window for the mobile menu. */
export const Default: Story = {
  render: (args) => (
    <div>
      <Navbar {...args}>
        <NavbarSkipLink />
        <NavbarBrand href="#top">
          <span aria-hidden="true" className="size-6 rounded-full bg-primary" />
          Dowel
        </NavbarBrand>
        <NavbarContent>
          <nav aria-label="Main" className="flex gap-1">
            {LINKS.map((link) => (
              <a
                key={link}
                href={`#${link}`}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {link}
              </a>
            ))}
          </nav>
        </NavbarContent>
        <NavbarActions>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button size="sm">Get started</Button>
          <NavbarMobileMenu>
            <nav aria-label="Mobile" className="grid gap-1">
              {LINKS.map((link) => (
                <a
                  key={link}
                  href={`#${link}`}
                  className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {link}
                </a>
              ))}
            </nav>
          </NavbarMobileMenu>
        </NavbarActions>
      </Navbar>
      <main id="content" className="mx-auto grid max-w-3xl gap-6 px-6 py-12">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            Paragraph {i + 1}. Scroll to see the navbar lift — or, with hide-on-scroll, slide
            away while you read and return the moment you scroll back up.
          </p>
        ))}
      </main>
    </div>
  ),
};

/** Floating: a rounded bar detached from the edges. */
export const Floating: Story = { ...Default, args: { variant: "floating" } };

/** Hides while scrolling down, returns on scrolling up — but never while it holds focus. */
export const HideOnScroll: Story = {
  ...Default,
  args: { behavior: "hide-on-scroll", variant: "glass" },
};
