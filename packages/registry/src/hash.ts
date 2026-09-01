import { createHash } from "node:crypto";

/**
 * Content hash used to detect local edits to an installed file.
 *
 * Line endings are normalised before hashing so a Windows checkout does not
 * read as "every file modified", which would make `update` useless there.
 */
export function hashContent(content: string): string {
  const normalised = content.replace(/\r\n/g, "\n");
  return `sha256:${createHash("sha256").update(normalised, "utf8").digest("hex")}`;
}
