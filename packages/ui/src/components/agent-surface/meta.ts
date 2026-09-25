import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "agent-surface",
  title: "Agent Surface",
  description:
    "A region an agent can operate through tools — yours or a browser agent's via WebMCP — and a person can take back at any moment.",
  category: "ai",
  status: "experimental",
  dependencies: [],
  registryDependencies: [],
  files: ["agent-surface.tsx", "agent-tools.ts", "agent-call.ts", "tool-input.ts", "webmcp.ts"],
  a11y:
    "Every change of control is announced through a polite status region that exists from first paint — " +
    '"Agent has control", "You have control. Agent is paused", "Agent needs you: sign in to continue" — and the ' +
    "surface's ring is never the only signal of who holds it. Finished tool calls are announced only with " +
    "announceCalls, because an agent making several calls a second would otherwise talk over everything. " +
    'While the agent drives, a person operating any control inside the surface takes over (takeOverOn="input"), ' +
    "so a keyboard or switch user never has to race the agent to a button first; tabbing and reading do not " +
    "count, only activating or editing something, and nothing inside [data-agent-ui] — the baton, an approval, " +
    "the composer — counts at all. An element a tool acts on is outlined while it is used, so " +
    "the person can see what the agent touched, and focus is never moved by a tool call. While the person " +
    "holds control every call is refused, reads included, because taking over is often done to type " +
    "something the agent should not see.",
});
