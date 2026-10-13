import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "voice-input",
  title: "Voice Input",
  description:
    "A microphone toggle for talking to an assistant: records, shows what the mic hears and for how long, and streams a live transcript where the browser can.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: ["audio-visualizer", "button"],
  files: ["voice-input.tsx"],
  a11y:
    "A toggle button (aria-pressed) whose name never changes, so its state is read rather than its label " +
    "swapping. Recording is said in words beside the visualizer and timer, and a status region announces " +
    "start, stop with the duration, cancel and every error. Escape cancels a recording without keeping it. " +
    "Permission denied, no microphone and an unsupported browser each get a visible message.",
  guidance: {
    useWhen: [
      "letting people speak a prompt instead of typing it",
      "recording a short voice note to send",
    ],
    avoidWhen: [
      "a live call — that needs a full call interface",
      "the only way to enter text — always keep a keyboard route",
    ],
    alternatives: ["ai-prompt-input", "audio-visualizer"],
  },
  composesWith: ["ai-prompt-input", "audio-visualizer", "ai-message"],
  controls: {
    maxDuration: { min: 5, max: 300, step: 5 },
  },
});
