import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FileUpload, FileUploadList, FileUploadStatus } from "./file-upload";
import {
  formatBytes,
  matchesAccept,
  useUploadQueue,
  type QueuedFile,
  type UploadFn,
} from "./upload-queue";

function makeFile(name: string, size = 100, type = "text/plain"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/** A transport whose resolution the test controls. */
function deferredUpload() {
  const calls: {
    file: File;
    resolve: () => void;
    reject: (error: Error) => void;
    progress: (fraction: number) => void;
    signal: AbortSignal;
  }[] = [];

  const upload: UploadFn = (file, { onProgress, signal }) =>
    new Promise<void>((resolve, reject) => {
      calls.push({ file, resolve, reject, progress: onProgress, signal });
      signal.addEventListener("abort", () => {
        reject(new Error("Cancelled"));
      });
    });

  return { upload, calls };
}

describe("formatBytes", () => {
  it("reads in units people use", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1500)).toBe("1.5 kB");
    expect(formatBytes(2_400_000)).toBe("2.4 MB");
  });
});

describe("matchesAccept", () => {
  it("accepts everything when no filter is given", () => {
    expect(matchesAccept(makeFile("a.txt"), undefined)).toBe(true);
  });

  it("matches an extension", () => {
    expect(matchesAccept(makeFile("report.pdf", 1, "application/pdf"), ".pdf")).toBe(true);
    expect(matchesAccept(makeFile("report.txt", 1, "text/plain"), ".pdf")).toBe(false);
  });

  it("matches a wildcard type", () => {
    expect(matchesAccept(makeFile("a.png", 1, "image/png"), "image/*")).toBe(true);
    expect(matchesAccept(makeFile("a.txt", 1, "text/plain"), "image/*")).toBe(false);
  });

  it("matches an exact type, and any one of several patterns", () => {
    expect(matchesAccept(makeFile("a.pdf", 1, "application/pdf"), "application/pdf")).toBe(
      true,
    );
    expect(matchesAccept(makeFile("a.png", 1, "image/png"), ".pdf,image/*")).toBe(true);
  });
});

describe("useUploadQueue", () => {
  it("uploads a queued file and reports it done", async () => {
    const { upload, calls } = deferredUpload();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => {
      result.current.add([makeFile("a.txt")]);
    });
    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    act(() => {
      calls[0]?.resolve();
    });
    await waitFor(() => {
      expect(result.current.files[0]?.status).toBe("done");
    });
    expect(result.current.files[0]?.progress).toBe(1);
  });

  it("reports progress from the transport", async () => {
    const { upload, calls } = deferredUpload();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => {
      result.current.add([makeFile("a.txt")]);
    });
    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    act(() => {
      calls[0]?.progress(0.42);
    });
    expect(result.current.files[0]?.progress).toBeCloseTo(0.42);
  });

  it("clamps a transport reporting nonsense", async () => {
    const { upload, calls } = deferredUpload();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => {
      result.current.add([makeFile("a.txt")]);
    });
    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    act(() => {
      calls[0]?.progress(4);
    });
    expect(result.current.files[0]?.progress).toBe(1);
  });

  describe("concurrency", () => {
    it("runs no more than the limit at once", async () => {
      const { upload, calls } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, concurrency: 2 }));

      act(() => {
        result.current.add([makeFile("a"), makeFile("b"), makeFile("c"), makeFile("d")]);
      });

      await waitFor(() => {
        expect(calls).toHaveLength(2);
      });
      expect(result.current.stats.uploading).toBe(2);
      expect(result.current.stats.queued).toBe(2);
    });

    it("starts the next file as one finishes", async () => {
      const { upload, calls } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, concurrency: 1 }));

      act(() => {
        result.current.add([makeFile("a"), makeFile("b")]);
      });
      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });

      act(() => {
        calls[0]?.resolve();
      });
      await waitFor(() => {
        expect(calls).toHaveLength(2);
      });
    });
  });

  describe("validation keeps the file", () => {
    it("keeps an oversized file and says why", () => {
      // Dropping it silently is how these components lose work the reader
      // believed had been accepted.
      const { upload } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, maxSize: 50 }));

      act(() => {
        result.current.add([makeFile("big.txt", 500)]);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0]?.status).toBe("failed");
      expect(result.current.files[0]?.error).toMatch(/Larger than/);
    });

    it("keeps a file of the wrong type and says why", () => {
      const { upload } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, accept: "image/*" }));

      act(() => {
        result.current.add([makeFile("a.txt", 10, "text/plain")]);
      });

      expect(result.current.files[0]?.status).toBe("failed");
      expect(result.current.files[0]?.error).toBe("Type not accepted");
    });

    it("never starts a rejected file", async () => {
      const { upload, calls } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, maxSize: 50 }));

      act(() => {
        result.current.add([makeFile("big.txt", 500)]);
      });
      await waitFor(() => {
        expect(result.current.files).toHaveLength(1);
      });
      expect(calls).toHaveLength(0);
    });

    it("stops accepting past maxFiles", () => {
      const { upload } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, maxFiles: 2 }));

      act(() => {
        result.current.add([makeFile("a"), makeFile("b"), makeFile("c")]);
      });
      expect(result.current.files).toHaveLength(2);
    });
  });

  describe("cancel", () => {
    it("aborts the transport and marks it cancelled", async () => {
      const { upload, calls } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload }));

      act(() => {
        result.current.add([makeFile("a.txt")]);
      });
      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });

      act(() => {
        result.current.cancel(result.current.files[0]?.id ?? "");
      });

      await waitFor(() => {
        expect(result.current.files[0]?.status).toBe("cancelled");
      });
      expect(calls[0]?.signal.aborted).toBe(true);
    });

    it("does not retry a cancelled file automatically", async () => {
      // An abort is a decision, not a failure; retrying it would undo it.
      const { upload, calls } = deferredUpload();
      const { result } = renderHook(() => useUploadQueue({ upload, maxAttempts: 3 }));

      act(() => {
        result.current.add([makeFile("a.txt")]);
      });
      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });

      act(() => {
        result.current.cancel(result.current.files[0]?.id ?? "");
      });
      await waitFor(() => {
        expect(result.current.files[0]?.status).toBe("cancelled");
      });

      expect(calls).toHaveLength(1);
    });
  });

  describe("retry", () => {
    it("fails after the attempt limit and keeps the reason", async () => {
      vi.useFakeTimers();
      const upload = vi.fn().mockRejectedValue(new Error("Server said no"));
      const { result } = renderHook(() => useUploadQueue({ upload, maxAttempts: 2 }));

      act(() => {
        result.current.add([makeFile("a.txt")]);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(result.current.files[0]?.status).toBe("failed");
      expect(result.current.files[0]?.error).toBe("Server said no");
      expect(upload).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("backs off between attempts rather than hammering", async () => {
      vi.useFakeTimers();
      const upload = vi.fn().mockRejectedValue(new Error("nope"));
      const { result } = renderHook(() => useUploadQueue({ upload, maxAttempts: 3 }));

      act(() => {
        result.current.add([makeFile("a.txt")]);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(upload).toHaveBeenCalledTimes(1);

      // Still waiting out the first backoff.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(upload).toHaveBeenCalledTimes(1);

      // Each retry needs its timer to fire and React to commit the requeue
      // before the scheduling effect can start it, so advance in stages rather
      // than in one jump.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(upload).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });
      expect(upload).toHaveBeenCalledTimes(3);

      // Three attempts is the limit, so no fourth however long we wait.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(upload).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it("requeues on an explicit retry", async () => {
      vi.useFakeTimers();
      const upload = vi.fn().mockRejectedValue(new Error("nope"));
      const { result } = renderHook(() => useUploadQueue({ upload, maxAttempts: 1 }));

      act(() => {
        result.current.add([makeFile("a.txt")]);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.files[0]?.status).toBe("failed");

      act(() => {
        result.current.retry(result.current.files[0]?.id ?? "");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(upload).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  it("removes a file and aborts it if it was running", async () => {
    const { upload, calls } = deferredUpload();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => {
      result.current.add([makeFile("a.txt")]);
    });
    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });

    act(() => {
      result.current.remove(result.current.files[0]?.id ?? "");
    });

    expect(result.current.files).toHaveLength(0);
    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it("clears only completed files", async () => {
    const { upload, calls } = deferredUpload();
    const { result } = renderHook(() => useUploadQueue({ upload, concurrency: 2 }));

    act(() => {
      result.current.add([makeFile("a"), makeFile("b")]);
    });
    await waitFor(() => {
      expect(calls).toHaveLength(2);
    });

    act(() => {
      calls[0]?.resolve();
    });
    await waitFor(() => {
      expect(result.current.stats.done).toBe(1);
    });

    act(() => {
      result.current.clearCompleted();
    });
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]?.status).toBe("uploading");
  });
});

describe("FileUpload", () => {
  it("uses a real file input rather than an invented dropzone", () => {
    const { container } = render(<FileUpload label="Attach files" onFiles={vi.fn()} />);

    const input = container.querySelector("input[type='file']");
    expect(input).toBeInTheDocument();
    // A div with role=button and a keydown handler is the usual failure.
    expect(container.querySelector("[role='button']")).not.toBeInTheDocument();
  });

  it("labels the input so it is reachable and announced", () => {
    render(<FileUpload label="Attach files" onFiles={vi.fn()} />);
    expect(screen.getByLabelText(/Attach files/)).toBeInTheDocument();
  });

  it("reports chosen files", async () => {
    const onFiles = vi.fn();
    const user = userEvent.setup();
    render(<FileUpload label="Attach" onFiles={onFiles} />);

    await user.upload(screen.getByLabelText(/Attach/), makeFile("a.txt"));

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("reports dropped files", () => {
    const onFiles = vi.fn();
    const { container } = render(<FileUpload label="Attach" onFiles={onFiles} />);
    const zone = container.querySelector("[data-slot='file-upload-dropzone']");

    fireEvent.drop(zone as Element, { dataTransfer: { files: [makeFile("a.txt")] } });

    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it("keeps the drag highlight steady across child elements", () => {
    // dragenter and dragleave fire per child, so a plain boolean flickers.
    const { container } = render(<FileUpload label="Attach" onFiles={vi.fn()} />);
    const zone = container.querySelector("[data-slot='file-upload-dropzone']") as Element;

    fireEvent.dragEnter(zone);
    expect(zone).toHaveAttribute("data-dragging");

    fireEvent.dragEnter(zone); // entering a child
    fireEvent.dragLeave(zone); // leaving the parent's edge
    expect(zone).toHaveAttribute("data-dragging");

    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveAttribute("data-dragging");
  });

  it("ignores a drop when disabled", () => {
    const onFiles = vi.fn();
    const { container } = render(<FileUpload label="Attach" onFiles={onFiles} disabled />);
    const zone = container.querySelector("[data-slot='file-upload-dropzone']");

    fireEvent.drop(zone as Element, { dataTransfer: { files: [makeFile("a.txt")] } });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("takes only one file when multiple is off", () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FileUpload label="Attach" onFiles={onFiles} multiple={false} />,
    );
    const zone = container.querySelector("[data-slot='file-upload-dropzone']");

    fireEvent.drop(zone as Element, {
      dataTransfer: { files: [makeFile("a.txt"), makeFile("b.txt")] },
    });

    expect(onFiles.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <FileUpload label="Attach files" onFiles={vi.fn()} hint="PDF up to 10 MB" />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("FileUploadList", () => {
  const entry = (over: Partial<QueuedFile> = {}): QueuedFile => ({
    id: "1",
    file: makeFile("report.pdf", 2_400_000, "application/pdf"),
    status: "queued",
    progress: null,
    attempts: 0,
    ...over,
  });

  it("states the status in words, not only as a bar", () => {
    render(<FileUploadList files={[entry({ status: "uploading", progress: 0.6 })]} />);
    expect(screen.getByText(/Uploading · 60%/)).toBeInTheDocument();
  });

  it("names the progressbar after the file it belongs to", () => {
    render(<FileUploadList files={[entry({ status: "uploading", progress: 0.6 })]} />);

    const bar = screen.getByRole("progressbar", { name: "Uploading report.pdf" });
    expect(bar).toHaveAttribute("aria-valuenow", "60");
  });

  it("shows no progressbar for a file that is not uploading", () => {
    render(<FileUploadList files={[entry({ status: "queued" })]} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows the reason a file failed", () => {
    render(
      <FileUploadList files={[entry({ status: "failed", error: "Larger than 1.0 MB" })]} />,
    );
    expect(screen.getByText(/Larger than 1.0 MB/)).toBeInTheDocument();
  });

  it("offers cancel only while uploading", () => {
    const { rerender } = render(
      <FileUploadList
        files={[entry({ status: "uploading", progress: 0.2 })]}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    rerender(<FileUploadList files={[entry({ status: "done" })]} onCancel={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("offers retry after a failure or a cancellation", () => {
    const { rerender } = render(
      <FileUploadList files={[entry({ status: "failed" })]} onRetry={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    rerender(<FileUploadList files={[entry({ status: "cancelled" })]} onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("names the file in the remove button", () => {
    render(<FileUploadList files={[entry()]} onRemove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove report.pdf" })).toBeInTheDocument();
  });

  it("renders nothing when the queue is empty", () => {
    const { container } = render(<FileUploadList files={[]} />);
    expect(container.querySelector("[data-slot='file-upload-list']")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <FileUploadList
        files={[
          entry({ id: "1", status: "uploading", progress: 0.4 }),
          entry({ id: "2", status: "failed", error: "Network error" }),
        ]}
        onCancel={vi.fn()}
        onRetry={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("FileUploadStatus", () => {
  it("summarises progress through the set, in one polite region", () => {
    // Not a count of what is in flight: with a concurrency limit that number is
    // capped and says nothing about how much of the job remains.
    const { container } = render(
      <FileUploadStatus stats={{ total: 5, active: 5, done: 2, failed: 0 }} />,
    );

    expect(screen.getByText("2 of 5 uploaded")).toBeInTheDocument();
    expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
  });

  it("reports failures once everything has settled", () => {
    render(<FileUploadStatus stats={{ total: 3, active: 0, done: 2, failed: 1 }} />);
    expect(screen.getByText("2 uploaded, 1 failed")).toBeInTheDocument();
  });

  it("says nothing when there is nothing to report", () => {
    render(<FileUploadStatus stats={{ total: 0, active: 0, done: 0, failed: 0 }} />);
    expect(screen.getByRole("paragraph")).toHaveTextContent("");
  });
});
