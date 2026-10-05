"use client";

// Original design (pattern inspired by Animate UI Code Tabs; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { CodeBlock } from "@/components/code-block";
import { CopyButton } from "@/components/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { cn } from "@/lib/utils";

/*
 * The same command in a few dialects — pnpm, npm, yarn, bun — behind tabs.
 *
 * It is Dowel's Tabs (the Radix tabs pattern: arrows, Home/End, one tab stop)
 * around a frameless Code Block, with one Copy Button in the header that
 * always copies the snippet on screen.
 *
 * Motion:
 *
 * - The active tab's pill (or underline) is one element that springs between
 *   tabs — a shared-layout animation (`layoutId`), one reason for `motion`.
 * - The outgoing snippet lifts away and blurs while the incoming one settles
 *   up out of a blur; both run at once, so it reads as a cross-fade.
 * - The panel's height springs from one snippet's to the next instead of
 *   jumping when a three-line yarn snippet replaces a one-line pnpm one.
 *
 * Nothing moves on first paint, and under reduced motion every change is
 * instant.
 *
 * The Dowel twist is `syncKey`. Every Code Tabs on the page with the same key
 * switches together, and the choice is remembered in localStorage — the way
 * documentation sites remember your package manager — and follows you across
 * browser tabs through the `storage` event. Storage is best-effort: private
 * modes and full quotas throw, and the choice then only lasts the page.
 */

export interface CodeTab {
  /** Identifies the tab, and is what `syncKey` shares: use the same values across instances. */
  value: string;
  /** The tab's text, and the name of its code region. */
  label: string;
  code: string;
  /** A language hint for the code block. */
  language?: string;
  /** A small glyph before the label. Decorative. */
  icon?: ReactNode;
}

/** The frame. */
const codeTabsVariants = cva(
  "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs",
);

/** The tab row, per indicator. */
const codeTabsListVariants = cva("relative", {
  variants: {
    indicator: {
      pill: "h-8 gap-0.5 rounded-lg bg-muted p-0.5",
      underline: "h-auto gap-3 self-stretch rounded-none bg-transparent p-0",
    },
  },
  defaultVariants: { indicator: "pill" },
});

/** A tab, per indicator. Its own active styling gives way to the travelling indicator. */
const codeTabsTriggerVariants = cva(
  cn(
    "relative isolate font-mono text-xs",
    "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
  ),
  {
    variants: {
      indicator: {
        pill: "h-7 px-2.5",
        underline: "h-auto self-stretch rounded-none px-1",
      },
    },
    defaultVariants: { indicator: "pill" },
  },
);

/** The travelling indicator. */
const codeTabsIndicatorVariants = cva("pointer-events-none absolute -z-10", {
  variants: {
    indicator: {
      pill: "inset-0 rounded-md bg-background shadow-xs ring-1 ring-border/60",
      underline: "inset-x-0 bottom-0 h-0.5 rounded-full bg-primary",
    },
  },
  defaultVariants: { indicator: "pill" },
});

/* The page-wide choice per syncKey ------------------------------------------ */

const STORAGE_PREFIX = "dowel-code-tabs:";
const chosen = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function readStored(key: string): string | undefined {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // Private mode or a full quota: the choice still syncs on this page.
  }
}

function subscribe(key: string, notify: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  listeners.set(key, set);
  set.add(notify);
  // Another browser tab chose: follow it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_PREFIX + key || event.newValue === null) return;
    chosen.set(key, event.newValue);
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(key: string): string | undefined {
  if (!chosen.has(key)) {
    const stored = readStored(key);
    if (stored !== undefined) chosen.set(key, stored);
  }
  return chosen.get(key);
}

function publish(key: string, value: string) {
  chosen.set(key, value);
  writeStored(key, value);
  for (const notify of listeners.get(key) ?? []) notify();
}

const noop = () => () => {};

/** The value chosen for `key` anywhere on the page, or remembered from before. */
function useSyncedChoice(key: string | undefined): string | undefined {
  const subscribeToKey = useCallback(
    (notify: () => void) => (key === undefined ? noop() : subscribe(key, notify)),
    [key],
  );
  return useSyncExternalStore(
    subscribeToKey,
    () => (key === undefined ? undefined : snapshot(key)),
    // The server cannot know; hydration starts from the default and then
    // moves to the remembered choice.
    () => undefined,
  );
}

/* The component ------------------------------------------------------------- */

const SPRING: Transition = { type: "spring", stiffness: 500, damping: 38 };
const HEIGHT: Transition = { type: "spring", bounce: 0.1, duration: 0.45 };
const FADE: Transition = { type: "spring", bounce: 0, duration: 0.35 };
const INSTANT: Transition = { duration: 0 };

export interface CodeTabsProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "dir">,
    VariantProps<typeof codeTabsListVariants> {
  tabs: CodeTab[];
  /** The active tab's value (controlled). */
  value?: string;
  /** The tab active at first render (uncontrolled). Defaults to the first. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Instances sharing a key switch together and remember the choice in
   * localStorage. A remembered value this instance does not offer is ignored.
   */
  syncKey?: string;
  /** Names the tab list. */
  listLabel?: string;
  /** Names the copy button. */
  copyLabel?: string;
  /** Hides the copy button. */
  hideCopy?: boolean;
  dir?: "ltr" | "rtl";
}

/** Tabs of code snippets with a springing indicator, a blur cross-fade and a page-wide `syncKey`. */
export function CodeTabs({
  className,
  tabs,
  value: valueProp,
  defaultValue,
  onValueChange,
  syncKey,
  indicator,
  listLabel = "Code variants",
  copyLabel = "Copy code",
  hideCopy = false,
  ...props
}: CodeTabsProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const synced = useSyncedChoice(syncKey);
  const [local, setLocal] = useState(defaultValue);
  const offers = (candidate: string | undefined) =>
    candidate !== undefined && tabs.some((tab) => tab.value === candidate);

  const active =
    valueProp ??
    (offers(synced) ? synced : undefined) ??
    (offers(local) ? local : undefined) ??
    tabs[0]?.value ??
    "";
  const current = tabs.find((tab) => tab.value === active);

  function change(next: string) {
    if (valueProp === undefined) setLocal(next);
    if (syncKey !== undefined) publish(syncKey, next);
    onValueChange?.(next);
  }

  // The viewport springs to the height of whatever snippet is in it.
  const content = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const element = content.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setHeight(element.offsetHeight);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const mode = indicator ?? "pill";

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={uid}>
        <Tabs
          value={active}
          onValueChange={change}
          data-slot="code-tabs"
          data-indicator={mode}
          className={cn(codeTabsVariants(), className)}
          {...props}
        >
          <div
            data-slot="code-tabs-header"
            className="flex min-h-11 items-center gap-2 border-b border-border bg-muted/40 px-2"
          >
            <TabsList
              aria-label={listLabel}
              className={codeTabsListVariants({ indicator: mode })}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-slot="code-tabs-trigger"
                  className={codeTabsTriggerVariants({ indicator: mode })}
                >
                  {tab.value === active ? (
                    <motion.span
                      layoutId={`${uid}-indicator`}
                      aria-hidden="true"
                      data-slot="code-tabs-indicator"
                      className={codeTabsIndicatorVariants({ indicator: mode })}
                      transition={reduce ? INSTANT : SPRING}
                    />
                  ) : null}
                  {tab.icon ? (
                    <span aria-hidden="true" className="inline-flex">
                      {tab.icon}
                    </span>
                  ) : null}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {hideCopy ? null : (
              <CopyButton
                value={() => current?.code ?? ""}
                variant="ghost"
                aria-label={copyLabel}
                timeout={1500}
                data-slot="code-tabs-copy"
                className="ms-auto size-7 text-muted-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-3.5"
              />
            )}
          </div>
          <motion.div
            data-slot="code-tabs-viewport"
            initial={false}
            animate={{ height }}
            transition={reduce ? INSTANT : HEIGHT}
            className="relative overflow-hidden"
          >
            <div ref={content} className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                {current ? (
                  <TabsContent
                    key={current.value}
                    value={current.value}
                    forceMount
                    asChild
                    // The code region inside is the focus stop.
                    tabIndex={-1}
                    className="mt-0"
                  >
                    <motion.div
                      data-slot="code-tabs-panel"
                      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                      transition={reduce ? INSTANT : FADE}
                    >
                      <CodeBlock
                        frame={false}
                        hideCopy
                        code={current.code}
                        language={current.language}
                        title={current.label}
                        className="[&_pre]:p-4 [&_pre]:text-sm"
                      />
                    </motion.div>
                  </TabsContent>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </Tabs>
      </LayoutGroup>
    </MotionConfig>
  );
}

export {
  codeTabsIndicatorVariants,
  codeTabsListVariants,
  codeTabsTriggerVariants,
  codeTabsVariants,
};
