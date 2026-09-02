import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { FileUpload, FileUploadList, FileUploadStatus } from "./file-upload";
import { useUploadQueue, type UploadFn } from "./upload-queue";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

/**
 * A transport that pretends to be a network. A real one is an XHR — see
 * `xhrUpload` in the source — because fetch cannot report upload progress.
 */
function fakeUpload({
  failEvery = 0,
  ms = 2400,
}: { failEvery?: number; ms?: number } = {}): UploadFn {
  let call = 0;
  return (_file, { onProgress, signal }) => {
    call += 1;
    const shouldFail = failEvery > 0 && call % failEvery === 0;

    return new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const fraction = Math.min(1, (Date.now() - started) / ms);
        onProgress(fraction);
        if (fraction >= 1) {
          clearInterval(timer);
          if (shouldFail) reject(new Error("Storage rejected the upload"));
          else resolve();
        }
      }, 120);

      signal.addEventListener("abort", () => {
        clearInterval(timer);
        reject(new Error("Cancelled"));
      });
    });
  };
}

const meta = {
  title: "Forms/File Upload",
  component: FileUpload,
  decorators: [withWidth],
  args: { label: "Attach files", onFiles: () => undefined },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The shell on its own. It is a real file input, so it already works. */
export const Default: Story = {
  args: { hint: "Any file, up to 10 MB" },
};

/**
 * The whole thing wired up. Choose or drop files and watch the queue: progress,
 * cancel mid-flight, and only three uploads running at a time.
 */
export const WithQueue: Story = {
  parameters: { controls: { disable: true } },
  render: function WithQueue() {
    const queue = useUploadQueue({ upload: fakeUpload(), concurrency: 3 });

    return (
      <FileUpload label="Attach files" onFiles={queue.add} hint="Any file, up to 10 MB">
        <FileUploadStatus stats={queue.stats} />
        <FileUploadList
          files={queue.files}
          onCancel={queue.cancel}
          onRetry={queue.retry}
          onRemove={queue.remove}
        />
      </FileUpload>
    );
  },
};

/**
 * Every third upload fails. It retries with backoff on its own, and only asks
 * for help once it has run out of attempts — with the reason still on screen.
 */
export const RetriesAndFailures: Story = {
  parameters: { controls: { disable: true } },
  render: function RetriesAndFailures() {
    const queue = useUploadQueue({
      upload: fakeUpload({ failEvery: 3, ms: 1200 }),
      concurrency: 2,
      maxAttempts: 2,
    });

    return (
      <FileUpload
        label="Attach files"
        onFiles={queue.add}
        hint="Every third attempt fails, on purpose"
      >
        <FileUploadStatus stats={queue.stats} />
        <FileUploadList
          files={queue.files}
          onCancel={queue.cancel}
          onRetry={queue.retry}
          onRemove={queue.remove}
        />
      </FileUpload>
    );
  },
};

/**
 * A file that fails validation is kept and told why, rather than vanishing.
 * Try a file over 50 kB, or anything that is not an image.
 */
export const RejectedFilesStayVisible: Story = {
  parameters: { controls: { disable: true } },
  render: function RejectedFilesStayVisible() {
    const queue = useUploadQueue({
      upload: fakeUpload(),
      maxSize: 50_000,
      accept: "image/*",
    });

    return (
      <FileUpload
        label="Attach images"
        onFiles={queue.add}
        accept="image/*"
        hint="Images only, up to 50 kB — try something else and see what happens"
      >
        <FileUploadStatus stats={queue.stats} />
        <FileUploadList files={queue.files} onRetry={queue.retry} onRemove={queue.remove} />
      </FileUpload>
    );
  },
};

/** One file at a time, for an avatar or a logo. */
export const SingleFile: Story = {
  args: { multiple: false, accept: "image/*", hint: "PNG or JPG, square works best" },
};

export const Disabled: Story = {
  args: { disabled: true, hint: "Uploading is unavailable while the workspace is read-only" },
};
