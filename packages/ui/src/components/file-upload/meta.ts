import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "file-upload",
  title: "File Upload",
  description: "A dropzone over a real file input, plus the upload queue nobody ships.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["upload-queue.ts", "file-upload.tsx"],
  a11y:
    "The APG has no dropzone pattern, and inventing one is the usual failure — a div with " +
    'role="button", a keydown handler, and a picker keyboard users never reach. The control here ' +
    "is a real input[type=file] with a real label, which is already operable, already announced, " +
    "and opens the picker on Enter and Space with nothing added. Drag and drop is a pointer " +
    "convenience layered on top; every drop can also be done from the input. Each uploading file " +
    "gets a progressbar named after it, status is always stated in words as well as drawn, and " +
    "one polite live region summarises the whole queue rather than six per-file regions talking " +
    "over each other.",
});
