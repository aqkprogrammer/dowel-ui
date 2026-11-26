import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "upload-button",
  title: "Upload Button",
  description:
    "A pill upload button that draws in to a circle, fills a progress ring, draws a check and opens back out into the pill.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["upload-button.tsx"],
  a11y:
    "A native <button> named by its visible label throughout. While working it is aria-busy and aria-disabled " +
    "rather than disabled, so keyboard focus stays on it and a second press is ignored. A visually hidden polite " +
    'live region beside it announces "Uploading" and then "Uploaded" once each; progress percentages are not ' +
    "announced. The ring and check are aria-hidden. Under reduced motion every step of the sequence still " +
    "happens and is announced, but lands without animating.",
  guidance: {
    useWhen: [
      "a single upload or sync action whose progress should stay on the button that started it",
    ],
    avoidWhen: [
      "choosing files or dropping them — use file-upload",
      "long uploads where the user needs a percentage or a cancel control",
    ],
    alternatives: ["file-upload", "button", "hold-button"],
  },
});
