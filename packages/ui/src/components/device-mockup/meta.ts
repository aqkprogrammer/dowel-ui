import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "device-mockup",
  title: "Device Mockup",
  description:
    "A phone, tablet, laptop or browser window drawn in CSS around a screenshot or live UI, with an optional 3D tilt.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["device-mockup.tsx"],
  a11y:
    "A figure; the frame, notch, camera and window controls are aria-hidden decoration, and the screen keeps the " +
    "roles and focus order of whatever is inside — give a screenshot real alt text. A tilted device straightens " +
    "on hover and when focus moves inside it, on the motion scale, so under reduced motion it simply switches. " +
    "The browser's address is plain text. A caption is visible, not hidden.",
  guidance: {
    useWhen: ["showing a product screenshot or a live demo in context on a landing page"],
    avoidWhen: ["documentation screenshots people need to read closely — show them full size"],
    alternatives: ["hero-product", "tilt-card"],
  },
  composesWith: ["hero-split-image", "features-alternating"],
});
