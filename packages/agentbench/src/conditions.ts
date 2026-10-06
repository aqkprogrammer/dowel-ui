/**
 * The two conditions, and the only thing that differs between them.
 *
 * Both get the same app, the same theme, Dowel initialised and the same
 * components installed. `with-dowel` adds what Dowel offers agents on top:
 * the files `dowel agents` writes (AGENTS.md, `.dowel/`, a Claude skill, a
 * Cursor rule) and an MCP server configuration. So a difference in the scores
 * is a difference those make, not one in what was installed.
 */
export const CONDITIONS = ["with-dowel", "without"] as const;
export type Condition = (typeof CONDITIONS)[number];

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}
