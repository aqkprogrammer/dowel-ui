"use client";

// Ported from SmoothUI User Account Avatar (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/components/popover";
import { Progress } from "@/components/progress";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An avatar that opens an account panel of collapsible sections — edit the
 * profile, check recent orders. The sections hold forms, so this is a
 * popover of disclosures, not a menu: role="menu" cannot contain text
 * fields. Sections open with a CSS grid-rows transition (0fr → 1fr) and a
 * blur, replacing the source's motion height springs; one is open at a time.
 */

export interface AccountMenuUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AccountMenuContextValue {
  user: AccountMenuUser;
  section: string | null;
  setSection: (section: string | null) => void;
}

const AccountMenuContext = createContext<AccountMenuContextValue | null>(null);
const SectionContext = createContext({ expanded: false, close: () => {} });

function useAccountMenu() {
  const context = useContext(AccountMenuContext);
  if (!context) throw new Error("AccountMenu parts must be used inside <AccountMenu>.");
  return context;
}

export interface AccountMenuProps extends Omit<PopoverContentProps, "children"> {
  user: AccountMenuUser;
  children: ReactNode;
  /** The trigger's accessible name. Defaults to "Account menu for <name>". */
  triggerLabel?: string;
  triggerClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The expanded section's value, or null (controlled). */
  section?: string | null;
  defaultSection?: string | null;
  onSectionChange?: (section: string | null) => void;
}

/** An avatar button that opens an account panel of collapsible sections. */
export function AccountMenu({
  className,
  user,
  children,
  triggerLabel,
  triggerClassName,
  open,
  defaultOpen,
  onOpenChange,
  section: sectionProp,
  defaultSection = null,
  onSectionChange,
  ...props
}: AccountMenuProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultSection);
  const section = sectionProp === undefined ? uncontrolled : sectionProp;
  const headingId = useId();

  function setSection(next: string | null) {
    if (sectionProp === undefined) setUncontrolled(next);
    onSectionChange?.(next);
  }

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="account-menu-trigger"
          aria-label={triggerLabel ?? `Account menu for ${user.name}`}
          className={cn(
            "rounded-full border border-border bg-background",
            focusRing,
            triggerClassName,
          )}
        >
          <Avatar size="lg">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" draggable={false} />
            ) : null}
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-labelledby={headingId}
        {...props}
        data-slot="account-menu-content"
        className={cn("w-72 overflow-hidden rounded-xl p-0", className)}
      >
        <div className="border-b border-border px-4 py-3">
          <p id={headingId} className="truncate text-sm font-semibold">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <AccountMenuContext.Provider value={{ user, section, setSection }}>
          <div className="flex flex-col divide-y divide-border p-1">{children}</div>
        </AccountMenuContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

export interface AccountMenuSectionProps extends Omit<ComponentPropsWithRef<"div">, "title"> {
  value: string;
  label: ReactNode;
  /** A leading icon. Decorative. */
  icon?: ReactNode;
}

/** A collapsible section: a disclosure button and the panel it reveals. */
export function AccountMenuSection({
  className,
  value,
  label,
  icon,
  children,
  ...props
}: AccountMenuSectionProps) {
  const { section, setSection } = useAccountMenu();
  const expanded = section === value;
  const panelId = useId();
  const state = expanded ? "open" : "closed";

  return (
    <div
      data-slot="account-menu-section"
      data-state={state}
      className={cn("py-0.5", className)}
      {...props}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setSection(expanded ? null : value)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          expanded ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          focusRing,
        )}
      >
        {icon ? (
          <span aria-hidden="true" className="flex">
            {icon}
          </span>
        ) : null}
        {label}
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={typeof label === "string" ? label : undefined}
        inert={!expanded}
        data-state={state}
        className={cn(
          "grid transition-[grid-template-rows,opacity,filter] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          "data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=closed]:blur-[10px] data-[state=open]:grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <SectionContext.Provider value={{ expanded, close: () => setSection(null) }}>
            {children}
          </SectionContext.Provider>
        </div>
      </div>
    </div>
  );
}

export interface AccountMenuProfileFormProps extends Omit<
  ComponentPropsWithRef<"form">,
  "onSubmit"
> {
  /** Called with the edited user; the section then collapses. */
  onSave?: (user: AccountMenuUser) => void;
  saveLabel?: string;
}

/** The source's "Edit Profile" form: name and email, prefilled from the user. */
export function AccountMenuProfileForm({
  className,
  onSave,
  saveLabel = "Save changes",
  ...props
}: AccountMenuProfileFormProps) {
  const { user } = useAccountMenu();
  const { close } = useContext(SectionContext);
  const id = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (key: string) => {
      const value = data.get(key);
      return typeof value === "string" ? value : "";
    };
    onSave?.({ ...user, name: field("name"), email: field("email") });
    close();
  }

  return (
    <form
      className={cn("flex flex-col gap-3 p-3", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} name="name" defaultValue={user.name} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          defaultValue={user.email}
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="mt-1">
        {saveLabel}
      </Button>
    </form>
  );
}

export interface AccountMenuOrder {
  id: string;
  date: string;
  status: "processing" | "shipped" | "delivered";
  /** 0–100. */
  progress: number;
}

export interface AccountMenuOrdersProps extends ComponentPropsWithRef<"ul"> {
  orders: AccountMenuOrder[];
  onView?: (orderId: string) => void;
}

const STATUS_TONE = {
  processing: "primary",
  shipped: "warning",
  delivered: "success",
} as const;

/** The source's "Last Orders": each order's status, progress and a view button. */
export function AccountMenuOrders({
  className,
  orders,
  onView,
  ...props
}: AccountMenuOrdersProps) {
  const { expanded } = useContext(SectionContext);
  return (
    <ul className={cn("flex flex-col gap-2 p-3", className)} {...props}>
      {orders.map((order) => (
        <li
          key={order.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{order.id}</span>
            <span className="text-xs text-muted-foreground">{order.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium capitalize">{order.status}</span>
                <span className="text-muted-foreground">{order.progress}%</span>
              </div>
              {/* Fills from empty each time the section opens, as the source did. */}
              <Progress
                size="sm"
                tone={STATUS_TONE[order.status]}
                value={expanded ? order.progress : 0}
                aria-label={`Order ${order.id} progress`}
              />
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`View order ${order.id}`}
              onClick={() => onView?.(order.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
