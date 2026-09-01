import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "toast",
  title: "Toast",
  description: "Brief, non-blocking messages with an imperative API callable from anywhere.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["toast-store.ts", "toast.tsx"],
  a11y:
    "Toasts are announced through a live region: destructive and warning variants interrupt " +
    "(foreground), the rest wait for a pause (background). Auto-dismiss timers pause on hover, " +
    "focus and window blur, and F8 moves focus into the toast list from anywhere. An action " +
    "must carry altText describing how to do the same thing without the toast, since it may " +
    "be gone before a screen reader user reaches it.",
});
