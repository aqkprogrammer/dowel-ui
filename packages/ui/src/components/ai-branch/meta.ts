import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-branch",
  title: "Branch",
  description:
    "Alternative versions of a conversation turn — regenerated answers, edited prompts — with a wrapping pager between them.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["ai-branch.tsx"],
  a11y:
    'The pager is a group named "Versions" with real Previous/Next buttons (their chevrons mirror in right-to-left ' +
    'layouts) and a polite, atomic "2 of 3" indicator, so paging says where it went. Inactive versions are hidden ' +
    "rather than unmounted, keeping their state. The pager disappears when there is only one version. The " +
    "entrance is decoration and stops under reduced motion.",
});
