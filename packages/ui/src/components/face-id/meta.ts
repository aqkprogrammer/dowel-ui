import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "face-id",
  title: "Face ID",
  description:
    "A Face ID glyph whose scan line sweeps while the face shifts expression, then morphs into a check on success.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["face-id.tsx"],
  a11y:
    'The root is role="status", so its caption ("Face ID", "Scanning", "Unlocked", "Not recognized") is announced politely ' +
    "each time `status` changes; `hideLabel` hides the caption visually but keeps it announced. The glyph is aria-hidden " +
    "decoration and never the only signal: the caption always names the state. Under reduced motion the scan line stops and " +
    "every state change lands on its final frame without the sweep, morph or shake.",
  guidance: {
    useWhen: [
      "showing the progress of a biometric or passkey check",
      "an unlock or confirm step that needs a recognisable scanning moment",
    ],
    avoidWhen: [
      "general loading — use spinner or dots-loader",
      "a result that needs explaining; pair an error with text that says what to do next",
    ],
    alternatives: ["spinner", "sync-status", "alert"],
  },
});
