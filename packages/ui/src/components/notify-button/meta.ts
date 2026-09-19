import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "notify-button",
  title: "Notify Button",
  description:
    "A “notify me” toggle: the bell rings and the label grows elastically into the confirmation.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["notify-button.tsx"],
  a11y:
    "A toggle button exposed with aria-pressed. Its accessible name stays the resting label — the " +
    "confirmation label is aria-hidden — and the confirmation is announced once through a polite live " +
    "region when it turns on. The bell is decorative; its ring and the width spring stop under reduced motion.",
});
