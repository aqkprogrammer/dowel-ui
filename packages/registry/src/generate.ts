import type { RegistryIndex, RegistryIndexEntry } from "./schema";

export type { RegistryIndex, RegistryIndexEntry } from "./schema";

/**
 * Turning a description of a screen into a plan made of components that exist.
 *
 * The hard part of generating UI is not writing JSX. It is not inventing: a
 * model asked for a billing page will cheerfully produce `<PricingTable>` and
 * `<InvoiceList>` and a `variant="subtle"` that was never implemented, and the
 * result reads perfectly and compiles nowhere.
 *
 * So this resolves a prompt against the registry first, and everything it
 * emits afterwards is drawn from what came back. It cannot name a component
 * that is not installable, because it only ever repeats names the registry
 * gave it.
 *
 * It does not guess at props. The registry publishes what a component *is* and
 * what it depends on, not the shape of its arguments, so the output stops at
 * the composition and points at the page where the props are documented.
 * Emitting a plausible prop is worse than emitting none — one is a gap, the
 * other is a bug that looks like working code.
 */

/** Words that carry no signal about which component is wanted. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "with",
  "to",
  "in",
  "on",
  "at",
  "by",
  "is",
  "are",
  "be",
  "make",
  "build",
  "create",
  "want",
  "need",
  "add",
  "show",
  "page",
  "screen",
  "app",
  "application",
  "ui",
  "interface",
  "component",
  "components",
  "me",
  "my",
  "our",
  "i",
  "it",
  "that",
  "this",
  "some",
  "using",
  "use",
  "like",
]);

/**
 * Words a reader would use that are not the words the registry uses.
 *
 * Hand-written, and deliberately so. "Sign in" is what someone types and
 * `login` is what the item is called; no amount of string similarity bridges
 * that, and pretending otherwise produces a matcher that works on the examples
 * it was tuned against and nothing else.
 */
const SYNONYMS: Record<string, string[]> = {
  "sign in": ["login"],
  signin: ["login"],
  "log in": ["login"],
  "sign up": ["signup"],
  register: ["signup"],
  registration: ["signup"],
  "forgot password": ["forgot-password"],
  "reset password": ["forgot-password"],
  chat: ["ai-chat", "ai-conversation", "ai-prompt-input"],
  conversation: ["ai-chat"],
  assistant: ["ai-chat"],
  copilot: ["ai-chat"],
  agent: ["agent-console", "ai-agent-status", "ai-agent-plan"],
  agents: ["agent-console"],
  tool: ["ai-tool"],
  approval: ["ai-approval-request"],
  approve: ["ai-approval-request"],
  undo: ["ai-action-ledger"],
  audit: ["ai-action-ledger", "activity-feed"],
  tokens: ["ai-token-usage"],
  spend: ["ai-dashboard", "billing"],
  cost: ["ai-dashboard", "billing"],
  usage: ["ai-dashboard", "billing"],
  subscription: ["billing", "pricing"],
  invoice: ["billing"],
  invoices: ["billing"],
  payment: ["billing"],
  plan: ["pricing", "billing"],
  plans: ["pricing"],
  metrics: ["analytics", "dashboard", "metric-delta"],
  chart: ["analytics"],
  charts: ["analytics"],
  graph: ["analytics"],
  stats: ["dashboard", "analytics"],
  overview: ["dashboard"],
  grid: ["data-table", "table"],
  spreadsheet: ["data-table"],
  list: ["table", "data-table"],
  search: ["command", "combobox"],
  palette: ["command"],
  shortcut: ["command", "shortcut-recorder"],
  modal: ["dialog"],
  popup: ["dialog", "popover"],
  dropdown: ["dropdown-menu", "select"],
  toast: ["toast"],
  notification: ["toast", "activity-feed"],
  notifications: ["toast", "settings"],
  upload: ["file-upload"],
  file: ["file-upload"],
  date: ["date-picker", "calendar"],
  time: ["time-range-picker"],
  schedule: ["cron-editor"],
  cron: ["cron-editor"],
  team: ["admin-users", "settings"],
  members: ["admin-users"],
  users: ["admin-users"],
  admin: ["admin-users"],
  permissions: ["permission-matrix"],
  roles: ["permission-matrix"],
  profile: ["settings"],
  preferences: ["settings"],
  account: ["settings", "billing"],
  setup: ["onboarding"],
  checklist: ["onboarding"],
  wizard: ["onboarding"],
  logs: ["log-viewer"],
  log: ["log-viewer"],
  diff: ["diff-viewer", "record-diff"],
  secret: ["secret-field"],
  "api key": ["secret-field"],
  key: ["secret-field"],
  dns: ["dns-record"],
};

export interface PlanEntry {
  entry: RegistryIndexEntry;
  /** Why this was chosen, in words, so a wrong pick is arguable. */
  because: string;
}

export interface UiPlan {
  /** The prompt, as given. */
  prompt: string;
  /** Whole sections, which bring their own components. */
  blocks: PlanEntry[];
  /** Individual components, none of which a chosen block already installs. */
  components: PlanEntry[];
  /** Everything to install, in one list. */
  install: string[];
  /** True when nothing matched, so callers can say so rather than emit nothing. */
  empty: boolean;
}

function normalise(prompt: string): string {
  return prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function words(prompt: string): string[] {
  return normalise(prompt)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

interface SynonymMatch {
  /** Item name to the phrase that selected it. */
  hits: Map<string, string>;
  /**
   * Words the table has already spoken for.
   *
   * Excluded from generic term matching afterwards. The table exists to say
   * that "plan" means pricing or billing; letting the generic matcher also
   * score every item with "plan" in its name puts `ai-agent-plan` on a billing
   * page and re-introduces exactly the ambiguity the table resolves.
   */
  consumed: Set<string>;
}

function synonymHits(prompt: string): SynonymMatch {
  const text = normalise(prompt);
  const hits = new Map<string, string>();
  const consumed = new Set<string>();

  for (const [phrase, names] of Object.entries(SYNONYMS)) {
    // Word-boundary matched, so "keyboard" does not trigger "key".
    const pattern = new RegExp(`(^|\\s)${phrase.replace(/\s+/g, "\\s+")}(\\s|$)`);
    if (!pattern.test(text)) continue;

    for (const word of phrase.split(/\s+/)) consumed.add(word);
    for (const name of names) {
      if (!hits.has(name)) hits.set(name, phrase);
    }
  }

  return { hits, consumed };
}

/** Below this a match is coincidence rather than intent. */
const MINIMUM_SCORE = 20;

interface Scored {
  entry: RegistryIndexEntry;
  /** What the prompt actually matched. Decides whether it qualifies at all. */
  score: number;
  /** Score plus the block preference. Decides order only. */
  rank: number;
  because: string;
}

function scoreEntry(
  entry: RegistryIndexEntry,
  terms: string[],
  synonyms: Map<string, string>,
): Scored | undefined {
  const name = entry.name.toLowerCase();
  const title = entry.title.toLowerCase();
  const description = entry.description.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  const synonym = synonyms.get(entry.name);
  if (synonym) {
    score += 60;
    reasons.push(`"${synonym}"`);
  }

  for (const term of terms) {
    if (name === term) {
      score += 50;
      reasons.push(`named "${term}"`);
    } else if (name.split("-").includes(term)) {
      score += 30;
      reasons.push(`"${term}" in its name`);
    } else if (title.includes(term)) {
      score += 20;
      reasons.push(`"${term}" in its title`);
    } else if (entry.category === term) {
      score += 12;
      reasons.push(`the ${term} category`);
    } else if (description.includes(term)) {
      score += 8;
      reasons.push(`"${term}" in its description`);
    }
  }

  if (score === 0) return undefined;

  // A block covers more of an intent than a component does, and installing one
  // brings the components anyway — so where both match, the block is the better
  // answer rather than merely an equal one.
  //
  // Kept out of `score` on purpose. Added there it would lift a block over the
  // qualifying floor on a description-only brush, which is how `ai-dashboard`
  // ended up recommended for an agent console because its prose contains the
  // word "run". A preference should order real matches, not manufacture one.
  const rank = score + (entry.type === "registry:block" ? 25 : 0);

  return { entry, score, rank, because: [...new Set(reasons)].slice(0, 3).join(", ") };
}

export interface PlanOptions {
  /** How many components to suggest beyond the blocks. */
  maxComponents?: number;
  /** How many blocks to suggest. */
  maxBlocks?: number;
}

export function planUi(
  prompt: string,
  index: RegistryIndex,
  options: PlanOptions = {},
): UiPlan {
  const { maxBlocks = 3, maxComponents = 6 } = options;

  const { hits: synonyms, consumed } = synonymHits(prompt);
  const terms = words(prompt).filter((term) => !consumed.has(term));

  const scored = index.items
    .filter((entry) => entry.type === "registry:ui" || entry.type === "registry:block")
    .map((entry) => scoreEntry(entry, terms, synonyms))
    .filter((candidate): candidate is Scored => candidate !== undefined)
    // A description-only brush (8) or a bare category hit (12) is not enough on
    // its own. Suggesting six components because the prompt shares a common
    // word with their prose makes the plan look like more work than it is, and
    // buries the ones that actually matched.
    .filter((candidate) => candidate.score >= MINIMUM_SCORE)
    .sort((a, b) => b.rank - a.rank || a.entry.name.localeCompare(b.entry.name));

  const blocks = scored
    .filter((candidate) => candidate.entry.type === "registry:block")
    .slice(0, maxBlocks);

  // Anything a chosen block already installs is not a separate suggestion:
  // listing Button beside a Dashboard that brings it is noise that makes the
  // plan look longer than the work.
  const covered = new Set(
    blocks.flatMap((candidate) => [
      candidate.entry.name,
      ...candidate.entry.registryDependencies,
    ]),
  );

  const components = scored
    .filter(
      (candidate) =>
        candidate.entry.type === "registry:ui" && !covered.has(candidate.entry.name),
    )
    .slice(0, maxComponents);

  const toEntry = (candidate: Scored): PlanEntry => ({
    entry: candidate.entry,
    because: candidate.because,
  });

  return {
    prompt,
    blocks: blocks.map(toEntry),
    components: components.map(toEntry),
    install: [...blocks, ...components].map((candidate) => candidate.entry.name),
    empty: blocks.length === 0 && components.length === 0,
  };
}

/** PascalCase export name for a registry name, e.g. "ai-tool" -> "AiTool". */
function tag(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Blocks export a `…Block` component; components export their own name. */
function componentName(entry: RegistryIndexEntry): string {
  const base = tag(entry.name);
  return entry.type === "registry:block" ? `${base}Block` : base;
}

export interface RenderOptions {
  /** Where components are imported from in the target project. */
  importFrom?: string;
  /**
   * Where blocks are imported from.
   *
   * Separate because blocks are not exported from the component package at
   * all — they are only ever installed as source — so deriving their path from
   * a package specifier produces an import that does not exist. Derived from
   * `importFrom` when it is a project alias, and otherwise the conventional
   * install location.
   */
  blocksImportFrom?: string;
  cliPackage?: string;
  docsUrl?: string;
}

/**
 * Where an installed block lives.
 *
 * A project alias like `@/components/ui` has a sibling `@/components/blocks`. A
 * bare package specifier has no block path at all, so the conventional install
 * location is used instead of inventing one under the package.
 */
export function blocksPathFor(importFrom: string): string {
  if (importFrom.endsWith("/ui")) return `${importFrom.slice(0, -3)}/blocks`;
  if (importFrom.startsWith("@/") || importFrom.startsWith("~/")) {
    return `${importFrom}/blocks`;
  }
  return "@/components/blocks";
}

/**
 * The plan as a starting file.
 *
 * Imports and composition only. Every element carries the page its props are
 * documented on, because the registry does not publish prop shapes and a
 * plausible invented prop is worse than an obvious gap — one is a TODO, the
 * other is a bug wearing the costume of working code.
 */
export function renderPlan(plan: UiPlan, options: RenderOptions = {}): string {
  const {
    importFrom = "@/components/ui",
    docsUrl = "https://dowel-eight.vercel.app",
    blocksImportFrom = blocksPathFor(importFrom),
  } = options;

  if (plan.empty) {
    return `// Nothing in the registry matched "${plan.prompt}".\n`;
  }

  const chosen = [...plan.blocks, ...plan.components];

  const imports = chosen
    .map((item) => {
      const from =
        item.entry.type === "registry:block"
          ? `${blocksImportFrom}/${item.entry.name}`
          : `${importFrom}/${item.entry.name}`;
      return `import { ${componentName(item.entry)} } from "${from}";`;
    })
    .sort();

  const body = chosen
    .map((item) => {
      const name = componentName(item.entry);
      return [
        `      {/* ${item.entry.title} — props: ${docsUrl}/docs/${
          item.entry.type === "registry:block" ? "blocks" : "components"
        }/${item.entry.name} */}`,
        `      <${name} />`,
      ].join("\n");
    })
    .join("\n\n");

  return `${imports.join("\n")}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
${body}
    </div>
  );
}
`;
}

/**
 * The plan as a brief for a coding agent.
 *
 * The most useful thing this can produce. The agent has the project, the
 * editor and the ability to write the props; what it lacks is the knowledge
 * that these components exist and that it must not invent others. That is
 * exactly what a grounded plan supplies.
 */
export function renderBrief(plan: UiPlan, options: RenderOptions = {}): string {
  const {
    cliPackage = "@dowel-ui/cli",
    docsUrl = "https://dowel-eight.vercel.app",
    importFrom = "@/components/ui",
  } = options;

  if (plan.empty) {
    return `Nothing in the registry matched "${plan.prompt}". Search the catalogue at ${docsUrl}/docs/components before building anything by hand.`;
  }

  const lines = [
    `Build: ${plan.prompt}`,
    "",
    "Use these, which are already in the registry. Do not write your own versions,",
    "and do not use any component not listed here without checking the catalogue first.",
    "",
  ];

  if (plan.blocks.length > 0) {
    lines.push("Blocks (whole sections — each installs its own components):");
    for (const item of plan.blocks) {
      lines.push(`- ${item.entry.name} — ${item.entry.description}`);
    }
    lines.push("");
  }

  if (plan.components.length > 0) {
    lines.push("Components:");
    for (const item of plan.components) {
      lines.push(`- ${item.entry.name} — ${item.entry.description}`);
    }
    lines.push("");
  }

  lines.push(
    "Install first:",
    "",
    `    npx ${cliPackage} add ${plan.install.join(" ")}`,
    "",
    `Import from \`${importFrom}\`. Each component's props are on its page under`,
    `${docsUrl}/docs/components — read the page rather than guessing a prop name.`,
    "",
    "Style with semantic tokens only (bg-background, text-muted-foreground). Never raw",
    "hex, never Tailwind's own palette — those do not follow the theme.",
  );

  return lines.join("\n");
}
