"use client";

// Ported from SmoothUI Expandable Cards (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { Dialog } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Cards that open into a detail view, in one of two presentations:
 *
 * - `inline` (the SmoothUI original): a row of tall cards; the chosen one
 *   widens in place and its detail slides in beside the picture. Width is a
 *   CSS transition — the neighbours move because the layout does.
 * - `dialog`: a grid of cards; the chosen one grows into a modal detail view
 *   and shrinks back into its place on close. Growing one element out of
 *   another's box is a shared-layout animation between two DOM positions,
 *   which is what `motion`'s layoutId is for (ADR 0014), and the only reason
 *   this component depends on it.
 *
 * Either way the detail behaves like a dialog: focus moves into it, Escape
 * closes it, and focus returns to the card that opened it. The `dialog`
 * presentation is a real modal (Radix Dialog: focus trap, aria-modal, scroll
 * lock); the `inline` one is a disclosure, since the page around it stays
 * usable.
 */

export interface ExpandableCardAuthor {
  name: string;
  /** A line under the name — a job title, say. */
  subtitle?: string;
  /** Avatar URL. */
  image?: string;
}

export interface ExpandableCardItem {
  id: string;
  title: string;
  /** Cover image URL. */
  image: string;
  /** Alt text. Empty by default, since the title names the card. */
  imageAlt?: string;
  /** The detail text. */
  content: ReactNode;
  author?: ExpandableCardAuthor;
  /** Controls shown in the detail view — a play or read-more button. */
  actions?: ReactNode;
}

export interface ExpandableCardsProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue"
> {
  items: ExpandableCardItem[];
  /**
   * `inline` widens the chosen card in its row (the SmoothUI original);
   * `dialog` grows it out of a grid into a modal detail view.
   */
  presentation?: "inline" | "dialog";
  /** The open card's id, or null (controlled). */
  value?: string | null;
  /** The open card's id at first (uncontrolled). */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Classes for every card. */
  cardClassName?: string;
}

const coverTitle = "text-2xl font-bold text-white";
const coverShade =
  "pointer-events-none absolute inset-0 bg-linear-to-b from-overlay to-transparent";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Author({ author }: { author: ExpandableCardAuthor }) {
  return (
    <div data-slot="expandable-cards-author" className="mt-4 flex items-center gap-3">
      {author.image ? (
        <img
          src={author.image}
          alt=""
          draggable={false}
          className="size-12 shrink-0 rounded-full border border-border bg-muted object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{author.name}</p>
        {author.subtitle ? (
          <p className="text-xs text-muted-foreground">{author.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Cards that expand into a detail view, inline or as a dialog. */
export function ExpandableCards({
  className,
  items,
  presentation = "inline",
  value,
  defaultValue = null,
  onValueChange,
  cardClassName,
  ...props
}: ExpandableCardsProps) {
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue);
  const openId = value === undefined ? uncontrolled : value;
  const uid = useId().replace(/:/g, "");
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  function select(id: string | null) {
    if (value === undefined) setUncontrolled(id);
    onValueChange?.(id);
  }

  const shared = {
    items,
    openId,
    uid,
    triggers,
    select,
    cardClassName,
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="expandable-cards"
        data-presentation={presentation}
        className={cn("w-full", className)}
        {...props}
      >
        {presentation === "dialog" ? <DialogCards {...shared} /> : <InlineCards {...shared} />}
      </div>
    </MotionConfig>
  );
}

interface PresentationProps {
  items: ExpandableCardItem[];
  openId: string | null;
  uid: string;
  triggers: { current: Map<string, HTMLButtonElement> };
  select: (id: string | null) => void;
  cardClassName?: string;
}

function InlineCards({
  items,
  openId,
  uid,
  triggers,
  select,
  cardClassName,
}: PresentationProps) {
  const panels = useRef(new Map<string, HTMLDivElement>());
  const focusPanel = useRef(false);

  useEffect(() => {
    if (!focusPanel.current || openId === null) return;
    focusPanel.current = false;
    panels.current.get(openId)?.focus({ preventScroll: true });
    triggers.current.get(openId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [openId, triggers]);

  function toggle(id: string) {
    if (openId === id) {
      select(null);
      return;
    }
    focusPanel.current = true;
    select(id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>, id: string) {
    if (event.key !== "Escape" || openId !== id) return;
    event.preventDefault();
    select(null);
    triggers.current.get(id)?.focus();
  }

  return (
    <ul
      data-slot="expandable-cards-list"
      className="mx-auto flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 pt-4 pb-8"
    >
      {items.map((item) => {
        const open = openId === item.id;
        const panelId = `${uid}-panel-${item.id}`;
        const titleId = `${uid}-title-${item.id}`;
        return (
          // Escape closes the detail from wherever focus is inside the card —
          // the trigger, the panel or its actions — as it would a dialog. The
          // list item is not itself interactive; it only hears the key bubble.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <li
            key={item.id}
            data-slot="expandable-cards-card"
            data-state={open ? "open" : "closed"}
            className={cn(
              "relative h-75 w-50 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-background shadow-lg",
              "transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] data-[state=open]:w-125",
              cardClassName,
            )}
            onKeyDown={(event) => handleKeyDown(event, item.id)}
          >
            <button
              type="button"
              ref={(element) => {
                if (element) triggers.current.set(item.id, element);
                else triggers.current.delete(item.id);
              }}
              aria-expanded={open}
              aria-controls={panelId}
              data-slot="expandable-cards-trigger"
              className={cn(
                "relative block h-full w-50 text-start",
                focusRing,
                "focus-visible:ring-inset",
              )}
              onClick={() => toggle(item.id)}
            >
              <img
                src={item.image}
                alt={item.imageAlt ?? ""}
                draggable={false}
                className="size-full object-cover"
              />
              <span aria-hidden="true" className={coverShade} />
              <span id={titleId} className={cn("absolute inset-x-0 top-0 p-6", coverTitle)}>
                {item.title}
              </span>
            </button>
            <div
              id={panelId}
              ref={(element) => {
                if (element) panels.current.set(item.id, element);
                else panels.current.delete(item.id);
              }}
              role="region"
              aria-labelledby={titleId}
              aria-hidden={open ? undefined : true}
              inert={!open}
              tabIndex={-1}
              data-slot="expandable-cards-detail"
              data-state={open ? "open" : "closed"}
              className={cn(
                "absolute inset-y-0 end-0 flex w-75 flex-col justify-between overflow-y-auto bg-background p-8 outline-none",
                "transition-[opacity,translate,filter] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                "data-[state=open]:delay-[var(--duration-fast)]",
                "data-[state=closed]:translate-x-5 data-[state=closed]:opacity-0 data-[state=closed]:blur-[5px] rtl:data-[state=closed]:-translate-x-5",
              )}
            >
              <div className="text-sm text-muted-foreground">{item.content}</div>
              {item.actions ? <div className="mt-4 flex gap-2">{item.actions}</div> : null}
              {item.author ? <Author author={item.author} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DialogCards({
  items,
  openId,
  uid,
  triggers,
  select,
  cardClassName,
}: PresentationProps) {
  const openItem = items.find((item) => item.id === openId);
  const layout = (part: string, id: string) => `${uid}-${part}-${id}`;

  return (
    <LayoutGroup id={uid}>
      <ul
        data-slot="expandable-cards-list"
        className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4"
      >
        {items.map((item) => (
          <li key={item.id} data-slot="expandable-cards-card" className="h-75">
            <motion.button
              type="button"
              layoutId={layout("card", item.id)}
              ref={(element: HTMLButtonElement | null) => {
                if (element) triggers.current.set(item.id, element);
                else triggers.current.delete(item.id);
              }}
              aria-haspopup="dialog"
              aria-expanded={openId === item.id}
              data-slot="expandable-cards-trigger"
              className={cn(
                "relative block size-full overflow-hidden rounded-2xl border border-border bg-background text-start shadow-lg",
                focusRing,
                cardClassName,
              )}
              style={{ borderRadius: 16 }}
              onClick={() => select(item.id)}
            >
              <motion.img
                layoutId={layout("image", item.id)}
                src={item.image}
                alt={item.imageAlt ?? ""}
                draggable={false}
                className="size-full object-cover"
              />
              <span aria-hidden="true" className={coverShade} />
              <motion.span
                layoutId={layout("title", item.id)}
                className={cn("absolute inset-x-0 top-0 p-6", coverTitle)}
              >
                {item.title}
              </motion.span>
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
                  data-slot="expandable-cards-overlay"
                  className="fixed inset-0 z-[var(--z-overlay)] bg-overlay"
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
                    triggers.current.get(openItem.id)?.focus();
                  }}
                >
                  <motion.div
                    layoutId={layout("card", openItem.id)}
                    data-slot="expandable-cards-detail"
                    className="pointer-events-auto relative flex max-h-full w-full max-w-xl flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-xl outline-none"
                    style={{ borderRadius: 16 }}
                  >
                    <div className="relative h-60 shrink-0">
                      <motion.img
                        layoutId={layout("image", openItem.id)}
                        src={openItem.image}
                        alt={openItem.imageAlt ?? ""}
                        draggable={false}
                        className="size-full object-cover"
                      />
                      <span aria-hidden="true" className={coverShade} />
                      <Dialog.Title asChild>
                        <motion.h2
                          layoutId={layout("title", openItem.id)}
                          className={cn("absolute inset-x-0 top-0 p-6", coverTitle)}
                        >
                          {openItem.title}
                        </motion.h2>
                      </Dialog.Title>
                    </div>
                    <motion.div
                      className="flex flex-col overflow-y-auto p-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    >
                      <Dialog.Description asChild>
                        <div className="text-sm text-muted-foreground">{openItem.content}</div>
                      </Dialog.Description>
                      {openItem.actions ? (
                        <div className="mt-4 flex gap-2">{openItem.actions}</div>
                      ) : null}
                      {openItem.author ? <Author author={openItem.author} /> : null}
                    </motion.div>
                    <Dialog.Close
                      aria-label="Close"
                      data-slot="expandable-cards-close"
                      className={cn(
                        "absolute end-3 top-3 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur-sm",
                        "transition-colors duration-[var(--duration-fast)] hover:bg-background",
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
  );
}
