// The shared ESLint config is plain JavaScript with no declarations of its
// own. This states the one export the harness reads.
declare module "@dowel-ui/config/eslint/react" {
  import type { Linter } from "eslint";

  export const react: Linter.Config[];
  export default react;
}
