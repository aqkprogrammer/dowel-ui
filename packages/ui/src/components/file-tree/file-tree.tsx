"use client";

// Original design (pattern inspired by Animate UI Files; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  stagger,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A file explorer: folders that open, files that select, a highlight that
 * follows you.
 *
 * It is the WAI-ARIA tree pattern, with nested markup — each treeitem owns a
 * role="group" of its children — so aria-level, aria-posinset and
 * aria-setsize are stated rather than left for a screen reader to infer. One
 * item is in the tab sequence at a time (roving tabindex): the arrows move
 * between visible items, Right opens a folder or steps into it, Left closes it
 * or steps out to its parent, Home and End jump to the ends, Enter and Space
 * select (and toggle a folder), `*` opens every sibling folder, and typing a
 * letter jumps to the next item whose name starts with it.
 *
 * Motion, in the order you notice it:
 *
 * - The selection highlight is one element that travels between rows — a
 *   shared-layout animation (`layoutId`), the reason this uses `motion`.
 * - A folder's front panel tilts open on its hinge while the chevron turns:
 *   CSS transitions keyed on `data-state`, so reduced motion snaps them.
 * - Its children unfold: the branch springs from no height to its own, each
 *   child drops in with a short blur, staggered, and a guide rail draws down
 *   the indent beside them. Closing reverses it, faster.
 *
 * Nothing moves on first paint: folders that start open are simply open.
 * Under reduced motion every spring and stagger resolves instantly.
 *
 * Status is a coloured dot *and* a letter (A, M, D), and the item's name
 * includes it ("button.tsx, modified"), so colour is never the only signal; a
 * deleted file is also struck through.
 */

export type FileTreeStatus = "added" | "modified" | "deleted";

export interface FileTreeNode {
  /** Unique across the whole tree. */
  id: string;
  name: string;
  /** Present — even empty — makes the node a folder. */
  children?: FileTreeNode[];
  /** Replaces the default folder or file glyph. Decorative. */
  icon?: ReactNode;
  /** A version-control status, shown as a coloured letter and included in the name. */
  status?: FileTreeStatus;
}

const fileTreeVariants = cva(
  "relative flex w-full flex-col text-foreground select-none [--file-tree-indent:1rem]",
  {
    variants: {
      /** Row height and type size. */
      size: {
        sm: "text-xs [--file-tree-row:1.75rem]",
        md: "text-sm [--file-tree-row:2rem]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const STATUS: Record<FileTreeStatus, { letter: string; tone: string }> = {
  added: { letter: "A", tone: "text-success" },
  modified: { letter: "M", tone: "text-warning" },
  deleted: { letter: "D", tone: "text-destructive" },
};

const DEFAULT_STATUS_LABELS: Record<FileTreeStatus, string> = {
  added: "added",
  modified: "modified",
  deleted: "deleted",
};

const SPRING: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 };
const INSTANT: Transition = { duration: 0 };

function branchVariants(reduce: boolean): Variants {
  return {
    closed: {
      height: 0,
      opacity: 0,
      transition: reduce
        ? INSTANT
        : {
            height: { type: "spring", bounce: 0, duration: 0.28 },
            opacity: { duration: 0.16 },
          },
    },
    open: {
      height: "auto",
      opacity: 1,
      transition: reduce
        ? INSTANT
        : {
            height: { type: "spring", bounce: 0.12, duration: 0.42 },
            opacity: { duration: 0.2 },
            delayChildren: stagger(0.035, { startDelay: 0.04 }),
          },
    },
  };
}

function itemVariants(reduce: boolean): Variants {
  return {
    closed: { opacity: 0, y: -6, filter: "blur(3px)", transition: INSTANT },
    open: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: reduce ? INSTANT : { type: "spring", stiffness: 420, damping: 30 },
    },
  };
}

function guideVariants(reduce: boolean): Variants {
  return {
    closed: { scaleY: 0, transition: reduce ? INSTANT : { duration: 0.12 } },
    open: {
      scaleY: 1,
      transition: reduce ? INSTANT : { type: "spring", bounce: 0, duration: 0.5, delay: 0.06 },
    },
  };
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="file-tree-chevron"
      className={cn(
        "size-3.5 shrink-0 text-muted-foreground",
        "transition-[rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
        // Mirrored in RTL, the glyph points left; turning it the other way
        // still brings it to rest pointing down.
        mirrorForDirection,
        "group-data-[state=open]/row:rotate-90 rtl:group-data-[state=open]/row:-rotate-90",
      )}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function FolderGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="file-tree-folder"
      className={cn(
        "text-muted-foreground transition-colors duration-[var(--duration-fast)]",
        "group-data-[state=open]/row:text-primary",
      )}
    >
      <path
        fillOpacity="0.14"
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      />
      {/* The front panel. It tilts back on its bottom edge when the folder opens. */}
      <path
        data-slot="file-tree-folder-lid"
        fillOpacity="0.3"
        d="M3 10.5h18V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        className={cn(
          "origin-bottom [transform-box:fill-box]",
          "transition-transform duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
          "group-data-[state=open]/row:[transform:skewX(-22deg)_scaleY(0.82)]",
          "rtl:group-data-[state=open]/row:[transform:skewX(22deg)_scaleY(0.82)]",
        )}
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="file-tree-file"
      className="text-muted-foreground"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

interface Entry {
  node: FileTreeNode;
  parentId: string | null;
  level: number;
}

/** Every node by id, with its parent, for keyboard navigation. */
function indexTree(items: FileTreeNode[]): Map<string, Entry> {
  const index = new Map<string, Entry>();
  const walk = (nodes: FileTreeNode[], parentId: string | null, level: number) => {
    for (const node of nodes) {
      index.set(node.id, { node, parentId, level });
      if (node.children) walk(node.children, node.id, level + 1);
    }
  };
  walk(items, null, 1);
  return index;
}

/** The ids a reader can currently see, top to bottom. */
function visibleIds(items: FileTreeNode[], expanded: ReadonlySet<string>): string[] {
  const ids: string[] = [];
  const walk = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children && expanded.has(node.id)) walk(node.children);
    }
  };
  walk(items);
  return ids;
}

interface TreeContext {
  uid: string;
  expanded: ReadonlySet<string>;
  selected: string | null;
  tabbable: string | null;
  guides: boolean;
  reduce: boolean;
  statusLabels: Record<FileTreeStatus, string>;
  register: (id: string, element: HTMLLIElement | null) => void;
  onFocusItem: (id: string) => void;
}

function FileTreeItem({
  node,
  level,
  posinset,
  setsize,
  tree,
}: {
  node: FileTreeNode;
  level: number;
  posinset: number;
  setsize: number;
  tree: TreeContext;
}) {
  const folder = node.children !== undefined;
  const open = folder && tree.expanded.has(node.id);
  const selected = tree.selected === node.id;
  const status = node.status;
  const name = status ? `${node.name}, ${tree.statusLabels[status]}` : node.name;
  const state = folder ? (open ? "open" : "closed") : undefined;

  return (
    <motion.li
      ref={(element: HTMLLIElement | null) => {
        tree.register(node.id, element);
      }}
      role="treeitem"
      aria-level={level}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-expanded={folder ? open : undefined}
      aria-selected={selected}
      aria-label={name}
      tabIndex={tree.tabbable === node.id ? 0 : -1}
      data-slot="file-tree-item"
      data-id={node.id}
      data-state={state}
      variants={itemVariants(tree.reduce)}
      onFocus={(event) => {
        if (event.target === event.currentTarget) tree.onFocusItem(node.id);
      }}
      // The ring is drawn on this item's own row, not around its subtree.
      className={cn(
        "outline-none",
        "[&:focus-visible>[data-slot=file-tree-row]]:ring-2 [&:focus-visible>[data-slot=file-tree-row]]:ring-ring/55",
      )}
    >
      <div
        data-slot="file-tree-row"
        data-state={state}
        data-selected={selected ? "" : undefined}
        className={cn(
          "group/row relative flex h-[var(--file-tree-row)] cursor-pointer items-center gap-1.5 rounded-md pe-2",
          "ps-[calc((var(--file-tree-level)-1)*var(--file-tree-indent)+0.375rem)]",
          "transition-colors duration-[var(--duration-fast)] hover:bg-muted/70",
          "data-[selected]:text-accent-foreground",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&>[data-slot=file-tree-icon]_svg:not([class*='size-'])]:size-4",
        )}
        style={{ "--file-tree-level": level } as CSSProperties}
      >
        {selected ? (
          <motion.span
            layoutId={`${tree.uid}-selection`}
            aria-hidden="true"
            data-slot="file-tree-selection"
            className="pointer-events-none absolute inset-0 rounded-md bg-accent ring-1 ring-border/60"
            transition={tree.reduce ? INSTANT : SPRING}
          />
        ) : null}
        <span aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center">
          {folder ? <Chevron /> : null}
        </span>
        <span
          aria-hidden="true"
          data-slot="file-tree-icon"
          className="relative grid place-items-center"
        >
          {node.icon ?? (folder ? <FolderGlyph /> : <FileGlyph />)}
        </span>
        <span
          className={cn(
            "relative min-w-0 flex-1 truncate",
            status === "deleted" && "text-muted-foreground line-through",
          )}
        >
          {node.name}
        </span>
        {status ? (
          <span
            aria-hidden="true"
            data-slot="file-tree-status"
            data-status={status}
            className={cn(
              "relative inline-flex items-center gap-1 font-mono text-2xs font-semibold",
              STATUS[status].tone,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {STATUS[status].letter}
          </span>
        ) : null}
      </div>
      {node.children ? (
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="branch"
              data-slot="file-tree-branch"
              initial="closed"
              animate="open"
              exit="closed"
              variants={branchVariants(tree.reduce)}
              className="relative overflow-hidden"
            >
              {tree.guides ? (
                <motion.span
                  aria-hidden="true"
                  data-slot="file-tree-guide"
                  variants={guideVariants(tree.reduce)}
                  className={cn(
                    "pointer-events-none absolute inset-y-1 w-px origin-top bg-border",
                    "start-[calc((var(--file-tree-level)-1)*var(--file-tree-indent)+0.875rem)]",
                  )}
                  style={{ "--file-tree-level": level } as CSSProperties}
                />
              ) : null}
              <ul role="group" className="flex flex-col">
                {node.children.map((child, index, siblings) => (
                  <FileTreeItem
                    key={child.id}
                    node={child}
                    level={level + 1}
                    posinset={index + 1}
                    setsize={siblings.length}
                    tree={tree}
                  />
                ))}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </motion.li>
  );
}

export interface FileTreeProps
  extends
    Omit<ComponentPropsWithRef<"ul">, "children" | "defaultValue">,
    VariantProps<typeof fileTreeVariants> {
  items: FileTreeNode[];
  /** Ids of open folders (controlled). */
  expanded?: string[];
  /** Ids of folders open at first render (uncontrolled). */
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** The selected node's id, or null (controlled). */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string, node: FileTreeNode) => void;
  /** Vertical rails down each open folder's indent. On by default. */
  guides?: boolean;
  /** Words appended to a node's name for its status: "button.tsx, modified". */
  statusLabels?: Partial<Record<FileTreeStatus, string>>;
}

/** A file explorer tree with folders that tilt open and a selection that glides between rows. */
export function FileTree({
  className,
  size,
  items,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  guides = true,
  statusLabels,
  onKeyDown,
  onClick,
  ...props
}: FileTreeProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelected);
  const [focused, setFocused] = useState<string | null>(null);
  const elements = useRef(new Map<string, HTMLLIElement>());

  const expandedList = expandedProp ?? uncontrolledExpanded;
  const expanded = useMemo(() => new Set(expandedList), [expandedList]);
  const selected = selectedProp === undefined ? uncontrolledSelected : selectedProp;
  const index = useMemo(() => indexTree(items), [items]);
  const visible = useMemo(() => visibleIds(items, expanded), [items, expanded]);

  // The one item in the tab sequence: the last one focused while it is still
  // visible, else the selection when visible, else the first.
  const tabbable =
    (focused !== null && visible.includes(focused) ? focused : null) ??
    (selected !== null && visible.includes(selected) ? selected : null) ??
    visible[0] ??
    null;

  function setExpanded(next: string[]) {
    if (expandedProp === undefined) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  }

  function setOpen(id: string, open: boolean) {
    if (expanded.has(id) === open) return;
    setExpanded(open ? [...expandedList, id] : expandedList.filter((other) => other !== id));
  }

  function select(id: string) {
    const entry = index.get(id);
    if (!entry) return;
    if (selectedProp === undefined) setUncontrolledSelected(id);
    onSelectedChange?.(id, entry.node);
  }

  function activate(id: string) {
    select(id);
    const node = index.get(id)?.node;
    if (node?.children) setOpen(id, !expanded.has(id));
  }

  function focusItem(id: string | undefined) {
    if (id === undefined) return;
    setFocused(id);
    elements.current.get(id)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const id = (event.target as Element).closest("[role=treeitem]")?.getAttribute("data-id");
    const entry = id ? index.get(id) : undefined;
    if (!id || !entry) return;
    const position = visible.indexOf(id);
    const folder = entry.node.children !== undefined;
    const open = folder && expanded.has(id);
    let handled = true;

    switch (event.key) {
      case "ArrowDown":
        focusItem(visible[position + 1]);
        break;
      case "ArrowUp":
        focusItem(visible[position - 1]);
        break;
      case "Home":
        focusItem(visible[0]);
        break;
      case "End":
        focusItem(visible[visible.length - 1]);
        break;
      case "ArrowRight":
        if (folder && !open) setOpen(id, true);
        else if (open) focusItem(entry.node.children?.[0]?.id);
        break;
      case "ArrowLeft":
        if (open) setOpen(id, false);
        else focusItem(entry.parentId ?? undefined);
        break;
      case "Enter":
      case " ":
        activate(id);
        break;
      case "*": {
        const siblings =
          entry.parentId === null ? items : (index.get(entry.parentId)?.node.children ?? []);
        const closed = siblings
          .filter((sibling) => sibling.children !== undefined && !expanded.has(sibling.id))
          .map((sibling) => sibling.id);
        if (closed.length > 0) setExpanded([...expandedList, ...closed]);
        break;
      }
      default: {
        const key = event.key;
        if (
          key.length !== 1 ||
          !/\S/.test(key) ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          handled = false;
          break;
        }
        // Type-ahead: the next visible item starting with the letter, wrapping.
        const wanted = key.toLocaleLowerCase();
        for (let step = 1; step <= visible.length; step += 1) {
          const candidate = visible[(position + step) % visible.length];
          const name = candidate === undefined ? undefined : index.get(candidate)?.node.name;
          if (name?.toLocaleLowerCase().startsWith(wanted)) {
            focusItem(candidate);
            break;
          }
        }
      }
    }
    if (handled) event.preventDefault();
  }

  function handleClick(event: MouseEvent<HTMLUListElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const row = (event.target as Element).closest("[data-slot=file-tree-row]");
    const id = row?.parentElement?.getAttribute("data-id");
    if (!id) return;
    setFocused(id);
    activate(id);
  }

  const tree: TreeContext = {
    uid,
    expanded,
    selected,
    tabbable,
    guides,
    reduce,
    statusLabels: { ...DEFAULT_STATUS_LABELS, ...statusLabels },
    register: (id, element) => {
      if (element) elements.current.set(id, element);
      else elements.current.delete(id);
    },
    onFocusItem: setFocused,
  };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={uid}>
        <ul
          role="tree"
          data-slot="file-tree"
          className={cn(fileTreeVariants({ size }), className)}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          {...props}
        >
          {items.map((node, position, siblings) => (
            <FileTreeItem
              key={node.id}
              node={node}
              level={1}
              posinset={position + 1}
              setsize={siblings.length}
              tree={tree}
            />
          ))}
        </ul>
      </LayoutGroup>
    </MotionConfig>
  );
}

export { fileTreeVariants };
