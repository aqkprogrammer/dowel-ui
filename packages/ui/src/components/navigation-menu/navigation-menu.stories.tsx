import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

const meta: Meta<typeof NavigationMenu> = {
  title: "Navigation/Navigation Menu",
  component: NavigationMenu,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof meta>;

const PRODUCT = [
  ["Components", "Accessible components you own as source."],
  ["Blocks", "Whole sections and application screens."],
  ["Backgrounds", "WebGL, canvas and CSS backdrops."],
  ["Playground", "Every prop as a control, every state as a link."],
];

/** A short menu, a mega menu, and a plain link. Hover, click, or use the arrow keys and Tab. */
export const Default: Story = {
  render: () => (
    <div className="h-96">
      <NavigationMenu aria-label="Main">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[min(36rem,90vw)] gap-1 p-1 sm:grid-cols-2">
                {PRODUCT.map(([title, body]) => (
                  <li key={title}>
                    <NavigationMenuLink href={`#${title ?? ""}`}>
                      <span className="block font-medium">{title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[min(40rem,90vw)] gap-3 p-2 sm:grid-cols-[1.2fr_1fr]">
                <NavigationMenuLink
                  href="#launch"
                  className="flex min-h-40 flex-col justify-end rounded-lg bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklab,var(--color-primary)_25%,transparent),transparent_65%)] p-5"
                >
                  <span className="text-xs font-medium tracking-widest text-primary uppercase">
                    New
                  </span>
                  <span className="mt-1 block text-lg font-semibold">The 0.14 release</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Backgrounds, scroll effects and more.
                  </span>
                </NavigationMenuLink>
                <ul className="grid gap-1">
                  {["Documentation", "Changelog", "Agent guide", "Accessibility"].map(
                    (title) => (
                      <li key={title}>
                        <NavigationMenuLink href={`#${title}`}>{title}</NavigationMenuLink>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#pricing" active className={navigationMenuTriggerStyle()}>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
};
