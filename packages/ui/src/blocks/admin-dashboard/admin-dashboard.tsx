"use client";

import { Fragment, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/alert";
import { Avatar, AvatarFallback } from "@/components/avatar";
import { Badge } from "@/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/breadcrumb";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { MetricDelta, type MetricPolarity } from "@/components/metric-delta";
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
} from "@/components/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { cn } from "@/lib/utils";

/**
 * An administration console: the shell every admin page shares, and the
 * overview that is its front page.
 *
 * The shell is the reusable half. Pass `children` and the navigation, header
 * and account menu stay while the page changes — which is how an admin area
 * grows from one page to twenty without twenty copies of a sidebar. Leave
 * `children` out and the overview renders: what needs attention, the numbers,
 * and the accounts that matter most right now.
 *
 * "What needs attention" comes first, and it is the only part allowed to be
 * loud. An admin console that opens on a grid of KPIs and buries the
 * past-due account three cards down is a console that gets the priority the
 * wrong way round.
 */

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  /** A small count beside the label, e.g. open tickets. */
  count?: number;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export interface AdminBreadcrumb {
  label: string;
  /** Omit on the current page. */
  href?: string;
}

export interface AdminStat {
  id: string;
  label: string;
  value: number;
  previous?: number;
  polarity?: MetricPolarity;
  comparisonLabel?: string;
  format?: (value: number) => string;
}

export type AdminAccountStatus = "active" | "trial" | "past-due" | "suspended";

export interface AdminAccount {
  id: string;
  name: string;
  plan: string;
  seats: number;
  status: AdminAccountStatus;
  /** Formatted monthly revenue, because the currency is a presentation choice. */
  revenue: string;
  /** Machine-readable creation time. */
  createdAt?: string;
  /** Human label, e.g. "3 days ago". */
  createdLabel?: string;
  href?: string;
}

export interface AdminNotice {
  id: string;
  title: string;
  detail?: string;
  severity: "info" | "warning" | "destructive";
  /** Where to go to deal with it. */
  href?: string;
  actionLabel?: string;
}

export interface AdminUser {
  name: string;
  /** Shown under the name. */
  role?: string;
}

export interface AdminDashboardBlockProps {
  /** The product or workspace, at the top of the navigation. */
  workspaceName: string;
  navigation: AdminNavGroup[];
  /** The `href` of the page being shown. */
  activeHref?: string;
  /** Called instead of following the link, for a client-side router. */
  onNavigate?: (href: string) => void;
  breadcrumbs?: AdminBreadcrumb[];
  title?: string;
  description?: string;
  notices?: AdminNotice[];
  stats?: AdminStat[];
  accounts?: AdminAccount[];
  accountsTitle?: string;
  accountsDescription?: string;
  onOpenAccount?: (account: AdminAccount) => void;
  user?: AdminUser;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  headerActions?: ReactNode;
  /** Replaces the overview. The shell around it stays. */
  children?: ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<AdminAccountStatus, string> = {
  active: "Active",
  trial: "Trial",
  "past-due": "Past due",
  suspended: "Suspended",
};

const STATUS_VARIANT: Record<
  AdminAccountStatus,
  "success" | "info" | "warning" | "destructive"
> = {
  active: "success",
  trial: "info",
  "past-due": "warning",
  suspended: "destructive",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function count(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function AdminDashboardBlock({
  workspaceName,
  navigation,
  activeHref,
  onNavigate,
  breadcrumbs = [],
  title = "Overview",
  description = "What needs attention, and how the business is doing.",
  notices = [],
  stats = [],
  accounts = [],
  accountsTitle = "Accounts to watch",
  accountsDescription = "Newest, trialling, or behind on payment.",
  onOpenAccount,
  user,
  onSignOut,
  onOpenProfile,
  headerActions,
  children,
  className,
}: AdminDashboardBlockProps) {
  const heading =
    breadcrumbs.length > 0 ? (breadcrumbs[breadcrumbs.length - 1]?.label ?? title) : title;

  return (
    <SidebarProvider>
      <div className={cn("flex h-full min-h-0 w-full", className)}>
        <Sidebar label="Admin" mobileTitle={workspaceName}>
          <SidebarHeader className="justify-between">
            <span className="truncate px-2 text-sm font-semibold">{workspaceName}</span>
            <SidebarTrigger />
          </SidebarHeader>

          <SidebarContent>
            {navigation.map((group) => (
              <SidebarGroup key={group.id}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        href={item.href}
                        isActive={item.href === activeHref}
                        onClick={
                          onNavigate
                            ? (event) => {
                                event.preventDefault();
                                onNavigate(item.href);
                              }
                            : undefined
                        }
                      >
                        {item.icon}
                        <SidebarMenuLabel className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{item.label}</span>
                          {item.count === undefined ? null : (
                            <Badge size="sm" variant="secondary">
                              {count(item.count)}
                              <span className="sr-only"> items</span>
                            </Badge>
                          )}
                        </SidebarMenuLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {user ? (
            <SidebarFooter>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2.5 px-2 py-1.5"
                    aria-label={`Account menu for ${user.name}`}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <SidebarMenuLabel className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                      {user.role ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {user.role}
                        </span>
                      ) : null}
                    </SidebarMenuLabel>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onOpenProfile ? (
                    <DropdownMenuItem onSelect={onOpenProfile}>Profile</DropdownMenuItem>
                  ) : null}
                  {onSignOut ? (
                    <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          ) : null}
        </Sidebar>

        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-4 py-2">
            <SidebarTrigger className="md:hidden" />
            {breadcrumbs.length > 0 ? (
              <Breadcrumb className="min-w-0 flex-1">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => {
                    const last = index === breadcrumbs.length - 1;
                    const key = `${crumb.label}-${String(index)}`;
                    return (
                      <Fragment key={key}>
                        <BreadcrumbItem>
                          {last || !crumb.href ? (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {last ? null : <BreadcrumbSeparator />}
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{heading}</span>
            )}
            {headerActions}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {children ?? (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>

                {notices.length > 0 ? (
                  /*
                    First, and the only loud part of the page. Not live regions:
                    the list is here on load, and re-announcing it on every
                    refresh would make the console unusable.
                  */
                  <section aria-label="Needs attention" className="grid gap-3">
                    {notices.map((notice) => (
                      <Alert key={notice.id} variant={notice.severity}>
                        <AlertTitle>{notice.title}</AlertTitle>
                        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                          <span>{notice.detail}</span>
                          {notice.href ? (
                            <Button asChild variant="outline" size="sm">
                              <a href={notice.href}>{notice.actionLabel ?? "Review"}</a>
                            </Button>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </section>
                ) : null}

                {stats.length > 0 ? (
                  <section
                    aria-label="Key metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {stats.map((stat) => (
                      <Card key={stat.id}>
                        <CardContent className="pt-6">
                          <MetricDelta
                            label={stat.label}
                            value={stat.value}
                            previous={stat.previous}
                            polarity={stat.polarity}
                            comparisonLabel={stat.comparisonLabel}
                            format={stat.format}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle asChild>
                      <h2>{accountsTitle}</h2>
                    </CardTitle>
                    <CardDescription>{accountsDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {accounts.length === 0 ? (
                      <EmptyState size="sm">
                        <EmptyStateTitle>Nothing to watch</EmptyStateTitle>
                        <EmptyStateDescription>
                          No account is new, trialling or behind on payment.
                        </EmptyStateDescription>
                      </EmptyState>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">Account</TableHead>
                            <TableHead scope="col">Plan</TableHead>
                            <TableHead scope="col" className="text-end">
                              Seats
                            </TableHead>
                            <TableHead scope="col">Status</TableHead>
                            <TableHead scope="col" className="text-end">
                              Monthly
                            </TableHead>
                            <TableHead scope="col">Created</TableHead>
                            {onOpenAccount ? (
                              <TableHead scope="col">
                                <span className="sr-only">Open</span>
                              </TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableHead scope="row" className="font-medium text-foreground">
                                {account.href && !onOpenAccount ? (
                                  <a
                                    href={account.href}
                                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                                  >
                                    {account.name}
                                  </a>
                                ) : (
                                  account.name
                                )}
                              </TableHead>
                              <TableCell>{account.plan}</TableCell>
                              <TableCell className="text-end tabular-nums">
                                {count(account.seats)}
                              </TableCell>
                              <TableCell>
                                <Badge size="sm" variant={STATUS_VARIANT[account.status]}>
                                  {STATUS_LABEL[account.status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-end tabular-nums">
                                {account.revenue}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {account.createdLabel ? (
                                  <time dateTime={account.createdAt}>
                                    {account.createdLabel}
                                  </time>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              {onOpenAccount ? (
                                <TableCell className="text-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Open ${account.name}`}
                                    onClick={() => {
                                      onOpenAccount(account);
                                    }}
                                  >
                                    Open
                                  </Button>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
