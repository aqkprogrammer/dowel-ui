import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "avatar",
  title: "Avatar",
  description: "An image representation of a user or entity with a graceful text fallback.",
  category: "display",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["avatar.tsx"],
  a11y:
    'Give AvatarImage a meaningful alt, or alt="" when the adjacent text already names the ' +
    "person. Fallback initials are decorative and are not announced separately.",
});
