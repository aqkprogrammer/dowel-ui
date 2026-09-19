import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-approval-request",
  title: "AI Approval Request",
  description: "Approve a tool call — after correcting the arguments the model got wrong.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-approval-request.tsx"],
  a11y:
    "The proposed arguments are a description list of real labelled form controls, so each value " +
    "is associated with its name and editable ones are reachable by keyboard. A corrected " +
    "argument is marked in text rather than by border colour alone, because an audit trail has " +
    "to distinguish the model's proposal from the human's edit. The request is aria-busy while " +
    "arguments are still arriving and the decision controls stay disabled until it is whole — " +
    "rendering nothing until then, as the common implementation does, means nothing is on screen " +
    "at the moment approval becomes relevant. Irreversibility is stated as a sentence, never as a " +
    "severity colour. Focus never falls to the page as controls swap: deciding moves it to the " +
    "outcome (tabindex -1, never a Tab stop), Deny… moves it into the reason field and Back " +
    "returns it — but only when focus was already inside, so a replayed or remote decision " +
    "never steals it (manageFocus={false} opts out).",
});
