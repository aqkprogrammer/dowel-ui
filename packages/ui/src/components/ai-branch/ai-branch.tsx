"use client";

// Ported from SmoothUI AI Branch (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Alternative versions of a turn — regenerated answers, edited prompts — with
 * a pager to move between them.
 *
 * Every version stays mounted and the inactive ones are `hidden`, so switching
 * keeps whatever state lives inside them. Revealing one restarts its CSS
 * entrance (a fade and a 10px rise), because an element leaving display:none
 * replays its animation; reduced motion stops it. The page indicator is a
 * polite live region, so pressing Next says where it went.
 */

const PREFIX = "dowel-ai-branch";
const STYLES = `
[data-slot=branch-message][data-state=active]{animation:${PREFIX}-in var(--duration-slow) var(--ease-out-quint)}
@keyframes ${PREFIX}-in{from{opacity:0;transform:translateY(10px)}}
`;

interface BranchContextValue {
  current: number;
  total: number;
  setTotal: (total: number) => void;
  go: (delta: number) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

function useBranch(part: string): BranchContextValue {
  const context = useContext(BranchContext);
  if (!context) throw new Error(`<${part}> must be used within <Branch>.`);
  return context;
}

export interface BranchProps extends Omit<ComponentPropsWithRef<"div">, "defaultValue"> {
  /** Controlled index of the visible version. */
  value?: number;
  /** Initial index when uncontrolled. */
  defaultValue?: number;
  onValueChange?: (index: number) => void;
}

/** The root: holds which version is showing. Paging wraps around. */
export function Branch({
  className,
  value,
  defaultValue = 0,
  onValueChange,
  ...props
}: BranchProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [total, setTotal] = useState(0);
  const raw = value ?? uncontrolled;
  const current = total > 0 ? Math.min(Math.max(raw, 0), total - 1) : raw;

  const go = useCallback(
    (delta: number) => {
      if (total < 2) return;
      const next = (current + delta + total) % total;
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [current, total, value, onValueChange],
  );

  const context = useMemo(() => ({ current, total, setTotal, go }), [current, total, go]);

  return (
    <BranchContext.Provider value={context}>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div data-slot="branch" className={cn("grid w-full gap-2", className)} {...props} />
    </BranchContext.Provider>
  );
}

/** Each child is one version. Only the current one is shown. */
export function BranchMessages({ children }: { children: ReactNode }) {
  const { current, setTotal } = useBranch("BranchMessages");
  const versions = Children.toArray(children);
  const count = versions.length;

  // Layout effect, so the pager knows the count before first paint.
  useLayoutEffect(() => {
    setTotal(count);
  }, [count, setTotal]);

  return versions.map((version, index) => (
    <div
      key={index}
      data-slot="branch-message"
      data-state={index === current ? "active" : "inactive"}
      hidden={index !== current}
      className="grid gap-2"
    >
      {version}
    </div>
  ));
}

const branchSelectorVariants = cva("flex items-center gap-1", {
  variants: {
    from: {
      user: "justify-end self-end",
      assistant: "justify-start self-start",
    },
  },
  defaultVariants: {
    from: "assistant",
  },
});

export interface BranchSelectorProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof branchSelectorVariants> {}

/** The pager. Renders nothing while there is only one version. */
export function BranchSelector({ className, from, ...props }: BranchSelectorProps) {
  const { total } = useBranch("BranchSelector");
  if (total <= 1) return null;
  return (
    <div
      role="group"
      aria-label="Versions"
      data-slot="branch-selector"
      className={cn(branchSelectorVariants({ from }), className)}
      {...props}
    />
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={mirrorForDirection}
    >
      <path d={d} />
    </svg>
  );
}

type PagerButtonProps = Omit<ButtonProps, "asChild">;

function PagerButton({
  delta,
  name,
  path,
  className,
  children,
  onClick,
  ...props
}: PagerButtonProps & { delta: number; name: string; path: string }) {
  const { go, total } = useBranch(delta < 0 ? "BranchPrevious" : "BranchNext");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={name}
      disabled={total <= 1}
      className={cn("size-7 rounded-full text-muted-foreground active:scale-95", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) go(delta);
      }}
      {...props}
    >
      {children ?? <Chevron d={path} />}
    </Button>
  );
}

export function BranchPrevious(props: PagerButtonProps) {
  return <PagerButton delta={-1} name="Previous version" path="m15 18-6-6 6-6" {...props} />;
}

export function BranchNext(props: PagerButtonProps) {
  return <PagerButton delta={1} name="Next version" path="m9 18 6-6-6-6" {...props} />;
}

/** "2 of 3", announced politely when it changes. */
export function BranchPage({ className, ...props }: ComponentPropsWithRef<"span">) {
  const { current, total } = useBranch("BranchPage");
  return (
    <span
      data-slot="branch-page"
      aria-live="polite"
      aria-atomic="true"
      className={cn("text-xs font-medium text-muted-foreground tabular-nums", className)}
      {...props}
    >
      {current + 1} of {total}
    </span>
  );
}

export { branchSelectorVariants };
