import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContributionGraph, type ContributionDay } from "./contribution-graph";
import {
  ContributionGraphPanel,
  type ContributionGraphPanelItem,
} from "./contribution-graph-panel";

/** Deterministic sample data: about 30% of days active, like the source demo. */
function sample(year: number, seed = 7): ContributionDay[] {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const days: ContributionDay[] = [];
  for (let time = Date.UTC(year, 0, 1); time <= Date.UTC(year, 11, 31); time += 86_400_000) {
    const count = random() < 0.3 ? Math.floor(random() * 20) : 0;
    if (count > 0) days.push({ date: new Date(time).toISOString().slice(0, 10), count });
  }
  return days;
}

const DATA = sample(2025);

/** The same kind of sample, for the 400 days up to today — for the `months` stories. */
function recent(seed = 11): ContributionDay[] {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let state = seed;
  const days: ContributionDay[] = [];
  for (let time = today - 400 * 86_400_000; time <= today; time += 86_400_000) {
    state = (state * 16807) % 2147483647;
    const active = state / 2147483647 < 0.4;
    state = (state * 16807) % 2147483647;
    const count = active ? 1 + Math.floor((state / 2147483647) * 14) : 0;
    if (count > 0) days.push({ date: new Date(time).toISOString().slice(0, 10), count });
  }
  return days;
}

const RECENT = recent();

/** The panel's sheet covers the graph's own box, so the card styling goes on the graph. */
const CARD = "w-fit max-w-full rounded-xl border border-border bg-card p-3";

const PROJECTS: ContributionGraphPanelItem[] = [
  {
    name: "dowel-ui/react",
    count: 412,
    href: "#react",
    avatar: "https://picsum.photos/seed/dowel/40/40",
  },
  {
    name: "dowel-ui/themes",
    count: 186,
    href: "#themes",
    avatar: "https://picsum.photos/seed/themes/40/40",
  },
  {
    name: "field-notes",
    count: 97,
    href: "#notes",
    avatar: "https://picsum.photos/seed/notes/40/40",
  },
  { name: "tiny-router", count: 54, href: "#router" },
  { name: "dotfiles", count: 21, href: "#dotfiles" },
];

const meta: Meta<typeof ContributionGraph> = {
  title: "Data/Contribution Graph",
  component: ContributionGraph,
  args: {
    data: DATA,
    year: 2025,
    showLegend: true,
    showTooltips: true,
  },
  argTypes: {
    data: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * SmoothUI Contribution Graph, as its demo: a year of random sample data
 * (≈30% of days active, counts 0–19) in a bordered panel, with legend and
 * tooltips. Tab into the grid and use the arrow keys.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-3">
      <div className="max-w-full rounded-lg border border-border bg-background p-2">
        <ContributionGraph data={DATA} year={2025} />
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Contribution Graph — demo
      </figcaption>
    </figure>
  ),
};

/** Explicit levels from the data, and a custom count phrase. */
export const CustomLevels: Story = {
  args: {
    data: DATA.map((day) => ({ ...day, level: day.count > 10 ? 4 : 1 })),
    formatCount: (count: number) => `${String(count)} deploys`,
    label: "Deploys in 2025",
  },
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <ContributionGraph {...args} />
    </div>
  ),
};

/**
 * The last twelve months with a footer panel that ranks the busiest projects.
 * Press the chevron: the panel rises over the grid, the rows follow it in one
 * by one, each with a bar as long as its share of the busiest, and the chevron
 * turns. Press it again — or Escape — to fold it back into the avatar stack.
 *
 * The component never fetches. To show real activity from a code host, fetch
 * on your server and map it in. With GitHub's GraphQL API, for example:
 * `user.contributionsCollection.contributionCalendar.weeks[].contributionDays`
 * gives `{ date, contributionCount }` → `{ date, count }` for `data`, and
 * `contributionsCollection.commitContributionsByRepository` gives each
 * repository's `nameWithOwner`, `url` and `owner.avatarUrl` with
 * `contributions.totalCount` → `{ name, href, avatar, count }` for the panel's
 * `items`. Cache the result; the calendar changes once a day.
 */
export const WithPanel: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <ContributionGraph data={RECENT} months={12} className={CARD}>
      <ContributionGraphPanel items={PROJECTS} label="Top projects this year" />
    </ContributionGraph>
  ),
};

/** The panel starting open, over six months of activity. */
export const PanelOpen: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <ContributionGraph data={RECENT} months={6} className={CARD}>
      <ContributionGraphPanel items={PROJECTS} defaultOpen />
    </ContributionGraph>
  ),
};

/** `months` shows the last N whole months, ending today. */
export const LastSixMonths: Story = {
  render: (args) => <ContributionGraph {...args} data={RECENT} months={6} year={undefined} />,
};

/**
 * `accent` takes any CSS colour — a token like `var(--color-success)` here —
 * for the cells, the legend and the panel's bars.
 */
export const Accent: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      {["var(--color-success)", "var(--color-info)", "var(--color-warning)"].map((accent) => (
        <ContributionGraph
          key={accent}
          data={RECENT}
          months={6}
          accent={accent}
          className={CARD}
        >
          <ContributionGraphPanel items={PROJECTS.slice(0, 3)} />
        </ContributionGraph>
      ))}
    </div>
  ),
};
