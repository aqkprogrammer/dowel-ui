/**
 * Memories, and the questions the inspector asks of them.
 *
 * Pure, so search, ordering and grouping are tested without rendering, and so
 * a server can answer "what would this search show" from the same code.
 */

export interface MemorySource {
  /** Where it was learned, in the person's words: "Chat on 3 September". */
  label: string;
  /** A link back to it, when there is one to follow. */
  href?: string;
}

export interface Memory {
  id: string;
  /** What is remembered, as a sentence: "Prefers metric units." */
  text: string;
  source?: MemorySource;
  /** Milliseconds since the epoch. */
  createdAt?: number;
  /** Milliseconds since the epoch. */
  lastUsedAt?: number;
  /** Kept at the top, and meant to be kept. */
  pinned?: boolean;
  /** Where it applies: "Work", "Project Dowel". Unscoped memories apply everywhere. */
  scope?: string;
}

export interface MemoryGroup {
  /** The scope, or undefined for memories that apply everywhere. */
  scope: string | undefined;
  label: string;
  memories: Memory[];
}

/** What a group of unscoped memories is called. */
export const UNSCOPED_LABEL = "General";

/** Case-insensitive, on the text and where it came from. An empty query matches. */
export function matchesMemory(memory: Memory, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return true;
  return (
    memory.text.toLocaleLowerCase().includes(needle) ||
    (memory.source?.label.toLocaleLowerCase().includes(needle) ?? false)
  );
}

/**
 * Pinned first, otherwise in the order given.
 *
 * The order is otherwise the application's: it knows whether newest or most
 * used belongs at the top, and a list that re-sorts itself by recency would
 * move under the person's pointer each time a memory is used.
 */
export function sortMemories(memories: readonly Memory[]): Memory[] {
  return [
    ...memories.filter((memory) => memory.pinned),
    ...memories.filter((memory) => !memory.pinned),
  ];
}

/** By scope, in the order each scope first appears, pinned first within each. */
export function groupMemories(memories: readonly Memory[]): MemoryGroup[] {
  const groups = new Map<string | undefined, Memory[]>();
  for (const memory of memories) {
    // An empty scope is no scope, not a group with no name.
    const scope = memory.scope === "" ? undefined : memory.scope;
    const list = groups.get(scope);
    if (list) list.push(memory);
    else groups.set(scope, [memory]);
  }
  return [...groups].map(([scope, list]) => ({
    scope,
    label: scope ?? UNSCOPED_LABEL,
    memories: sortMemories(list),
  }));
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * The calendar date in UTC, in English: "12 Sep 2026".
 *
 * The default because it is the same on the server and in the browser. A
 * locale-formatted or relative time is not — the server has another time zone
 * and another idea of "now" — and the difference breaks hydration.
 */
export function formatMemoryDate(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCDate())} ${MONTHS[date.getUTCMonth()] ?? ""} ${String(date.getUTCFullYear())}`;
}

/** An ISO timestamp for `<time dateTime>`, or undefined when there is none to give. */
export function isoTime(ms: number | undefined): string | undefined {
  if (ms === undefined) return undefined;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** "1 memory", "12 memories". */
export function countMemories(n: number): string {
  return `${String(n)} ${n === 1 ? "memory" : "memories"}`;
}

/** The heading: "Claude remembers 12 things". */
export function describeMemoryCount(agentName: string, n: number): string {
  if (n === 0) return `${agentName} doesn't remember anything`;
  return `${agentName} remembers ${String(n)} ${n === 1 ? "thing" : "things"}`;
}

/**
 * A memory's text, quoted and cut short enough to repeat in a sentence.
 *
 * Cut at a word where there is one, so the notice never ends mid-word.
 */
export function quoteMemory(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return `“${flat}”`;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `“${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…”`;
}
