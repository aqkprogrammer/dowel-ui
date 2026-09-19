import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "testimonial-rotator",
  kind: "block",
  title: "Testimonial Rotator",
  description:
    "One large quotation at a time, rotating on a timer shown by a filling indicator, with a stop/start control.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar", "button"],
  files: ["testimonial-rotator.tsx"],
  a11y:
    "Follows the APG carousel's rotation rules, which the source (a timer with no way to stop it) " +
    "did not: a named stop/start button, a pause while the pointer is over the block or focus is " +
    "inside it, the live region off while rotating and polite otherwise, and no automatic start " +
    "under reduced motion (WCAG 2.2.2). The section is named by a heading — visually hidden by " +
    'default — and carries aria-roledescription="carousel"; the quote is a labelled slide. ' +
    "Indicators are named buttons with aria-current and arrow keys (mirrored in RTL), Home and End. " +
    "The avatar is hidden, since the name is beside it.",
});
