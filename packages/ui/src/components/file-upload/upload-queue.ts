"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The upload queue.
 *
 * The dropzone is the most duplicated component in the React ecosystem and the
 * least valuable half: it is a styled rectangle over `<input type="file">`.
 * What almost nobody ships is this — progress, cancel, retry with backoff, and
 * a concurrency limit — so every team writes it again, usually twice, because
 * the first version has no cancel and no retry.
 *
 * Transport is injected. This never calls `fetch` or constructs a request,
 * because the request is the part that differs everywhere: presigned S3 PUT,
 * multipart POST, tus, an internal gateway with its own auth. `upload` receives
 * the file, a progress callback and an AbortSignal, and returns a promise. That
 * is the whole contract.
 *
 * Progress needs XHR, not fetch. `fetch` still cannot report upload progress in
 * any shipping browser — there is no readable stream for the request body — so
 * a transport that wants a real progress bar has to use XMLHttpRequest. That is
 * the consumer's choice to make, and `xhrUpload` below is a working example
 * rather than a dependency.
 */

export type UploadStatus = "queued" | "uploading" | "done" | "failed" | "cancelled";

export interface QueuedFile {
  /** Stable across retries, so React keys and announcements do not jump. */
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–1, or null when the transport cannot report it. */
  progress: number | null;
  /** Why it failed or was refused. Kept so it can be read and acted on. */
  error?: string;
  attempts: number;
}

export interface UploadContext {
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

export type UploadFn = (file: File, context: UploadContext) => Promise<void>;

export interface UploadQueueOptions {
  upload: UploadFn;
  /** Uploads running at once. More is not faster once the link is saturated. */
  concurrency?: number;
  /** Automatic retries per file before it is left failed. */
  maxAttempts?: number;
  /** Largest accepted file, in bytes. */
  maxSize?: number;
  /** Accepted types, as an `accept` attribute value: ".pdf,image/*". */
  accept?: string;
  /** Total files the queue will hold. */
  maxFiles?: number;
  onComplete?: (file: QueuedFile) => void;
}

/** Backoff between attempts. Bounded, because a person is waiting. */
function backoffMs(attempt: number): number {
  return Math.min(8000, 500 * 2 ** (attempt - 1));
}

/** Matches a file against an `accept` string the same way the browser does. */
export function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`;
  const units = ["kB", "MB", "GB", "TB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit] ?? "B"}`;
}

let sequence = 0;

export function useUploadQueue(options: UploadQueueOptions) {
  const {
    upload,
    concurrency = 3,
    maxAttempts = 3,
    maxSize,
    accept,
    maxFiles,
    onComplete,
  } = options;

  const [files, setFiles] = useState<QueuedFile[]>([]);

  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(new Set<string>());

  // The live option values, so an in-flight upload reads the current transport
  // without `run` being re-created — which would churn the scheduling effect
  // every time a consumer passes an inline `upload`. Written after commit
  // rather than during render, because a ref write during render is unsafe
  // under concurrent rendering; `run` only reads this once it is executing,
  // which is always after the effect has run.
  const latest = useRef({ upload, concurrency, maxAttempts, onComplete });
  useEffect(() => {
    latest.current = { upload, concurrency, maxAttempts, onComplete };
  });

  const patch = useCallback((id: string, changes: Partial<QueuedFile>) => {
    setFiles((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
    );
  }, []);

  const run = useCallback(
    async (entry: QueuedFile) => {
      const controller = new AbortController();
      controllers.current.set(entry.id, controller);

      const attempt = entry.attempts + 1;
      patch(entry.id, {
        status: "uploading",
        progress: 0,
        attempts: attempt,
        error: undefined,
      });

      try {
        await latest.current.upload(entry.file, {
          signal: controller.signal,
          onProgress: (fraction) => {
            patch(entry.id, { progress: Math.min(1, Math.max(0, fraction)) });
          },
        });

        patch(entry.id, { status: "done", progress: 1 });
        latest.current.onComplete?.({ ...entry, status: "done", progress: 1 });
      } catch (error) {
        if (controller.signal.aborted) {
          patch(entry.id, { status: "cancelled", progress: null });
        } else if (attempt < latest.current.maxAttempts) {
          // Back off, then requeue. Releasing the slot only after the delay is
          // what makes the wait real rather than a busy retry, and the file
          // re-enters the queue like any other so retries obey concurrency too.
          setTimeout(() => {
            running.current.delete(entry.id);
            controllers.current.delete(entry.id);
            patch(entry.id, { status: "queued", progress: null });
          }, backoffMs(attempt));
          return;
        } else {
          patch(entry.id, {
            status: "failed",
            progress: null,
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }

      controllers.current.delete(entry.id);
      running.current.delete(entry.id);
      // No explicit pump: the scheduling effect below reacts to the state
      // change and starts whatever can start next.
      setFiles((current) => [...current]);
    },
    [patch],
  );

  // Starts whatever can start, once the state that made it startable has been
  // committed. Doing this inside a setState updater — the obvious shortcut —
  // means React may run it twice and upload the same file twice; the `running`
  // set guards that, but the effect is the honest place for it.
  useEffect(() => {
    const free = concurrency - running.current.size;
    if (free <= 0) return;

    const next = files
      .filter((entry) => entry.status === "queued" && !running.current.has(entry.id))
      .slice(0, free);

    for (const entry of next) {
      running.current.add(entry.id);
      void run(entry);
    }
  }, [files, concurrency, run]);

  /** Validates and enqueues. A rejected file is kept and told why. */
  const add = useCallback(
    (incoming: File[]) => {
      setFiles((current) => {
        const room = maxFiles === undefined ? incoming.length : maxFiles - current.length;
        const admitted: QueuedFile[] = [];

        for (const file of incoming.slice(0, Math.max(0, room))) {
          sequence += 1;
          const id = `upload-${String(sequence)}`;

          // A rejected file becomes a failed entry rather than disappearing.
          // Silently dropping a file the reader chose is how these components
          // lose work without anybody noticing.
          if (maxSize !== undefined && file.size > maxSize) {
            admitted.push({
              id,
              file,
              status: "failed",
              progress: null,
              attempts: 0,
              error: `Larger than ${formatBytes(maxSize)}`,
            });
            continue;
          }
          if (!matchesAccept(file, accept)) {
            admitted.push({
              id,
              file,
              status: "failed",
              progress: null,
              attempts: 0,
              error: "Type not accepted",
            });
            continue;
          }

          admitted.push({ id, file, status: "queued", progress: null, attempts: 0 });
        }

        return [...current, ...admitted];
      });
    },
    [accept, maxFiles, maxSize],
  );

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const retry = useCallback((id: string) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, status: "queued" as const, error: undefined, attempts: 0 }
          : entry,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    running.current.delete(id);
    setFiles((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((current) => current.filter((entry) => entry.status !== "done"));
  }, []);

  const stats = useMemo(() => {
    const by = (status: UploadStatus) =>
      files.filter((entry) => entry.status === status).length;
    return {
      total: files.length,
      queued: by("queued"),
      uploading: by("uploading"),
      done: by("done"),
      failed: by("failed"),
      cancelled: by("cancelled"),
      active: by("queued") + by("uploading"),
    };
  }, [files]);

  return { files, stats, add, cancel, retry, remove, clearCompleted };
}

/**
 * A working XHR transport, as an example rather than a dependency.
 *
 * XMLHttpRequest and not fetch, because fetch still cannot report upload
 * progress: there is no readable stream for a request body in any shipping
 * browser. Copy this and change the request to match your backend.
 */
export function xhrUpload(
  url: string,
  init: { method?: string; headers?: Record<string, string> } = {},
): UploadFn {
  return (file, { onProgress, signal }) =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(init.method ?? "POST", url);

      for (const [header, value] of Object.entries(init.headers ?? {})) {
        request.setRequestHeader(header, value);
      }

      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      });

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${String(request.status)}`));
      });
      request.addEventListener("error", () => {
        reject(new Error("Network error"));
      });
      request.addEventListener("abort", () => {
        reject(new Error("Cancelled"));
      });

      signal.addEventListener("abort", () => {
        request.abort();
      });

      const body = new FormData();
      body.append("file", file);
      request.send(body);
    });
}
