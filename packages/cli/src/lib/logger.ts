import pc from "picocolors";

/**
 * All CLI output goes through here.
 *
 * A single place to route messages means the format stays consistent, and
 * anything that needs to change later — quiet mode, JSON output, writing to
 * stderr — changes in one file rather than in every command.
 */
export const logger = {
  info(message: string) {
    console.log(message);
  },
  success(message: string) {
    console.log(`${pc.green("✓")} ${message}`);
  },
  warn(message: string) {
    console.warn(`${pc.yellow("!")} ${message}`);
  },
  error(message: string) {
    console.error(`${pc.red("✕")} ${message}`);
  },
  step(message: string) {
    console.log(`${pc.dim("·")} ${message}`);
  },
  blank() {
    console.log("");
  },
};

export { pc };
