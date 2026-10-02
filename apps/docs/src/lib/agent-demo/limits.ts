/**
 * What the agent demo's endpoint will accept, shared by the page and the route.
 *
 * The endpoint spends the site owner's money on every request and is reachable
 * by anyone, so it is built to be useless for anything but the demo: the
 * system prompt is fixed, only the demo's own tools are accepted, and
 * everything the caller controls is short.
 */

/** The surface's name. Its tools reach the model prefixed with it: `crm_list_deals`. */
export const SURFACE_NAME = "crm";

/** The demo's tools. A request naming any other is refused. */
export const TOOL_NAMES = [
  "list_deals",
  "filter_deals",
  "sort_deals",
  "select_deals",
  "set_stage",
  "email_owners",
].map((name) => `${SURFACE_NAME}_${name}`);

/** What the person asks for. */
export const MAX_GOAL_CHARS = 300;
/** Model calls in one run. A run that needs more has lost its way. */
export const MAX_MODEL_TURNS = 12;
/** What one tool call tells the model. */
export const MAX_TOOL_RESULT_CHARS = 4000;
/** One model turn's content, as JSON, when the page sends it back. */
export const MAX_ASSISTANT_TURN_CHARS = 20_000;
export const MAX_TOOL_DESCRIPTION_CHARS = 600;
export const MAX_TOOL_SCHEMA_CHARS = 2000;
/** The whole request body. */
export const MAX_BODY_BYTES = 120_000;
