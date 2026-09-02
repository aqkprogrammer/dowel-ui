"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * What an agent actually did, and what can be undone.
 *
 * Every AI component library stops at the conversation boundary: approve a tool
 * call before it runs, then treat whatever it did to the database as the
 * application's problem. But the thing that blocks agents from getting write
 * access in real products is not "did I approve this", it is "it did the wrong
 * thing, now what".
 *
 * The load-bearing idea is that undo is not uniform. Deleting a row can be
 * reverted. A refund can be compensated by another transaction, which is not
 * the same as never having happened. A sent email cannot be taken back at all.
 * Presenting all three behind one "Undo" button is a lie the user only
 * discovers after clicking, so reversibility is a required field and the
 * affordance follows from it.
 *
 * This renders and selects. It performs nothing — `onRevert` receives the
 * chosen actions and the application decides what that means.
 */

export type Reversibility = "revertible" | "compensable" | "irreversible";

export type ActionStatus = "applied" | "reverting" | "reverted" | "failed";

export interface LedgerAction {
  id: string;
  /** What was done, in the user's language: "Deleted 3 contacts". */
  summary: string;
  reversibility: Reversibility;
  status: ActionStatus;
  /** What the action touched, for grouping and scanning. */
  target?: string;
  timestamp?: string;
  /** Why a revert failed. Shown only when status is "failed". */
  error?: string;
}

const REVERSIBILITY_LABEL: Record<Reversibility, string> = {
  revertible: "Can be undone",
  compensable: "Can be offset, not undone",
  irreversible: "Cannot be undone",
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  applied: "Applied",
  reverting: "Reverting",
  reverted: "Reverted",
  failed: "Revert failed",
};

/** Only an applied action can be selected — the rest are already resolved. */
function isSelectable(action: LedgerAction): boolean {
  return action.status === "applied" && action.reversibility !== "irreversible";
}

const ledgerEntryVariants = cva("rounded-lg border text-sm transition-colors", {
  variants: {
    status: {
      applied: "border-border bg-card",
      reverting: "border-info/30 bg-info/5",
      reverted: "border-border bg-muted/40",
      failed: "border-destructive/40 bg-destructive/5",
    },
  },
  defaultVariants: { status: "applied" },
});

interface LedgerContextValue {
  actions: LedgerAction[];
  selected: Set<string>;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  selectableIds: string[];
  onRevert?: (actions: LedgerAction[]) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

function useLedgerContext(component: string): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <ActionLedger>.`);
  }
  return context;
}

export interface ActionLedgerProps extends Omit<ComponentPropsWithRef<"div">, "onSelect"> {
  actions: LedgerAction[];
  /** Receives the selected actions. The application performs the revert. */
  onRevert?: (actions: LedgerAction[]) => void;
  children?: ReactNode;
}

export function ActionLedger({
  className,
  actions,
  onRevert,
  children,
  ...props
}: ActionLedgerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectableIds = useMemo(
    () => actions.filter(isSelectable).map((action) => action.id),
    [actions],
  );

  const context = useMemo<LedgerContextValue>(
    () => ({
      actions,
      selected,
      selectableIds,
      onRevert,
      toggle: (id: string) => {
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      selectAll: () => {
        setSelected(new Set(selectableIds));
      },
      clear: () => {
        setSelected(new Set());
      },
    }),
    [actions, selected, selectableIds, onRevert],
  );

  return (
    <LedgerContext.Provider value={context}>
      <div
        data-slot="action-ledger"
        className={cn("flex flex-col gap-3", className)}
        {...props}
      >
        {children}
      </div>
    </LedgerContext.Provider>
  );
}

/**
 * Selection controls and the revert action.
 *
 * The count is stated on the button rather than beside it, so the accessible
 * name says what pressing it will do.
 */
export function ActionLedgerToolbar({ className, ...props }: ComponentPropsWithRef<"div">) {
  const { selected, selectableIds, actions, selectAll, clear, onRevert } =
    useLedgerContext("ActionLedgerToolbar");

  const count = selected.size;
  const allSelected = selectableIds.length > 0 && count === selectableIds.length;

  return (
    <div
      data-slot="action-ledger-toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      <button
        type="button"
        disabled={selectableIds.length === 0}
        onClick={allSelected ? clear : selectAll}
        className={cn(
          "rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium",
          "transition-colors hover:bg-accent hover:text-accent-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          focusRing,
        )}
      >
        {allSelected
          ? "Clear selection"
          : `Select all ${String(selectableIds.length)} undoable`}
      </button>

      <button
        type="button"
        data-slot="action-ledger-revert"
        disabled={count === 0}
        onClick={() => {
          onRevert?.(actions.filter((action) => selected.has(action.id)));
        }}
        className={cn(
          "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground",
          "transition-colors hover:bg-primary-hover",
          "disabled:pointer-events-none disabled:opacity-50",
          focusRing,
        )}
      >
        {count === 0 ? "Undo selected" : `Undo ${String(count)} selected`}
      </button>
    </div>
  );
}

export interface ActionLedgerEntryProps
  extends
    Omit<ComponentPropsWithRef<"li">, "children">,
    VariantProps<typeof ledgerEntryVariants> {
  action: LedgerAction;
  /** The payload inspector. Collapsed, because it is provenance not content. */
  children?: ReactNode;
}

export function ActionLedgerEntry({
  className,
  action,
  children,
  ...props
}: ActionLedgerEntryProps) {
  const { selected, toggle } = useLedgerContext("ActionLedgerEntry");
  const checkboxId = useId();
  const selectable = isSelectable(action);
  const isSelected = selected.has(action.id);

  return (
    <li
      data-slot="action-ledger-entry"
      data-status={action.status}
      data-reversibility={action.reversibility}
      className={cn(ledgerEntryVariants({ status: action.status }), className)}
      {...props}
    >
      <div className="flex items-start gap-3 p-3">
        {/* A native checkbox: this is a list of things to act on, and the
            selection has to survive without JavaScript-driven roles. */}
        <input
          type="checkbox"
          id={checkboxId}
          disabled={!selectable}
          checked={isSelected}
          onChange={() => {
            toggle(action.id);
          }}
          className={cn(
            "mt-0.5 size-4 shrink-0 rounded border-input",
            "disabled:cursor-not-allowed disabled:opacity-40",
            focusRing,
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor={checkboxId}
            className={cn("font-medium", !selectable && "opacity-70")}
          >
            {action.summary}
          </label>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {/* Reversibility in words, always. It decides whether the undo
                button means anything, so it cannot be a colour or an icon. */}
            <span data-slot="action-ledger-reversibility">
              {REVERSIBILITY_LABEL[action.reversibility]}
            </span>
            <span aria-hidden="true">·</span>
            <span data-slot="action-ledger-status">{STATUS_LABEL[action.status]}</span>
            {action.target ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{action.target}</span>
              </>
            ) : null}
            {action.timestamp ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={action.timestamp}>{action.timestamp}</time>
              </>
            ) : null}
          </p>

          {/* A failed revert is the state people most need to understand, so
              the reason is shown rather than hidden behind the inspector. */}
          {action.status === "failed" && action.error ? (
            <p data-slot="action-ledger-error" className="text-xs text-destructive">
              {action.error}
            </p>
          ) : null}

          {children}
        </div>
      </div>
    </li>
  );
}

/** The list wrapper. A real list, so its length is announced. */
export function ActionLedgerList({ className, ...props }: ComponentPropsWithRef<"ul">) {
  return (
    <ul
      data-slot="action-ledger-list"
      className={cn("flex list-none flex-col gap-2", className)}
      {...props}
    />
  );
}

/** Collapsed payload for one entry: the arguments, the result, the diff. */
export function ActionLedgerPayload({
  className,
  label = "Details",
  children,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Root> & { label?: string }) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="action-ledger-payload"
      className={cn("mt-1", className)}
      {...props}
    >
      <CollapsiblePrimitive.Trigger
        className={cn(
          "rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground",
          focusRing,
        )}
      >
        {label}
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="pt-2">{children}</CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

/**
 * A summary of what is selected and what it will and will not undo.
 *
 * This exists because "Undo 4 selected" is not enough information when one of
 * the four can only be compensated. Saying so before the click is the whole
 * difference between an honest control and a misleading one.
 */
export function ActionLedgerSelectionSummary({
  className,
  ...props
}: ComponentPropsWithRef<"p">) {
  const { actions, selected } = useLedgerContext("ActionLedgerSelectionSummary");

  const chosen = actions.filter((action) => selected.has(action.id));
  const compensable = chosen.filter((a) => a.reversibility === "compensable").length;

  if (chosen.length === 0) return null;

  return (
    <p
      data-slot="action-ledger-selection-summary"
      // Selection changes are user-driven and the wording matters, so it is
      // announced politely rather than silently updating under the button.
      aria-live="polite"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {`${String(chosen.length)} selected`}
      {compensable > 0
        ? `, of which ${String(compensable)} can only be offset by a further action, not undone`
        : ""}
    </p>
  );
}

export { ledgerEntryVariants };
