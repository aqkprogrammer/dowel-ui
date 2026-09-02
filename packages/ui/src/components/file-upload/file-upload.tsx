"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type DragEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { formatBytes, type QueuedFile, type UploadStatus } from "./upload-queue";

/**
 * The visible half of uploading. The queue is in `upload-queue.ts` and is the
 * part worth owning.
 *
 * There is no dropzone pattern in the WAI-ARIA APG, and inventing one is the
 * usual failure: a `div` with `role="button"`, a keydown handler, and a file
 * picker that keyboard users can never reach. So the control here is a real
 * `<input type="file">` with a real `<label>`. That is already operable by
 * keyboard, already announces itself, already opens the picker on Enter and
 * Space, and needs nothing added. Drag and drop is layered on top as a pointer
 * convenience, and every drop can also be done from the input.
 */

const STATUS_LABEL: Record<UploadStatus, string> = {
  queued: "Waiting",
  uploading: "Uploading",
  done: "Uploaded",
  failed: "Failed",
  cancelled: "Cancelled",
};

export interface FileUploadProps extends Omit<ComponentPropsWithRef<"div">, "onDrop"> {
  /** Names the control. */
  label: string;
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Shown under the prompt: accepted types, size limit. */
  hint?: ReactNode;
  children?: ReactNode;
}

export function FileUpload({
  className,
  label,
  onFiles,
  accept,
  multiple = true,
  disabled = false,
  hint,
  children,
  ...props
}: FileUploadProps) {
  const inputId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;

    const dropped = [...event.dataTransfer.files];
    if (dropped.length > 0) onFiles(multiple ? dropped : dropped.slice(0, 1));
  }

  return (
    <div data-slot="file-upload" className={cn("flex flex-col gap-3", className)} {...props}>
      {/* dragenter/dragleave fire for every child element, so a plain boolean
          flickers as the pointer crosses the prompt text. Counting depth is
          what makes the highlight steady. */}
      <div
        data-slot="file-upload-dropzone"
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => {
          depth.current -= 1;
          if (depth.current <= 0) setDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border border-dashed border-border-strong bg-muted/30 px-4 py-6 text-center",
          "transition-colors duration-[var(--duration-fast)]",
          dragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-55",
        )}
      >
        {/* The label is the control. Clicking it opens the picker, Enter and
            Space activate it, and assistive technology already describes it. */}
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex cursor-pointer flex-col items-center gap-1 rounded-md px-2 py-1 text-sm",
            "focus-within:ring-2 focus-within:ring-ring/55",
          )}
        >
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            Drop {multiple ? "files" : "a file"} here, or choose from your device
          </span>
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            aria-describedby={hint ? hintId : undefined}
            onChange={(event) => {
              const chosen = [...(event.target.files ?? [])];
              if (chosen.length > 0) onFiles(chosen);
              // Reset, so choosing the same file twice fires change twice.
              event.target.value = "";
            }}
            className="sr-only"
          />
        </label>

        {hint ? (
          <p id={hintId} className="mt-2 text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export interface FileUploadListProps extends ComponentPropsWithRef<"ul"> {
  files: QueuedFile[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function FileUploadList({
  className,
  files,
  onCancel,
  onRetry,
  onRemove,
  ...props
}: FileUploadListProps) {
  if (files.length === 0) return null;

  return (
    <ul
      data-slot="file-upload-list"
      className={cn("flex list-none flex-col gap-2", className)}
      {...props}
    >
      {files.map((entry) => (
        <FileUploadItem
          key={entry.id}
          entry={entry}
          onCancel={onCancel}
          onRetry={onRetry}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}

export interface FileUploadItemProps extends Omit<ComponentPropsWithRef<"li">, "children"> {
  entry: QueuedFile;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function FileUploadItem({
  className,
  entry,
  onCancel,
  onRetry,
  onRemove,
  ...props
}: FileUploadItemProps) {
  const { id, file, status, progress, error } = entry;
  const percent = progress === null ? null : Math.round(progress * 100);

  return (
    <li
      data-slot="file-upload-item"
      data-status={status}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        status === "failed"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {formatBytes(file.size)}
          </span>
        </div>

        {/* Status in words, always. A bar at 60% with a red tint does not say
            whether it is uploading, stalled or failed. */}
        <p
          className={cn(
            "text-xs",
            status === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {STATUS_LABEL[status]}
          {status === "uploading" && percent !== null ? ` · ${String(percent)}%` : null}
          {error ? ` · ${error}` : null}
        </p>

        {status === "uploading" ? (
          <div
            role="progressbar"
            aria-label={`Uploading ${file.name}`}
            aria-valuenow={percent ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              data-slot="file-upload-progress"
              className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
              style={{ width: `${String(percent ?? 0)}%` }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status === "uploading" && onCancel ? (
          <ItemButton onClick={() => onCancel(id)}>Cancel</ItemButton>
        ) : null}
        {(status === "failed" || status === "cancelled") && onRetry ? (
          <ItemButton onClick={() => onRetry(id)}>Retry</ItemButton>
        ) : null}
        {onRemove ? (
          <ItemButton onClick={() => onRemove(id)} aria-label={`Remove ${file.name}`}>
            Remove
          </ItemButton>
        ) : null}
      </div>
    </li>
  );
}

function ItemButton({ className, ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    />
  );
}

/**
 * One sentence covering the whole queue, announced politely.
 *
 * Per-file live regions would talk over each other the moment two uploads run
 * at once; one summary of the set is readable where six competing ones are not.
 */
export function FileUploadStatus({
  className,
  stats,
  ...props
}: ComponentPropsWithRef<"p"> & {
  stats: { total: number; active: number; done: number; failed: number };
}) {
  const { total, active, done, failed } = stats;

  // Progress through the set, not a count of what happens to be in flight.
  // "3 of 5 uploading" is wrong the moment a concurrency limit holds two back,
  // and it never tells the reader how much of the job is left.
  const message =
    total === 0
      ? ""
      : active > 0
        ? `${String(done)} of ${String(total)} uploaded`
        : failed > 0
          ? `${String(done)} uploaded, ${String(failed)} failed`
          : `${String(done)} uploaded`;

  return (
    <p
      data-slot="file-upload-status"
      aria-live="polite"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {message}
    </p>
  );
}
