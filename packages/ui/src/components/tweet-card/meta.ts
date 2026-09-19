import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tweet-card",
  title: "Tweet Card",
  description:
    "A social post drawn from props — author, text, photos, date and counts — with a link out to the original. No network, no embed script.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar", "skeleton"],
  files: ["tweet-card.tsx"],
  a11y:
    "An article named by its author, with the post in a blockquote citing its URL. URLs, @mentions and " +
    "#hashtags in string text become real links. The link to the post is a real, named link revealed on " +
    "hover and on keyboard focus, and always shown on devices that cannot hover. The avatar is decorative " +
    "(the name beside it is the link); verification is announced as text, counts are read in full " +
    '("1200 likes", not "1.2K"), and the date is a <time> element. Photos need alt text.',
});
