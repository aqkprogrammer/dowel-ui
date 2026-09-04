import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLabel,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

const meta = {
  title: "Navigation/Sidebar",
  component: Sidebar,
  parameters: { controls: { disable: true }, layout: "fullscreen" },
  args: { label: "Application" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/settings", label: "Settings" },
];

function Shell({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [active, setActive] = useState("/app");

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex h-[28rem] border border-border">
        <Sidebar label="Application">
          <SidebarHeader>
            <SidebarTrigger />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                {LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      href={link.href}
                      isActive={active === link.href}
                      onClick={(event) => {
                        event.preventDefault();
                        setActive(link.href);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      <SidebarMenuLabel>{link.label}</SidebarMenuLabel>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <p className="px-2 text-xs text-muted-foreground">v0.5.0</p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="p-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {LINKS.find((link) => link.href === active)?.label}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The active entry carries aria-current, not only a background colour.
          </p>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Default: Story = {
  render: () => <Shell />,
};

/**
 * Collapsed to a rail. The labels are visually hidden rather than removed, so
 * every entry keeps its accessible name.
 */
export const Collapsed: Story = {
  render: () => <Shell defaultOpen={false} />,
};
