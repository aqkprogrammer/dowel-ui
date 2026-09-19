"use client";

// Ported from SmoothUI Job Listing Component (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A list of compact rows — a job, a release, a person — each of which grows
 * into a detail card over a blurred backdrop.
 *
 * Every row is a real button that opens a Radix modal dialog: focus moves into
 * it and is trapped, the page behind is inert, Escape, the backdrop and a
 * named Close button all dismiss it, and focus returns to the row that opened
 * it. The title and description name and describe the dialog.
 *
 * The row growing into the card (and its logo and title travelling with it)
 * is a shared-layout animation between two DOM positions — `motion`'s
 * layoutId, the one reason this depends on it (ADR 0014). Under reduced
 * motion the dialog simply appears in place.
 */

const expandableListVariants = cva("flex w-full flex-col", {
  variants: {
    density: {
      comfortable: "gap-4",
      compact: "gap-2",
    },
  },
  defaultVariants: {
    density: "comfortable",
  },
});

export interface ExpandableListItem {
  id: string;
  title: string;
  /** A line under the title — a role and salary, say. */
  subtitle?: ReactNode;
  /** Small print — location, schedule. */
  meta?: ReactNode;
  /** A logo or avatar. Decorative: the title names the row. */
  media?: ReactNode;
  /** The detail shown when the row is open. */
  content: ReactNode;
  /** Controls in the detail view — an Apply link, say. */
  actions?: ReactNode;
}

export interface ExpandableListProps
  extends
    Omit<ComponentPropsWithRef<"ul">, "children" | "defaultValue">,
    VariantProps<typeof expandableListVariants> {
  items: ExpandableListItem[];
  /** The open item's id, or null (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Accessible name of the Close button. */
  closeLabel?: string;
  rowClassName?: string;
}

const transition = { type: "spring", bounce: 0.1, duration: 0.25 } as const;

function Summary({
  item,
  layout,
  detail = false,
}: {
  item: ExpandableListItem;
  layout: (part: string) => string;
  detail?: boolean;
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-4 text-start">
      {item.media ? (
        <motion.span
          layoutId={layout("media")}
          aria-hidden="true"
          className="grid shrink-0 place-items-center [&_svg]:size-8"
        >
          {item.media}
        </motion.span>
      ) : null}
      <span className="flex min-w-0 flex-col gap-0.5">
        {detail ? (
          <Dialog.Title asChild>
            <motion.h2
              layoutId={layout("title")}
              className="text-sm font-medium text-foreground"
            >
              {item.title}
            </motion.h2>
          </Dialog.Title>
        ) : (
          <motion.span layoutId={layout("title")} className="font-medium text-foreground">
            {item.title}
          </motion.span>
        )}
        {item.subtitle ? (
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        ) : null}
        {item.meta ? <span className="text-xs text-muted-foreground">{item.meta}</span> : null}
      </span>
    </span>
  );
}

/** Rows that expand into a detail dialog, growing out of their place in the list. */
export function ExpandableList({
  className,
  density,
  items,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  closeLabel = "Close",
  rowClassName,
  ...props
}: ExpandableListProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const openId = valueProp === undefined ? uncontrolled : valueProp;
  const openItem = items.find((item) => item.id === openId);
  const uid = useId();
  const rows = useRef(new Map<string, HTMLButtonElement>());

  function select(next: string | null) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  const layoutFor = (id: string) => (part: string) => `${uid}-${part}-${id}`;

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      <LayoutGroup id={uid}>
        <ul
          data-slot="expandable-list"
          className={cn(expandableListVariants({ density }), className)}
          {...props}
        >
          {items.map((item) => (
            <li key={item.id}>
              <motion.button
                type="button"
                ref={(node: HTMLButtonElement | null) => {
                  if (node) rows.current.set(item.id, node);
                  else rows.current.delete(item.id);
                }}
                layoutId={layoutFor(item.id)("card")}
                aria-haspopup="dialog"
                aria-expanded={openId === item.id}
                data-slot="expandable-list-row"
                data-state={openId === item.id ? "open" : "closed"}
                onClick={() => select(item.id)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-4 border border-border bg-card p-2 text-card-foreground shadow-xs select-none md:p-4",
                  "transition-colors duration-[var(--duration-fast)] hover:bg-accent",
                  focusRing,
                  rowClassName,
                )}
                style={{ borderRadius: 8 }}
              >
                <Summary item={item} layout={layoutFor(item.id)} />
              </motion.button>
            </li>
          ))}
        </ul>

        <Dialog.Root
          open={openItem !== undefined}
          onOpenChange={(open) => {
            if (!open) select(null);
          }}
        >
          <AnimatePresence>
            {openItem ? (
              <Dialog.Portal forceMount key={openItem.id}>
                <Dialog.Overlay asChild forceMount>
                  <motion.div
                    data-slot="expandable-list-overlay"
                    className="fixed inset-0 z-[var(--z-overlay)] bg-overlay backdrop-blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                </Dialog.Overlay>
                <div className="pointer-events-none fixed inset-0 z-[var(--z-modal)] grid place-items-center p-4">
                  <Dialog.Content
                    asChild
                    forceMount
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      rows.current.get(openItem.id)?.focus();
                    }}
                  >
                    <motion.div
                      layoutId={layoutFor(openItem.id)("card")}
                      data-slot="expandable-list-detail"
                      className="pointer-events-auto relative flex max-h-full w-[90%] max-w-2xl flex-col items-start gap-4 overflow-y-auto border border-border bg-card p-4 pe-14 text-card-foreground shadow-xl outline-none"
                      style={{ borderRadius: 12 }}
                    >
                      <Summary item={openItem} layout={layoutFor(openItem.id)} detail />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex w-full flex-col gap-4"
                      >
                        <Dialog.Description asChild>
                          <div className="text-sm text-muted-foreground">
                            {openItem.content}
                          </div>
                        </Dialog.Description>
                        {openItem.actions ? (
                          <div className="flex flex-wrap gap-2">{openItem.actions}</div>
                        ) : null}
                      </motion.div>
                      <Dialog.Close
                        aria-label={closeLabel}
                        data-slot="expandable-list-close"
                        className={cn(
                          "absolute end-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground",
                          "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
                          focusRing,
                        )}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="size-4"
                        >
                          <path
                            d="m6 6 12 12M18 6 6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </Dialog.Close>
                    </motion.div>
                  </Dialog.Content>
                </div>
              </Dialog.Portal>
            ) : null}
          </AnimatePresence>
        </Dialog.Root>
      </LayoutGroup>
    </MotionConfig>
  );
}

export { expandableListVariants };
