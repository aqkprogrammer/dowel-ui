import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dns-record",
  title: "DNS Record",
  description:
    "Add this record at your provider: parts copied separately, checked with what was found.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "spinner"],
  files: ["dns-record.tsx"],
  a11y:
    "The card is a region named by the record's type and purpose. Each part is a definition " +
    "with its own copy button, named by the part it copies, so five Copy buttons are five " +
    "different buttons. Verification status is a word in a polite live region, so the answer to " +
    "a check arrives where it was asked for, and the card is aria-busy while checking. Copy " +
    "results are announced in a separate region, present from the start, so a copy never " +
    "replaces a check result mid-sentence; failure is announced with what to do instead. What " +
    "the check found is a list, not a colour.",
});
